<?php

namespace App\Http\Controllers;

use App\Models\City;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = City::query()->orderBy('name');

        if (! $request->user()?->isAdmin()) {
            $query->where('is_active', true);
        }

        return response()->json([
            'cities' => $query->get()->map(fn (City $city): array => [
                'id' => $city->id,
                'name' => $city->name,
                'is_active' => $city->is_active,
            ])->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:cities,name'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $city = City::query()->create([
            'name' => trim($validated['name']),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'City created successfully.',
            'city' => [
                'id' => $city->id,
                'name' => $city->name,
                'is_active' => $city->is_active,
            ],
        ], 201);
    }

    public function update(Request $request, City $city): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:cities,name,'.$city->id],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $city->update([
            'name' => trim($validated['name']),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'City updated successfully.',
            'city' => [
                'id' => $city->id,
                'name' => $city->name,
                'is_active' => $city->is_active,
            ],
        ]);
    }
}
