<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PartnerController extends Controller
{
    private const TARIFF_PER_KG_RANGE_RULES = [
        'tariff_per_kg_ranges' => ['nullable', 'array', 'min:1'],
        'tariff_per_kg_ranges.*.up_to_kg' => ['required', 'numeric', 'gt:0'],
        'tariff_per_kg_ranges.*.price' => ['required', 'numeric', 'min:0'],
    ];

    public function index(): JsonResponse
    {
        return response()->json([
            'partners' => Partner::query()
                ->with(['user:id,email'])
                ->latest()
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone_number' => ['required', 'string', 'max:50'],
            'pickup_address' => ['required', 'string', 'max:1000'],
            'tariff' => ['nullable', 'numeric', 'min:0'],
            'tariff_per_kg' => ['nullable', 'boolean'],
            ...self::TARIFF_PER_KG_RANGE_RULES,
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);
        $validated = $this->normalizeTariffPayload($validated);

        $partner = DB::transaction(function () use ($validated): Partner {
            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'role' => User::ROLE_SELLER,
            ]);

            return Partner::query()->create([
                'user_id' => $user->id,
                'name' => $validated['name'],
                'phone_number' => $validated['phone_number'],
                'pickup_address' => $validated['pickup_address'],
                'tariff' => $validated['tariff'],
                'tariff_per_kg' => $validated['tariff_per_kg'] ?? false,
                'tariff_per_kg_ranges' => $validated['tariff_per_kg_ranges'] ?? null,
            ])->load(['user:id,email']);
        });

        return response()->json([
            'message' => 'Partner created successfully.',
            'partner' => $partner,
        ], 201);
    }

    public function update(Request $request, Partner $partner): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($partner->user_id),
            ],
            'phone_number' => ['required', 'string', 'max:50'],
            'pickup_address' => ['required', 'string', 'max:1000'],
            'tariff' => ['nullable', 'numeric', 'min:0'],
            'tariff_per_kg' => ['nullable', 'boolean'],
            ...self::TARIFF_PER_KG_RANGE_RULES,
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);
        $validated = $this->normalizeTariffPayload($validated);

        $partner->loadMissing('user');

        DB::transaction(function () use ($partner, $validated): void {
            $partner->user->update([
                'name' => $validated['name'],
                'email' => $validated['email'],
                ...(! empty($validated['password']) ? ['password' => $validated['password']] : []),
            ]);

            $partner->update([
                'name' => $validated['name'],
                'phone_number' => $validated['phone_number'],
                'pickup_address' => $validated['pickup_address'],
                'tariff' => $validated['tariff'],
                'tariff_per_kg' => $validated['tariff_per_kg'] ?? false,
                'tariff_per_kg_ranges' => $validated['tariff_per_kg_ranges'] ?? null,
            ]);
        });

        return response()->json([
            'message' => 'Partner updated successfully.',
            'partner' => $partner->fresh()->load(['user:id,email']),
        ]);
    }

    private function normalizeTariffPayload(array $validated): array
    {
        $isTariffPerKg = (bool) ($validated['tariff_per_kg'] ?? false);

        if (! $isTariffPerKg) {
            $validated['tariff'] = $validated['tariff'] ?? 0;
            $validated['tariff_per_kg_ranges'] = null;

            return $validated;
        }

        $ranges = collect($validated['tariff_per_kg_ranges'] ?? [])
            ->map(fn (array $range): array => [
                'up_to_kg' => (float) $range['up_to_kg'],
                'price' => (float) $range['price'],
            ])
            ->sortBy('up_to_kg')
            ->values()
            ->all();

        abort_if($ranges === [], 422, 'At least one tariff per kg range is required.');

        $previousUpToKg = 0.0;

        foreach ($ranges as $index => $range) {
            if ($range['up_to_kg'] <= $previousUpToKg) {
                abort(422, 'Tariff per kg ranges must be in increasing weight order.');
            }

            $previousUpToKg = $range['up_to_kg'];
        }

        $validated['tariff'] = 0;
        $validated['tariff_per_kg_ranges'] = $ranges;

        return $validated;
    }
}
