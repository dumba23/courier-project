<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DeliveryZoneSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $polygon = 'POLYGON((
            44.7161736 41.7262716,
            44.7173753 41.716534,
            44.7587456 41.7175591,
            44.7637238 41.7139713,
            44.77883 41.7133305,
            44.7829499 41.7123054,
            44.7841515 41.7194811,
            44.7807183 41.7257592,
            44.7723069 41.7313961,
            44.7714486 41.7356235,
            44.7632088 41.7378011,
            44.7161736 41.7262716
        ))';

        DB::table('delivery_zones')->where('name', 'Saburtalo')->delete();

        DB::insert(
            'INSERT INTO delivery_zones (name, area, created_at, updated_at)
             VALUES (?, ST_GeomFromText(?), NOW(), NOW())',
            ['Saburtalo', preg_replace('/\s+/', ' ', $polygon)],
        );
    }
}
