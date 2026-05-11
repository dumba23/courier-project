<?php

namespace App\Http\Controllers;

use App\Models\Courier;
use App\Models\DeliveryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class CourierPayrollController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'You are not allowed to view courier payroll.');

        $validated = $request->validate([
            'courier_id' => ['required', 'integer', 'exists:couriers,id'],
            'day' => ['required', 'date'],
        ]);

        $courier = Courier::query()->findOrFail($validated['courier_id']);

        $items = DeliveryItem::query()
            ->with(['partner:id,name'])
            ->where('assigned_courier_id', $courier->id)
            ->where('delivery_status', DeliveryItem::STATUS_DELIVERED)
            ->whereDate('actual_delivery_date', $validated['day'])
            ->orderBy('actual_delivery_date')
            ->get()
            ->map(fn (DeliveryItem $item): array => [
                'id' => $item->id,
                'product' => $item->product,
                'partner' => $item->partner,
                'district' => $item->district,
                'city' => $item->city,
                'address' => $item->address,
                'courier_comment' => $item->courier_comment,
                'price' => $item->price,
                'transferred_to_shop_amount' => $item->transferred_to_shop_amount,
                'collected_amount' => $item->collected_amount,
                'extra_price_per_item' => $item->extra_price_per_item,
                'deduction_price_per_item' => $item->deduction_price_per_item,
                'paid_at' => $item->paid_at,
            ])
            ->all();

        return response()->json([
            'courier' => [
                'id' => $courier->id,
                'first_name' => $courier->first_name,
                'last_name' => $courier->last_name,
                'tariff' => $courier->tariff,
            ],
            'items' => $items,
            'summary' => [
                'count' => count($items),
                'price_total' => round(collect($items)->sum(
                    fn (array $item) => (float) ($item['collected_amount'] ?? $item['price']) - (float) ($item['transferred_to_shop_amount'] ?? 0),
                ), 2),
                'base_total' => round(count($items) * (float) $courier->tariff, 2),
                'extra_total' => round(collect($items)->sum(fn (array $item) => (float) $item['extra_price_per_item']), 2),
                'deduction_total' => round(collect($items)->sum(fn (array $item) => (float) $item['deduction_price_per_item']), 2),
            ],
        ]);
    }

    public function updateExtraPrice(Request $request, DeliveryItem $deliveryItem): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'You are not allowed to update courier payroll.');

        $validated = $request->validate([
            'extra_price_per_item' => ['required', 'numeric', 'min:0'],
        ]);

        $deliveryItem->update([
            'extra_price_per_item' => $validated['extra_price_per_item'],
        ]);

        $deliveryItem->loadMissing('partner:id,name');

        return response()->json([
            'message' => 'Extra price updated successfully.',
            'item' => [
                'id' => $deliveryItem->id,
                'product' => $deliveryItem->product,
                'partner' => $deliveryItem->partner,
                'district' => $deliveryItem->district,
                'city' => $deliveryItem->city,
                'address' => $deliveryItem->address,
                'courier_comment' => $deliveryItem->courier_comment,
                'price' => $deliveryItem->price,
                'transferred_to_shop_amount' => $deliveryItem->transferred_to_shop_amount,
                'collected_amount' => $deliveryItem->collected_amount,
                'extra_price_per_item' => $deliveryItem->extra_price_per_item,
                'deduction_price_per_item' => $deliveryItem->deduction_price_per_item,
                'paid_at' => $deliveryItem->paid_at,
            ],
        ]);
    }

    public function updateDeductionPrice(Request $request, DeliveryItem $deliveryItem): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'You are not allowed to update courier payroll.');

        $validated = $request->validate([
            'deduction_price_per_item' => ['required', 'numeric', 'min:0'],
        ]);

        $deliveryItem->update([
            'deduction_price_per_item' => $validated['deduction_price_per_item'],
        ]);

        $deliveryItem->loadMissing('partner:id,name');

        return response()->json([
            'message' => 'Deduction price updated successfully.',
            'item' => [
                'id' => $deliveryItem->id,
                'product' => $deliveryItem->product,
                'partner' => $deliveryItem->partner,
                'district' => $deliveryItem->district,
                'city' => $deliveryItem->city,
                'address' => $deliveryItem->address,
                'courier_comment' => $deliveryItem->courier_comment,
                'price' => $deliveryItem->price,
                'transferred_to_shop_amount' => $deliveryItem->transferred_to_shop_amount,
                'collected_amount' => $deliveryItem->collected_amount,
                'extra_price_per_item' => $deliveryItem->extra_price_per_item,
                'deduction_price_per_item' => $deliveryItem->deduction_price_per_item,
                'paid_at' => $deliveryItem->paid_at,
            ],
        ]);
    }

    public function markPaid(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'You are not allowed to update courier payroll.');

        $validated = $request->validate([
            'courier_id' => ['required', 'integer', 'exists:couriers,id'],
            'day' => ['required', 'date'],
        ]);

        $paidAt = Carbon::now();

        $updatedCount = DeliveryItem::query()
            ->where('assigned_courier_id', $validated['courier_id'])
            ->where('delivery_status', DeliveryItem::STATUS_DELIVERED)
            ->whereDate('actual_delivery_date', $validated['day'])
            ->whereNull('paid_at')
            ->update([
                'paid_at' => $paidAt,
            ]);

        return response()->json([
            'message' => 'Payroll marked as paid.',
            'updated_count' => $updatedCount,
            'paid_at' => $paidAt->toISOString(),
        ]);
    }
}
