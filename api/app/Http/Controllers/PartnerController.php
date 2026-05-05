<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PartnerController extends Controller
{
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
            'tariff' => ['required', 'numeric', 'min:0'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

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
            ])->load(['user:id,email']);
        });

        return response()->json([
            'message' => 'Partner created successfully.',
            'partner' => $partner,
        ], 201);
    }
}
