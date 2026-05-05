<?php

namespace App\Http\Controllers;

use App\Models\Courier;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CourierController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'couriers' => Courier::query()
                ->with(['user:id,email'])
                ->latest()
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:50'],
            'car_plate_number' => ['nullable', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $courier = DB::transaction(function () use ($validated): Courier {
            $user = User::query()->create([
                'name' => "{$validated['first_name']} {$validated['last_name']}",
                'email' => $validated['email'],
                'password' => $validated['password'],
                'role' => User::ROLE_COURIER,
            ]);

            return Courier::query()->create([
                'user_id' => $user->id,
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'phone_number' => $validated['phone_number'],
                'car_plate_number' => $validated['car_plate_number'] ?? null,
            ])->load(['user:id,email']);
        });

        return response()->json([
            'message' => 'Courier created successfully.',
            'courier' => $courier,
        ], 201);
    }

    public function update(Request $request, Courier $courier): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:50'],
            'car_plate_number' => ['nullable', 'string', 'max:50'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($courier->user_id),
            ],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        $courier->loadMissing('user');

        DB::transaction(function () use ($courier, $validated): void {
            $courier->user->update([
                'name' => "{$validated['first_name']} {$validated['last_name']}",
                'email' => $validated['email'],
                ...(! empty($validated['password']) ? ['password' => $validated['password']] : []),
            ]);

            $courier->update([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'phone_number' => $validated['phone_number'],
                'car_plate_number' => $validated['car_plate_number'] ?? null,
            ]);
        });

        return response()->json([
            'message' => 'Courier updated successfully.',
            'courier' => $courier->fresh()->load(['user:id,email']),
        ]);
    }
}
