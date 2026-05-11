<?php

namespace App\Http\Controllers;

use App\Models\DistrictStreet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DistrictStreetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'district_name' => ['nullable', 'string', 'max:255'],
            'street_name' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $query = DistrictStreet::query()->latest();

        if (isset($validated['district_name'])) {
            $query->where('district_name', 'like', '%'.$validated['district_name'].'%');
        }

        if (isset($validated['street_name'])) {
            $query->where('street_name', 'like', '%'.$validated['street_name'].'%');
        }

        if (isset($validated['city'])) {
            $query->where('city', $validated['city']);
        }

        if (array_key_exists('is_active', $validated)) {
            $query->where('is_active', $validated['is_active']);
        }

        return response()->json([
            'district_streets' => $query->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'city' => ['nullable', 'string', 'max:255'],
            'district_name' => ['required', 'string', 'max:255'],
            'street_name' => ['required', 'string', 'max:255'],
            'aliases' => ['nullable', 'array'],
            'aliases.*' => ['string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $districtStreet = DistrictStreet::query()->create([
            'city' => $validated['city'] ?? 'Tbilisi',
            'district_name' => $validated['district_name'],
            'street_name' => $validated['street_name'],
            'aliases' => $validated['aliases'] ?? [],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'District-street dataset row created successfully.',
            'district_street' => $districtStreet,
        ], 201);
    }

    public function update(Request $request, DistrictStreet $districtStreet): JsonResponse
    {
        $validated = $request->validate([
            'city' => ['nullable', 'string', 'max:255'],
            'district_name' => ['required', 'string', 'max:255'],
            'street_name' => ['required', 'string', 'max:255'],
            'aliases' => ['nullable', 'array'],
            'aliases.*' => ['string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $districtStreet->update([
            'city' => $validated['city'] ?? 'Tbilisi',
            'district_name' => $validated['district_name'],
            'street_name' => $validated['street_name'],
            'aliases' => $validated['aliases'] ?? [],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'District-street dataset row updated successfully.',
            'district_street' => $districtStreet->fresh(),
        ]);
    }
}
