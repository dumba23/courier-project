<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable;

class DistrictStreet extends Model
{
    use Searchable;

    protected $fillable = [
        'city',
        'district_name',
        'street_name',
        'normalized_district_name',
        'normalized_street_name',
        'full_name',
        'aliases',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'aliases' => 'array',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (DistrictStreet $districtStreet): void {
            $districtStreet->city = trim($districtStreet->city ?: 'Tbilisi');
            $districtStreet->district_name = trim($districtStreet->district_name);
            $districtStreet->street_name = trim($districtStreet->street_name);
            $districtStreet->normalized_district_name = static::normalizeName($districtStreet->district_name);
            $districtStreet->normalized_street_name = static::normalizeName($districtStreet->street_name);
            $districtStreet->full_name = trim($districtStreet->district_name.', '.$districtStreet->street_name.', '.$districtStreet->city);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'city' => $this->city,
            'district_name' => $this->district_name,
            'street_name' => $this->street_name,
            'normalized_district_name' => $this->normalized_district_name,
            'normalized_street_name' => $this->normalized_street_name,
            'full_name' => $this->full_name,
            'aliases' => $this->aliases ?? [],
            'is_active' => $this->is_active,
        ];
    }

    public function searchableAs(): string
    {
        return 'district_streets';
    }

    public static function normalizeName(string $value): string
    {
        $normalized = trim(mb_strtolower($value));
        $normalized = preg_replace('/[[:space:]]+/u', ' ', $normalized) ?? $normalized;

        return $normalized;
    }
}
