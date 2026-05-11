<?php

namespace App\Services;

use App\Models\District;
use App\Models\DistrictStreet;
use Illuminate\Support\Collection;

class DistrictStreetJsonImportService
{
    /**
     * @return array{districts_created:int,district_streets_created:int,district_streets_updated:int}
     */
    public function importFromFiles(string $cityUrbanPath, string $streetsPath): array
    {
        $cityUrban = json_decode(file_get_contents($cityUrbanPath), true, flags: JSON_THROW_ON_ERROR);
        $streetsByCity = json_decode(file_get_contents($streetsPath), true, flags: JSON_THROW_ON_ERROR);

        $urbanMap = $this->buildUrbanMap($cityUrban);
        $districtsCreated = 0;
        $districtStreetsCreated = 0;
        $districtStreetsUpdated = 0;

        DistrictStreet::withoutSyncingToSearch(function () use (
            $streetsByCity,
            $urbanMap,
            &$districtsCreated,
            &$districtStreetsCreated,
            &$districtStreetsUpdated
        ): void {
            foreach ($streetsByCity as $streetGroups) {
                foreach ($streetGroups as $streetGroup) {
                    $urban = $urbanMap[$streetGroup['urban_id']] ?? null;

                    if (! $urban) {
                        continue;
                    }

                    $district = District::query()->firstOrCreate(
                        ['name' => $urban['urban_name']],
                        ['is_active' => true],
                    );

                    if ($district->wasRecentlyCreated) {
                        $districtsCreated++;
                    }

                    $baseAliases = $this->extractAliases([
                        $streetGroup['display_name'] ?? null,
                        $streetGroup['translations']['ka']['display_name'] ?? null,
                        $streetGroup['translations']['en']['display_name'] ?? null,
                        $streetGroup['translations']['ru']['display_name'] ?? null,
                    ]);

                    foreach (($streetGroup['streets'] ?? []) as $street) {
                        $streetName = trim(
                            $street['translations']['ka']['display_name']
                            ?? $street['translations']['en']['display_name']
                            ?? $street['translations']['ru']['display_name']
                            ?? $streetGroup['display_name']
                            ?? '',
                        );

                        if ($streetName === '') {
                            continue;
                        }

                        $aliases = $this->extractAliases([
                            ...$baseAliases,
                            $street['translations']['ka']['display_name'] ?? null,
                            $street['translations']['en']['display_name'] ?? null,
                            $street['translations']['ru']['display_name'] ?? null,
                        ], $streetName);

                        $districtStreet = DistrictStreet::query()->firstOrNew([
                            'city' => $urban['city_name'],
                            'normalized_district_name' => DistrictStreet::normalizeName($urban['urban_name']),
                            'normalized_street_name' => DistrictStreet::normalizeName($streetName),
                        ]);

                        $wasExisting = $districtStreet->exists;

                        $districtStreet->fill([
                            'city' => $urban['city_name'],
                            'district_name' => $urban['urban_name'],
                            'street_name' => $streetName,
                            'aliases' => $aliases,
                            'is_active' => true,
                        ]);

                        $districtStreet->save();

                        if ($wasExisting) {
                            $districtStreetsUpdated++;
                        } else {
                            $districtStreetsCreated++;
                        }
                    }
                }
            }
        });

        return [
            'districts_created' => $districtsCreated,
            'district_streets_created' => $districtStreetsCreated,
            'district_streets_updated' => $districtStreetsUpdated,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $cityUrban
     * @return array<int, array{city_name:string,urban_name:string}>
     */
    private function buildUrbanMap(array $cityUrban): array
    {
        $urbanMap = [];

        foreach ($cityUrban as $city) {
            $cityName = $this->normalizeCityName($city['display_name'] ?? '');

            foreach (($city['districts'] ?? []) as $district) {
                foreach (($district['urbans'] ?? []) as $urban) {
                    $urbanMap[$urban['id']] = [
                        'city_name' => $cityName,
                        'urban_name' => trim($urban['display_name'] ?? ''),
                    ];
                }
            }
        }

        return $urbanMap;
    }

    private function normalizeCityName(string $cityName): string
    {
        $trimmedName = trim($cityName);

        return $trimmedName === 'თბილისი' ? 'Tbilisi' : $trimmedName;
    }

    /**
     * @param  array<int, string|null>  $values
     * @return array<int, string>
     */
    private function extractAliases(array $values, ?string $exclude = null): array
    {
        return Collection::make($values)
            ->filter(fn (?string $value): bool => filled($value))
            ->map(fn (string $value): string => trim($value))
            ->filter(fn (string $value): bool => $value !== '')
            ->reject(fn (string $value): bool => $exclude !== null && $value === $exclude)
            ->unique()
            ->values()
            ->all();
    }
}
