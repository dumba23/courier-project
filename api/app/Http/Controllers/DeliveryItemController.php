<?php

namespace App\Http\Controllers;

use App\Models\DeliveryItem;
use App\Models\User;
use App\Services\DistrictStreetResolverService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DeliveryItemController extends Controller
{
    public function store(Request $request, DistrictStreetResolverService $districtStreetResolverService): JsonResponse
    {
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id,tariff_per_kg']);

        if (! $user->isAdmin() && $user->role !== User::ROLE_SELLER) {
            abort(403, 'You are not allowed to create delivery items.');
        }

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.partner_id' => [
                Rule::requiredIf(fn () => $user->isAdmin()),
                'nullable',
                'integer',
                'exists:partners,id',
            ],
            'items.*.product' => ['required', 'string', 'max:255'],
            'items.*.person_name' => ['required', 'string', 'max:255'],
            'items.*.phone' => ['required', 'string', 'max:50'],
            'items.*.address' => ['required', 'string', 'max:1000'],
            'items.*.district' => ['nullable', 'string', 'max:255'],
            'items.*.city' => ['nullable', 'string', 'max:255'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.comment' => ['nullable', 'string'],
            'items.*.delivery_date' => ['required', 'date'],
        ]);

        if (! $user->isAdmin() && ! $user->partner) {
            abort(403, 'Your partner profile is missing.');
        }

        foreach ($validated['items'] as $index => $item) {
            $partner = $user->isAdmin()
                ? \App\Models\Partner::query()->find($item['partner_id'] ?? null)
                : $user->partner;

            if (! $partner?->tariff_per_kg) {
                continue;
            }

            if (! is_numeric($item['product'])) {
                abort(422, "Row ".($index + 1).": product must be a decimal value for tariff per kg partners.");
            }
        }

        $itemsToCreate = collect($validated['items'])
            ->map(function (array $item) use ($user, $districtStreetResolverService): array {
                return [
                    'partner_id' => $user->isAdmin() ? $item['partner_id'] : $user->partner->id,
                    'product' => $item['product'],
                    'person_name' => $item['person_name'],
                    'phone' => $item['phone'],
                    'address' => $districtStreetResolverService->normalizeAddressToGeorgian($item['address']),
                    'district' => $item['district'] ?? null,
                    'city' => filled($item['city'] ?? null) ? trim($item['city']) : 'თბილისი',
                    'price' => $item['price'],
                    'comment' => $item['comment'] ?? null,
                    'delivery_date' => $item['delivery_date'],
                    'delivery_status' => DeliveryItem::STATUS_NEW_ITEM,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })
            ->all();

        DeliveryItem::query()->insert($itemsToCreate);

        return response()->json([
            'message' => 'Delivery items created successfully.',
            'created_count' => count($itemsToCreate),
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id,tariff_per_kg']);
        $validated = $this->validateIndexFilters($request);
        $query = $this->buildFilteredQuery($user, $validated);

        $sortKey = $validated['sort_key'] ?? 'delivery_date';
        $sortDirection = $validated['sort_direction'] ?? 'asc';
        $perPage = $validated['per_page'] ?? 10;

        $query->orderBy($this->resolveSortColumn($sortKey), $sortDirection);

        $paginatedDeliveryItems = $query->paginate($perPage)->withQueryString();

        $paginatedDeliveryItems->setCollection(
            $paginatedDeliveryItems->getCollection()->map(function (DeliveryItem $deliveryItem) use ($user): array {
                $deliveryItem->setAttribute('can_edit_status', $this->canEditStatus($user, $deliveryItem));

                return $this->serializeDeliveryItem($deliveryItem, $user);
            }),
        );

        return response()->json([
            'delivery_items' => $paginatedDeliveryItems->items(),
            'meta' => [
                'current_page' => $paginatedDeliveryItems->currentPage(),
                'last_page' => $paginatedDeliveryItems->lastPage(),
                'per_page' => $paginatedDeliveryItems->perPage(),
                'total' => $paginatedDeliveryItems->total(),
                'from' => $paginatedDeliveryItems->firstItem(),
                'to' => $paginatedDeliveryItems->lastItem(),
            ],
        ]);
    }

    public function assignDistricts(Request $request, DistrictStreetResolverService $districtStreetResolverService): JsonResponse
    {
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id,tariff_per_kg']);
        $validated = $this->validateIndexFilters($request);

        abort_unless($user->isAdmin(), 403, 'You are not allowed to assign districts.');

        $deliveryItems = $this->buildFilteredQuery($user, $validated)
            ->select('delivery_items.id', 'delivery_items.address', 'delivery_items.district')
            ->get();

        if ($deliveryItems->isEmpty()) {
            return response()->json([
                'message' => 'No delivery items matched the current filters.',
                'processed_count' => 0,
                'updated_count' => 0,
                'unresolved_count' => 0,
            ]);
        }

        $updatedCount = 0;
        $unresolvedCount = 0;

        foreach ($deliveryItems as $deliveryItem) {
            if (! filled($deliveryItem->address)) {
                $unresolvedCount++;

                continue;
            }

            $districtNames = $districtStreetResolverService->resolveDistrictNamesFromAddress($deliveryItem->address);

            if ($districtNames === []) {
                $unresolvedCount++;

                continue;
            }

            $resolvedDistrictValue = implode(', ', $districtNames);

            if ($deliveryItem->district === $resolvedDistrictValue) {
                continue;
            }

            DeliveryItem::query()
                ->whereKey($deliveryItem->id)
                ->update([
                    'district' => $resolvedDistrictValue,
                ]);

            $updatedCount++;
        }

        return response()->json([
            'message' => 'Districts processed successfully.',
            'processed_count' => $deliveryItems->count(),
            'updated_count' => $updatedCount,
            'unresolved_count' => $unresolvedCount,
        ]);
    }

    public function bulkUpdate(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id,tariff_per_kg']);
        $validated = $this->validateIndexFilters($request, true);

        if (! $user->isAdmin()) {
            abort(403, 'You are not allowed to perform bulk delivery updates.');
        }

        $ids = $this->buildFilteredQuery($user, $validated)
            ->select('delivery_items.id')
            ->pluck('delivery_items.id');

        if ($ids->isEmpty()) {
            return response()->json([
                'message' => 'No delivery items matched the current filters.',
                'updated_count' => 0,
            ]);
        }

        $updatePayload = $validated['bulk_action'] === 'status'
            ? $this->statusBulkPayload($validated['delivery_status'])
            : ($validated['bulk_action'] === 'assigned_courier_id'
                ? [
                    'assigned_courier_id' => $validated['assigned_courier_id'] ?? null,
                ]
                : [
                $validated['bulk_action'] => $validated['bulk_date'],
                ]);

        DeliveryItem::query()
            ->whereIn('id', $ids->all())
            ->update($updatePayload);

        return response()->json([
            'message' => 'Delivery items updated successfully.',
            'updated_count' => $ids->count(),
        ]);
    }

    public function updateStatus(Request $request, DeliveryItem $deliveryItem): JsonResponse
    {
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id,tariff_per_kg']);

        abort_unless($this->canEditStatus($user, $deliveryItem), 403, 'You are not allowed to update this delivery status.');

        $validated = $request->validate([
            'delivery_status' => ['required', 'string', Rule::in(array_keys(DeliveryItem::statusLabels()))],
            'transferred_to_shop_amount' => ['nullable', 'numeric', 'min:0'],
            'collected_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $deliveryItem->update($this->statusBulkPayload(
            $validated['delivery_status'],
            $validated['transferred_to_shop_amount'] ?? null,
            $validated['collected_amount'] ?? null,
        ));

        $deliveryItem->load([
            'courier:id,first_name,last_name',
            'partner:id,name',
        ]);
        $deliveryItem->setAttribute('can_edit_status', $this->canEditStatus($user, $deliveryItem));

        return response()->json([
            'message' => 'Delivery status updated successfully.',
            'delivery_item' => $deliveryItem,
        ]);
    }

    public function updateCourier(Request $request, DeliveryItem $deliveryItem): JsonResponse
    {
        $user = $request->user();

        abort_unless($user->isAdmin(), 403, 'You are not allowed to update the courier assignment.');

        $validated = $request->validate([
            'assigned_courier_id' => ['nullable', 'integer', 'exists:couriers,id'],
        ]);

        $deliveryItem->update([
            'assigned_courier_id' => $validated['assigned_courier_id'] ?? null,
        ]);

        $deliveryItem->load([
            'courier:id,first_name,last_name',
            'partner:id,name',
        ]);
        $deliveryItem->setAttribute('can_edit_status', $this->canEditStatus($user, $deliveryItem));

        return response()->json([
            'message' => 'Courier assignment updated successfully.',
            'delivery_item' => $deliveryItem,
        ]);
    }

    public function updateCourierComment(Request $request, DeliveryItem $deliveryItem): JsonResponse
    {
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id,tariff_per_kg']);

        abort_unless(
            $this->canEditCourierComment($user, $deliveryItem),
            403,
            'You are not allowed to update this courier comment.',
        );

        $validated = $request->validate([
            'courier_comment' => ['nullable', 'string'],
        ]);

        $deliveryItem->update([
            'courier_comment' => $validated['courier_comment'] ?? null,
        ]);

        $deliveryItem->load([
            'courier:id,first_name,last_name',
            'partner:id,name',
        ]);
        $deliveryItem->setAttribute('can_edit_status', $this->canEditStatus($user, $deliveryItem));
        $deliveryItem->setAttribute('can_edit_courier_comment', $this->canEditCourierComment($user, $deliveryItem));

        return response()->json([
            'message' => 'Courier comment updated successfully.',
            'delivery_item' => $deliveryItem,
        ]);
    }

    public function updateProduct(Request $request, DeliveryItem $deliveryItem): JsonResponse
    {
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id,tariff_per_kg']);

        abort_unless(
            $this->canEditProduct($user, $deliveryItem),
            403,
            'You are not allowed to update this product.',
        );

        $deliveryItem->loadMissing('partner:id,tariff_per_kg');

        $validated = $request->validate([
            'product' => ['required', 'string', 'max:255'],
        ]);

        if ($deliveryItem->partner?->tariff_per_kg && ! is_numeric($validated['product'])) {
            abort(422, 'Product must be a decimal value for tariff per kg partners.');
        }

        $deliveryItem->update([
            'product' => trim($validated['product']),
        ]);

        $deliveryItem->load([
            'courier:id,first_name,last_name',
            'partner:id,name,tariff_per_kg',
        ]);
        $deliveryItem->setAttribute('can_edit_status', $this->canEditStatus($user, $deliveryItem));
        $deliveryItem->setAttribute('can_edit_courier_comment', $this->canEditCourierComment($user, $deliveryItem));

        return response()->json([
            'message' => 'Product updated successfully.',
            'delivery_item' => $this->serializeDeliveryItem($deliveryItem, $user),
        ]);
    }

    public function updatePrice(Request $request, DeliveryItem $deliveryItem): JsonResponse
    {
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id']);

        abort_unless(
            $this->canEditPrice($user, $deliveryItem),
            403,
            'You are not allowed to update this price.',
        );

        $validated = $request->validate([
            'price' => ['required', 'numeric', 'min:0'],
        ]);

        $deliveryItem->update([
            'price' => $validated['price'],
        ]);

        $deliveryItem->load([
            'courier:id,first_name,last_name',
            'partner:id,name,tariff_per_kg',
        ]);
        $deliveryItem->setAttribute('can_edit_status', $this->canEditStatus($user, $deliveryItem));
        $deliveryItem->setAttribute('can_edit_courier_comment', $this->canEditCourierComment($user, $deliveryItem));

        return response()->json([
            'message' => 'Price updated successfully.',
            'delivery_item' => $this->serializeDeliveryItem($deliveryItem, $user),
        ]);
    }

    public function updateLocation(Request $request, DeliveryItem $deliveryItem): JsonResponse
    {
        $user = $request->user()->loadMissing(['partner:id,user_id']);

        $validated = $request->validate([
            'district' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
        ]);

        abort_unless(
            $this->canEditDistrict($user, $deliveryItem) || $this->canEditCity($user, $deliveryItem),
            403,
            'You are not allowed to update location fields.',
        );

        $deliveryItem->update([
            'district' => $this->canEditDistrict($user, $deliveryItem)
                ? (filled($validated['district'] ?? null) ? trim($validated['district']) : null)
                : $deliveryItem->district,
            'city' => $this->canEditCity($user, $deliveryItem)
                ? (filled($validated['city'] ?? null) ? trim($validated['city']) : 'თბილისი')
                : $deliveryItem->city,
        ]);

        $deliveryItem->load([
            'courier:id,first_name,last_name',
            'partner:id,name,tariff_per_kg',
        ]);
        $deliveryItem->setAttribute('can_edit_status', $this->canEditStatus($user, $deliveryItem));
        $deliveryItem->setAttribute('can_edit_courier_comment', $this->canEditCourierComment($user, $deliveryItem));

        return response()->json([
            'message' => 'Location updated successfully.',
            'delivery_item' => $this->serializeDeliveryItem($deliveryItem, $user),
        ]);
    }

    public function updateAdditionalStatus(Request $request, DeliveryItem $deliveryItem): JsonResponse
    {
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id']);

        abort_unless($user->isAdmin(), 403, 'You are not allowed to update this additional status.');
        abort_unless($deliveryItem->delivery_status === DeliveryItem::STATUS_CANCELED, 422, 'Additional status is only available for canceled delivery items.');

        $validated = $request->validate([
            'additional_status' => ['nullable', 'string', Rule::in(['receivable', 'received'])],
        ]);

        $deliveryItem->update([
            'additional_status' => $validated['additional_status'] ?? null,
            'return_date' => ($validated['additional_status'] ?? null) === 'received' ? now() : null,
        ]);

        $deliveryItem->load([
            'courier:id,first_name,last_name',
            'partner:id,name',
        ]);
        $deliveryItem->setAttribute('can_edit_status', $this->canEditStatus($user, $deliveryItem));
        $deliveryItem->setAttribute('can_edit_courier_comment', $this->canEditCourierComment($user, $deliveryItem));

        return response()->json([
            'message' => 'Additional status updated successfully.',
            'delivery_item' => $deliveryItem,
        ]);
    }

    public function updateWarehouseState(Request $request, DeliveryItem $deliveryItem): JsonResponse
    {
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id']);

        abort_unless($user->isAdmin(), 403, 'You are not allowed to update this warehouse state.');

        $validated = $request->validate([
            'warehouse_state' => ['nullable', 'string', Rule::in(['received_in_warehouse', 'handed_to_courier'])],
        ]);

        $deliveryItem->update([
            'warehouse_state' => $validated['warehouse_state'] ?? null,
        ]);

        $deliveryItem->load([
            'courier:id,first_name,last_name',
            'partner:id,name',
        ]);
        $deliveryItem->setAttribute('can_edit_status', $this->canEditStatus($user, $deliveryItem));
        $deliveryItem->setAttribute('can_edit_courier_comment', $this->canEditCourierComment($user, $deliveryItem));

        return response()->json([
            'message' => 'Warehouse state updated successfully.',
            'delivery_item' => $deliveryItem,
        ]);
    }

    private function applyStringFilter($query, string|\Illuminate\Contracts\Database\Query\Expression $column, ?string $value): void
    {
        if (! filled($value)) {
            return;
        }

        $query->where($column, 'like', '%'.$value.'%');
    }

    private function applyStatusFilter($query, ?array $values): void
    {
        if ($values === null || $values === []) {
            return;
        }

        $matchingStatuses = collect($values)
            ->filter(fn (?string $status): bool => filled($status))
            ->unique()
            ->values()
            ->all();

        if ($matchingStatuses === []) {
            return;
        }

        $query->whereIn('delivery_items.delivery_status', $matchingStatuses);
    }

    private function applyIntegerFilter($query, string $column, ?array $values): void
    {
        if ($values === null || $values === []) {
            return;
        }

        $matchingValues = collect($values)
            ->filter(fn (int|string|null $value): bool => filled($value))
            ->map(fn (int|string $value): int => (int) $value)
            ->unique()
            ->values()
            ->all();

        if ($matchingValues === []) {
            return;
        }

        $query->whereIn($column, $matchingValues);
    }

    private function applyStringArrayFilter($query, string $column, ?array $values): void
    {
        if ($values === null || $values === []) {
            return;
        }

        $matchingValues = collect($values)
            ->filter(fn (string|null $value): bool => filled($value))
            ->map(fn (string $value): string => trim($value))
            ->unique()
            ->values()
            ->all();

        if ($matchingValues === []) {
            return;
        }

        $query->whereIn($column, $matchingValues);
    }

    private function applyDateFilter($query, string $column, ?string $value): void
    {
        if (! filled($value)) {
            return;
        }

        try {
            $trimmedValue = trim($value);
            $date = str_contains($trimmedValue, '.')
                ? Carbon::createFromFormat('d.m.Y', $trimmedValue)->format('Y-m-d')
                : Carbon::parse($trimmedValue)->format('Y-m-d');
        } catch (\Throwable) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->whereDate($column, $date);
    }

    private function resolveSortColumn(string $sortKey): string|\Illuminate\Contracts\Database\Query\Expression
    {
        return match ($sortKey) {
            'product' => 'delivery_items.product',
            'person_name' => 'delivery_items.person_name',
            'phone' => 'delivery_items.phone',
            'partner' => 'partners.name',
            'courier' => DB::raw("TRIM(CONCAT(COALESCE(couriers.first_name, ''), ' ', COALESCE(couriers.last_name, '')))"),
            'district' => 'delivery_items.district',
            'city' => 'delivery_items.city',
            'address' => 'delivery_items.address',
            'price' => 'delivery_items.price',
            'comment' => 'delivery_items.comment',
            'courier_comment' => 'delivery_items.courier_comment',
            'status' => 'delivery_items.delivery_status',
            'additional_status' => 'delivery_items.additional_status',
            'warehouse_state' => 'delivery_items.warehouse_state',
            'actual_delivery_date' => 'delivery_items.actual_delivery_date',
            'return_date' => 'delivery_items.return_date',
            default => 'delivery_items.delivery_date',
        };
    }

    private function validateIndexFilters(Request $request, bool $includeBulkFields = false): array
    {
        return $request->validate([
            'product' => ['nullable', 'string'],
            'person_name' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'partner' => ['nullable', 'string'],
            'courier' => ['nullable', 'string'],
            'partner_ids' => ['nullable', 'array'],
            'partner_ids.*' => ['integer', 'exists:partners,id'],
            'courier_ids' => ['nullable', 'array'],
            'courier_ids.*' => ['integer', 'exists:couriers,id'],
            'view_scope' => ['nullable', Rule::in(['active', 'canceled', 'all'])],
            'multiple_districts' => ['nullable', 'boolean'],
            'district' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'price' => ['nullable', 'string'],
            'comment' => ['nullable', 'string'],
            'courier_comment' => ['nullable', 'string'],
            'additional_status' => ['nullable', 'string', Rule::in(['receivable', 'received'])],
            'warehouse_state' => ['nullable', 'array'],
            'warehouse_state.*' => ['string', Rule::in(['received_in_warehouse', 'handed_to_courier'])],
            'status' => ['nullable', 'array'],
            'status.*' => ['string', Rule::in(array_keys(DeliveryItem::statusLabels()))],
            'delivery_date' => ['nullable', 'string'],
            'actual_delivery_date' => ['nullable', 'string'],
            'return_date' => ['nullable', 'string'],
            'sort_key' => [
                'nullable',
                Rule::in([
                    'product',
                    'person_name',
                    'phone',
                    'partner',
                    'courier',
                    'district',
                    'city',
                    'address',
                    'price',
                    'comment',
                    'courier_comment',
                    'status',
                    'additional_status',
                    'warehouse_state',
                    'delivery_date',
                    'actual_delivery_date',
                    'return_date',
                ]),
            ],
            'sort_direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:200'],
            ...($includeBulkFields ? [
                'bulk_action' => ['required', 'string', Rule::in(['status', 'delivery_date', 'actual_delivery_date', 'return_date', 'assigned_courier_id'])],
                'delivery_status' => ['required_if:bulk_action,status', 'nullable', 'string', Rule::in(array_keys(DeliveryItem::statusLabels()))],
                'assigned_courier_id' => ['nullable', 'integer', 'exists:couriers,id'],
                'bulk_date' => ['required_if:bulk_action,delivery_date,actual_delivery_date,return_date', 'nullable', 'date'],
            ] : []),
        ]);
    }

    private function buildFilteredQuery(User $user, array $validated): Builder
    {
        $query = DeliveryItem::query()
            ->select('delivery_items.*')
            ->leftJoin('partners', 'partners.id', '=', 'delivery_items.partner_id')
            ->leftJoin('couriers', 'couriers.id', '=', 'delivery_items.assigned_courier_id');

        if ($user->role !== User::ROLE_SELLER) {
            $query->with([
                'courier:id,first_name,last_name',
                'partner:id,name,tariff_per_kg',
            ]);
        }

        $this->scopeVisibleDeliveryItems($query, $user);
        $this->applyStringFilter($query, 'delivery_items.product', $validated['product'] ?? null);
        $this->applyStringFilter($query, 'delivery_items.person_name', $validated['person_name'] ?? null);
        $this->applyStringFilter($query, 'delivery_items.phone', $validated['phone'] ?? null);
        $this->applyStringFilter($query, 'partners.name', $validated['partner'] ?? null);
        $this->applyIntegerFilter($query, 'delivery_items.partner_id', $validated['partner_ids'] ?? null);
        $this->applyStringFilter(
            $query,
            DB::raw("TRIM(CONCAT(COALESCE(couriers.first_name, ''), ' ', COALESCE(couriers.last_name, '')))"),
            $validated['courier'] ?? null,
        );
        $this->applyIntegerFilter($query, 'delivery_items.assigned_courier_id', $validated['courier_ids'] ?? null);
        $this->applyViewScope($query, $validated['view_scope'] ?? 'active');
        if (($validated['multiple_districts'] ?? false)) {
            $query->where('delivery_items.district', 'like', '%,%');
        }
        $this->applyStringFilter($query, 'delivery_items.district', $validated['district'] ?? null);
        $this->applyStringFilter($query, 'delivery_items.city', $validated['city'] ?? null);
        $this->applyStringFilter($query, 'delivery_items.address', $validated['address'] ?? null);
        $this->applyStringFilter($query, DB::raw('CAST(delivery_items.price AS CHAR)'), $validated['price'] ?? null);
        $this->applyStringFilter($query, 'delivery_items.comment', $validated['comment'] ?? null);
        $this->applyStringFilter($query, 'delivery_items.courier_comment', $validated['courier_comment'] ?? null);
        $this->applyStringFilter($query, 'delivery_items.additional_status', $validated['additional_status'] ?? null);
        $this->applyStringArrayFilter($query, 'delivery_items.warehouse_state', $validated['warehouse_state'] ?? null);
        $this->applyStatusFilter($query, $validated['status'] ?? null);
        $this->applyDateFilter($query, 'delivery_items.delivery_date', $validated['delivery_date'] ?? null);
        $this->applyDateFilter($query, 'delivery_items.actual_delivery_date', $validated['actual_delivery_date'] ?? null);
        $this->applyDateFilter($query, 'delivery_items.return_date', $validated['return_date'] ?? null);

        return $query;
    }

    private function statusBulkPayload(
        string $status,
        ?float $transferredToShopAmount = null,
        ?float $collectedAmount = null,
    ): array
    {
        return [
            'delivery_status' => $status,
            ...(
                $status === DeliveryItem::STATUS_DELIVERED
                    ? [
                        'actual_delivery_date' => now(),
                        'transferred_to_shop_amount' => $transferredToShopAmount ?? 0,
                        'collected_amount' => $collectedAmount,
                    ]
                    : [
                        'actual_delivery_date' => null,
                        'transferred_to_shop_amount' => null,
                        'collected_amount' => null,
                    ]
            ),
        ];
    }

    private function applyViewScope(Builder $query, string $viewScope): void
    {
        if ($viewScope === 'canceled') {
            $query->where('delivery_items.delivery_status', DeliveryItem::STATUS_CANCELED);

            return;
        }

        if ($viewScope === 'active') {
            $query->where('delivery_items.delivery_status', '!=', DeliveryItem::STATUS_CANCELED);
        }
    }

    private function scopeVisibleDeliveryItems(Builder $query, User $user): void
    {
        if ($user->isAdmin()) {
            return;
        }

        if ($user->role === User::ROLE_COURIER) {
            if (! $user->courier) {
                $query->whereRaw('1 = 0');

                return;
            }

            $query->where('delivery_items.assigned_courier_id', $user->courier->id);

            return;
        }

        if ($user->role === User::ROLE_SELLER) {
            if (! $user->partner) {
                $query->whereRaw('1 = 0');

                return;
            }

            $query->where('delivery_items.partner_id', $user->partner->id);

            return;
        }

        $query->whereRaw('1 = 0');
    }

    private function canEditStatus(User $user, DeliveryItem $deliveryItem): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->role === User::ROLE_COURIER
            && $user->courier?->id === $deliveryItem->assigned_courier_id;
    }

    private function canEditCourierComment(User $user, DeliveryItem $deliveryItem): bool
    {
        return $user->role === User::ROLE_COURIER
            && $user->courier?->id === $deliveryItem->assigned_courier_id;
    }

    private function canEditProduct(User $user, DeliveryItem $deliveryItem): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->role === User::ROLE_SELLER
            && $user->partner?->id === $deliveryItem->partner_id;
    }

    private function canEditPrice(User $user, DeliveryItem $deliveryItem): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->role === User::ROLE_SELLER
            && $user->partner?->id === $deliveryItem->partner_id;
    }

    private function canEditDistrict(User $user, DeliveryItem $deliveryItem): bool
    {
        return $user->isAdmin();
    }

    private function canEditCity(User $user, DeliveryItem $deliveryItem): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->role === User::ROLE_SELLER
            && $user->partner?->id === $deliveryItem->partner_id;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeDeliveryItem(DeliveryItem $deliveryItem, User $user): array
    {
        if ($user->role === User::ROLE_SELLER) {
            return [
                'id' => $deliveryItem->id,
                'product' => $deliveryItem->product,
                'person_name' => $deliveryItem->person_name,
                'address' => $deliveryItem->address,
                'city' => $deliveryItem->city,
                'price' => $deliveryItem->price,
                'comment' => $deliveryItem->comment,
                'courier_comment' => $deliveryItem->courier_comment,
                'delivery_status' => $deliveryItem->delivery_status,
                'additional_status' => $deliveryItem->additional_status,
                'warehouse_state' => $deliveryItem->warehouse_state,
                'delivery_date' => $deliveryItem->delivery_date,
                'actual_delivery_date' => $deliveryItem->actual_delivery_date,
                'return_date' => $deliveryItem->return_date,
                'transferred_to_shop_amount' => $deliveryItem->transferred_to_shop_amount,
                'collected_amount' => $deliveryItem->collected_amount,
                'can_edit_product' => $this->canEditProduct($user, $deliveryItem),
                'can_edit_price' => $this->canEditPrice($user, $deliveryItem),
                'can_edit_district' => $this->canEditDistrict($user, $deliveryItem),
                'can_edit_city' => $this->canEditCity($user, $deliveryItem),
                'is_tariff_per_kg_product' => (bool) $user->partner?->tariff_per_kg,
            ];
        }

        return [
            'id' => $deliveryItem->id,
            'assigned_courier_id' => $deliveryItem->assigned_courier_id,
            'partner_id' => $deliveryItem->partner_id,
            'address' => $deliveryItem->address,
            'district' => $deliveryItem->district,
            'city' => $deliveryItem->city,
            'phone' => $deliveryItem->phone,
            'price' => $deliveryItem->price,
            'comment' => $deliveryItem->comment,
            'courier_comment' => $deliveryItem->courier_comment,
            'product' => $deliveryItem->product,
            'person_name' => $deliveryItem->person_name,
            'delivery_status' => $deliveryItem->delivery_status,
            'additional_status' => $deliveryItem->additional_status,
            'warehouse_state' => $deliveryItem->warehouse_state,
            'delivery_date' => $deliveryItem->delivery_date,
            'actual_delivery_date' => $deliveryItem->actual_delivery_date,
            'return_date' => $deliveryItem->return_date,
            'transferred_to_shop_amount' => $deliveryItem->transferred_to_shop_amount,
            'collected_amount' => $deliveryItem->collected_amount,
            'can_edit_status' => (bool) $deliveryItem->getAttribute('can_edit_status'),
            'can_edit_courier_comment' => $this->canEditCourierComment($user, $deliveryItem),
            'can_edit_product' => $this->canEditProduct($user, $deliveryItem),
            'can_edit_price' => $this->canEditPrice($user, $deliveryItem),
            'can_edit_district' => $this->canEditDistrict($user, $deliveryItem),
            'can_edit_city' => $this->canEditCity($user, $deliveryItem),
            'is_tariff_per_kg_product' => (bool) $deliveryItem->partner?->tariff_per_kg,
            'courier' => $deliveryItem->courier,
            'partner' => $deliveryItem->partner,
        ];
    }
}
