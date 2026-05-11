<?php

namespace App\Http\Controllers;

use App\Models\DeliveryItem;
use App\Models\Partner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PartnerPayrollController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'You are not allowed to view partner payroll.');

        $validated = $request->validate([
            'partner_id' => ['required', 'integer', 'exists:partners,id'],
            'day' => ['required', 'date'],
        ]);

        $partner = Partner::query()->findOrFail($validated['partner_id']);

        $items = DeliveryItem::query()
            ->where('partner_id', $partner->id)
            ->where('delivery_status', DeliveryItem::STATUS_DELIVERED)
            ->whereDate('actual_delivery_date', $validated['day'])
            ->orderBy('actual_delivery_date')
            ->get()
            ->map(function (DeliveryItem $item) use ($partner): array {
                return [
                    'id' => $item->id,
                    'product' => $item->product,
                    'district' => $item->district,
                    'city' => $item->city,
                    'address' => $item->address,
                    'courier_comment' => $item->courier_comment,
                    'price' => $item->price,
                    'transferred_to_shop_amount' => $item->transferred_to_shop_amount,
                    'collected_amount' => $item->collected_amount,
                    'base_tariff_amount' => $this->resolvePartnerTariffAmount($partner, $item),
                    'partner_extra_price_per_item' => $item->partner_extra_price_per_item,
                    'partner_paid_at' => $item->partner_paid_at,
                ];
            })
            ->all();

        return response()->json([
            'partner' => [
                'id' => $partner->id,
                'name' => $partner->name,
                'tariff' => $partner->tariff,
                'tariff_per_kg' => $partner->tariff_per_kg,
                'tariff_per_kg_ranges' => $partner->tariff_per_kg_ranges,
            ],
            'items' => $items,
            'summary' => [
                'count' => count($items),
                'price_total' => round(collect($items)->sum(fn (array $item) => (float) $item['price']), 2),
                'base_total' => round(collect($items)->sum(fn (array $item) => (float) $item['base_tariff_amount']), 2),
                'extra_total' => round(collect($items)->sum(fn (array $item) => (float) $item['partner_extra_price_per_item']), 2),
            ],
        ]);
    }

    public function updateExtraPrice(Request $request, DeliveryItem $deliveryItem): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'You are not allowed to update partner payroll.');

        $validated = $request->validate([
            'partner_extra_price_per_item' => ['required', 'numeric', 'min:0'],
        ]);

        $deliveryItem->loadMissing('partner');

        $deliveryItem->update([
            'partner_extra_price_per_item' => $validated['partner_extra_price_per_item'],
        ]);

        return response()->json([
            'message' => 'Partner extra price updated successfully.',
            'item' => [
                'id' => $deliveryItem->id,
                'product' => $deliveryItem->product,
                'district' => $deliveryItem->district,
                'city' => $deliveryItem->city,
                'address' => $deliveryItem->address,
                'courier_comment' => $deliveryItem->courier_comment,
                'price' => $deliveryItem->price,
                'transferred_to_shop_amount' => $deliveryItem->transferred_to_shop_amount,
                'collected_amount' => $deliveryItem->collected_amount,
                'base_tariff_amount' => $this->resolvePartnerTariffAmount($deliveryItem->partner, $deliveryItem),
                'partner_extra_price_per_item' => $deliveryItem->partner_extra_price_per_item,
                'partner_paid_at' => $deliveryItem->partner_paid_at,
            ],
        ]);
    }

    public function markPaid(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'You are not allowed to update partner payroll.');

        $validated = $request->validate([
            'partner_id' => ['required', 'integer', 'exists:partners,id'],
            'day' => ['required', 'date'],
        ]);

        $paidAt = Carbon::now();

        $updatedCount = DeliveryItem::query()
            ->where('partner_id', $validated['partner_id'])
            ->where('delivery_status', DeliveryItem::STATUS_DELIVERED)
            ->whereDate('actual_delivery_date', $validated['day'])
            ->whereNull('partner_paid_at')
            ->update([
                'partner_paid_at' => $paidAt,
            ]);

        return response()->json([
            'message' => 'Partner payroll marked as paid.',
            'updated_count' => $updatedCount,
            'partner_paid_at' => $paidAt->toISOString(),
        ]);
    }

    private function resolvePartnerTariffAmount(Partner $partner, DeliveryItem $deliveryItem): float
    {
        if (! $partner->tariff_per_kg) {
            return (float) $partner->tariff;
        }

        $weight = is_numeric($deliveryItem->product) ? (float) $deliveryItem->product : null;
        $ranges = collect($partner->tariff_per_kg_ranges ?? [])
            ->filter(fn ($range): bool => is_array($range) && isset($range['up_to_kg'], $range['price']))
            ->sortBy('up_to_kg')
            ->values();

        if ($weight === null || $ranges->isEmpty()) {
            return 0.0;
        }

        $matchedRange = $ranges->first(fn (array $range): bool => $weight <= (float) $range['up_to_kg']);

        if ($matchedRange) {
            return (float) $matchedRange['price'];
        }

        return (float) ($ranges->last()['price'] ?? 0);
    }
}
