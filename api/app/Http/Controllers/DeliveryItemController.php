<?php

namespace App\Http\Controllers;

use App\Models\DeliveryItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DeliveryItemController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id']);

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
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.comment' => ['nullable', 'string'],
            'items.*.delivery_date' => ['required', 'date'],
        ]);

        if (! $user->isAdmin() && ! $user->partner) {
            abort(403, 'Your partner profile is missing.');
        }

        $itemsToCreate = collect($validated['items'])
            ->map(function (array $item) use ($user): array {
                return [
                    'partner_id' => $user->isAdmin() ? $item['partner_id'] : $user->partner->id,
                    'product' => $item['product'],
                    'person_name' => $item['person_name'],
                    'phone' => $item['phone'],
                    'address' => $item['address'],
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
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id']);
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

    public function bulkUpdate(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id']);
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
        $user = $request->user()->loadMissing(['courier:id,user_id', 'partner:id,user_id']);

        abort_unless($this->canEditStatus($user, $deliveryItem), 403, 'You are not allowed to update this delivery status.');

        $validated = $request->validate([
            'delivery_status' => ['required', 'string', Rule::in(array_keys(DeliveryItem::statusLabels()))],
        ]);

        $deliveryItem->update($this->statusBulkPayload($validated['delivery_status']));

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
            'partner' => 'partners.name',
            'courier' => DB::raw("TRIM(CONCAT(COALESCE(couriers.first_name, ''), ' ', COALESCE(couriers.last_name, '')))"),
            'district' => 'delivery_items.district',
            'address' => 'delivery_items.address',
            'price' => 'delivery_items.price',
            'status' => 'delivery_items.delivery_status',
            'actual_delivery_date' => 'delivery_items.actual_delivery_date',
            default => 'delivery_items.delivery_date',
        };
    }

    private function validateIndexFilters(Request $request, bool $includeBulkFields = false): array
    {
        return $request->validate([
            'product' => ['nullable', 'string'],
            'person_name' => ['nullable', 'string'],
            'partner' => ['nullable', 'string'],
            'courier' => ['nullable', 'string'],
            'partner_ids' => ['nullable', 'array'],
            'partner_ids.*' => ['integer', 'exists:partners,id'],
            'courier_ids' => ['nullable', 'array'],
            'courier_ids.*' => ['integer', 'exists:couriers,id'],
            'district' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'price' => ['nullable', 'string'],
            'status' => ['nullable', 'array'],
            'status.*' => ['string', Rule::in(array_keys(DeliveryItem::statusLabels()))],
            'delivery_date' => ['nullable', 'string'],
            'actual_delivery_date' => ['nullable', 'string'],
            'sort_key' => [
                'nullable',
                Rule::in([
                    'product',
                    'person_name',
                    'partner',
                    'courier',
                    'district',
                    'address',
                    'price',
                    'status',
                    'delivery_date',
                    'actual_delivery_date',
                ]),
            ],
            'sort_direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:200'],
            ...($includeBulkFields ? [
                'bulk_action' => ['required', 'string', Rule::in(['status', 'delivery_date', 'actual_delivery_date', 'assigned_courier_id'])],
                'delivery_status' => ['required_if:bulk_action,status', 'nullable', 'string', Rule::in(array_keys(DeliveryItem::statusLabels()))],
                'assigned_courier_id' => ['nullable', 'integer', 'exists:couriers,id'],
                'bulk_date' => ['required_if:bulk_action,delivery_date,actual_delivery_date', 'nullable', 'date'],
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
                'partner:id,name',
            ]);
        }

        $this->scopeVisibleDeliveryItems($query, $user);
        $this->applyStringFilter($query, 'delivery_items.product', $validated['product'] ?? null);
        $this->applyStringFilter($query, 'delivery_items.person_name', $validated['person_name'] ?? null);
        $this->applyStringFilter($query, 'partners.name', $validated['partner'] ?? null);
        $this->applyIntegerFilter($query, 'delivery_items.partner_id', $validated['partner_ids'] ?? null);
        $this->applyStringFilter(
            $query,
            DB::raw("TRIM(CONCAT(COALESCE(couriers.first_name, ''), ' ', COALESCE(couriers.last_name, '')))"),
            $validated['courier'] ?? null,
        );
        $this->applyIntegerFilter($query, 'delivery_items.assigned_courier_id', $validated['courier_ids'] ?? null);
        $this->applyStringFilter($query, 'delivery_items.district', $validated['district'] ?? null);
        $this->applyStringFilter($query, 'delivery_items.address', $validated['address'] ?? null);
        $this->applyStringFilter($query, DB::raw('CAST(delivery_items.price AS CHAR)'), $validated['price'] ?? null);
        $this->applyStatusFilter($query, $validated['status'] ?? null);
        $this->applyDateFilter($query, 'delivery_items.delivery_date', $validated['delivery_date'] ?? null);
        $this->applyDateFilter($query, 'delivery_items.actual_delivery_date', $validated['actual_delivery_date'] ?? null);

        return $query;
    }

    private function statusBulkPayload(string $status): array
    {
        return [
            'delivery_status' => $status,
            ...(
                $status === DeliveryItem::STATUS_DELIVERED
                    ? ['actual_delivery_date' => now()]
                    : ['actual_delivery_date' => null]
            ),
        ];
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
                'price' => $deliveryItem->price,
                'delivery_status' => $deliveryItem->delivery_status,
                'delivery_date' => $deliveryItem->delivery_date,
                'actual_delivery_date' => $deliveryItem->actual_delivery_date,
            ];
        }

        return [
            'id' => $deliveryItem->id,
            'assigned_courier_id' => $deliveryItem->assigned_courier_id,
            'partner_id' => $deliveryItem->partner_id,
            'address' => $deliveryItem->address,
            'district' => $deliveryItem->district,
            'phone' => $deliveryItem->phone,
            'price' => $deliveryItem->price,
            'comment' => $deliveryItem->comment,
            'product' => $deliveryItem->product,
            'person_name' => $deliveryItem->person_name,
            'delivery_status' => $deliveryItem->delivery_status,
            'delivery_date' => $deliveryItem->delivery_date,
            'actual_delivery_date' => $deliveryItem->actual_delivery_date,
            'can_edit_status' => (bool) $deliveryItem->getAttribute('can_edit_status'),
            'courier' => $deliveryItem->courier,
            'partner' => $deliveryItem->partner,
        ];
    }
}
