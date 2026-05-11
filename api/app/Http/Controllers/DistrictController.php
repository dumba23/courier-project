<?php

namespace App\Http\Controllers;

use App\Models\District;
use App\Models\DistrictStreet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DistrictController extends Controller
{
    public function index(): JsonResponse
    {
        $districts = District::query()
            ->with('couriers:id,first_name,last_name')
            ->orderBy('name')
            ->get()
            ->map(fn (District $district): array => [
                'id' => $district->id,
                'name' => $district->name,
                'is_active' => $district->is_active,
                'courier_ids' => $district->couriers->pluck('id')->all(),
                'couriers' => $district->couriers->map(fn ($courier): array => [
                    'id' => $courier->id,
                    'name' => trim($courier->first_name.' '.$courier->last_name),
                ])->values()->all(),
            ])
            ->all();

        return response()->json([
            'districts' => $districts,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:districts,name'],
            'courier_ids' => ['nullable', 'array'],
            'courier_ids.*' => ['integer', 'exists:couriers,id'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $district = District::query()->create([
            'name' => trim($validated['name']),
            'is_active' => $validated['is_active'] ?? true,
        ]);
        $district->couriers()->sync($validated['courier_ids'] ?? []);
        $district->load('couriers:id,first_name,last_name');

        return response()->json([
            'message' => 'District created successfully.',
            'district' => [
                'id' => $district->id,
                'name' => $district->name,
                'is_active' => $district->is_active,
                'courier_ids' => $district->couriers->pluck('id')->all(),
                'couriers' => $district->couriers->map(fn ($courier): array => [
                    'id' => $courier->id,
                    'name' => trim($courier->first_name.' '.$courier->last_name),
                ])->values()->all(),
            ],
        ], 201);
    }

    public function update(Request $request, District $district): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:districts,name,'.$district->id],
            'courier_ids' => ['nullable', 'array'],
            'courier_ids.*' => ['integer', 'exists:couriers,id'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $previousName = $district->name;
        $nextName = trim($validated['name']);

        DB::transaction(function () use ($district, $validated, $previousName, $nextName): void {
            $district->update([
                'name' => $nextName,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $district->couriers()->sync($validated['courier_ids'] ?? []);

            if ($previousName !== $nextName) {
                DistrictStreet::query()
                    ->where('district_name', $previousName)
                    ->get()
                    ->each(function (DistrictStreet $districtStreet) use ($nextName): void {
                        $districtStreet->district_name = $nextName;
                        $districtStreet->save();
                    });
            }
        });

        $district->load('couriers:id,first_name,last_name');

        return response()->json([
            'message' => 'District updated successfully.',
            'district' => [
                'id' => $district->id,
                'name' => $district->name,
                'is_active' => $district->is_active,
                'courier_ids' => $district->couriers->pluck('id')->all(),
                'couriers' => $district->couriers->map(fn ($courier): array => [
                    'id' => $courier->id,
                    'name' => trim($courier->first_name.' '.$courier->last_name),
                ])->values()->all(),
            ],
        ]);
    }
}
