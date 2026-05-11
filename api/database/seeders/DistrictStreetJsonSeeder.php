<?php

namespace Database\Seeders;

use App\Services\DistrictStreetJsonImportService;
use Illuminate\Database\Seeder;

class DistrictStreetJsonSeeder extends Seeder
{
    public function run(DistrictStreetJsonImportService $importService): void
    {
        $importService->importFromFiles(
            base_path('city-urban.json'),
            base_path('streets.json'),
        );
    }
}
