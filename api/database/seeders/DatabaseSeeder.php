<?php

namespace Database\Seeders;

use App\Models\Courier;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::query()->updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@courier.test')],
            [
                'name' => env('ADMIN_NAME', 'Courier Admin'),
                'password' => env('ADMIN_PASSWORD', 'password'),
                'role' => User::ROLE_ADMIN,
                'email_verified_at' => now(),
            ],
        );

        $courierUser = User::query()->updateOrCreate(
            ['email' => env('DEMO_COURIER_EMAIL', 'courier@courier.test')],
            [
                'name' => env('DEMO_COURIER_NAME', 'Demo Courier'),
                'password' => env('DEMO_COURIER_PASSWORD', 'password'),
                'role' => User::ROLE_COURIER,
                'email_verified_at' => now(),
            ],
        );

        Courier::query()->updateOrCreate(
            ['user_id' => $courierUser->id],
            [
                'first_name' => 'Demo',
                'last_name' => 'Courier',
                'phone_number' => '+995555010101',
                'car_plate_number' => 'TEST-101',
            ],
        );
    }
}
