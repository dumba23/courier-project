<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Services\DistrictStreetJsonImportService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('district-streets:import-json', function (DistrictStreetJsonImportService $importService) {
    $result = $importService->importFromFiles(
        base_path('city-urban.json'),
        base_path('streets.json'),
    );

    $this->info('District streets imported successfully.');
    $this->line('Districts created: '.$result['districts_created']);
    $this->line('District streets created: '.$result['district_streets_created']);
    $this->line('District streets updated: '.$result['district_streets_updated']);
})->purpose('Import district streets from city-urban.json and streets.json');
