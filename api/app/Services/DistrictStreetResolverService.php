<?php

namespace App\Services;

use App\Models\DistrictStreet;
use Illuminate\Support\Collection;

class DistrictStreetResolverService
{
    /**
     * @return list<string>
     */
    public function resolveDistrictNamesFromAddress(string $address): array
    {
        $queries = $this->buildSearchQueries($address);
        $normalizedAddress = $this->normalizeAddress($address);
        $matches = collect();

        foreach ($queries as $query) {
            $results = DistrictStreet::search($query)
                ->take(10)
                ->get();

            foreach ($results as $result) {
                $score = $this->scoreMatch($address, $query, $result);

                if ($score <= 0) {
                    continue;
                }

                $matches->push([
                    'district_name' => $result->district_name,
                    'score' => $score,
                ]);
            }
        }

        if ($matches->isEmpty()) {
            foreach ($queries as $query) {
                DistrictStreet::query()
                    ->where('is_active', true)
                    ->where(function ($builder) use ($query): void {
                        $builder
                            ->where('normalized_street_name', 'like', '%'.$query.'%')
                            ->orWhere('full_name', 'like', '%'.$query.'%');
                    })
                    ->orderBy('district_name')
                    ->get()
                    ->each(function (DistrictStreet $districtStreet) use ($matches): void {
                        $matches->push([
                            'district_name' => $districtStreet->district_name,
                            'score' => 1,
                        ]);
                    });
            }
        }

        $rankedDistricts = $matches
            ->sortByDesc('score')
            ->groupBy('district_name')
            ->map(function (Collection $districtMatches, string $districtName) use ($normalizedAddress): array {
                $maxScore = $districtMatches->max('score') ?? 0;

                return [
                    'district_name' => $districtName,
                    'score' => $maxScore,
                    'mentioned_in_address' => str_contains(
                        $normalizedAddress,
                        DistrictStreet::normalizeName($districtName),
                    ),
                ];
            })
            ->sortByDesc('score')
            ->values();

        $mentionedDistrict = $rankedDistricts
            ->first(fn (array $district): bool => $district['mentioned_in_address']);

        if ($mentionedDistrict) {
            return [$mentionedDistrict['district_name']];
        }

        return $rankedDistricts
            ->pluck('district_name')
            ->filter(fn (?string $districtName): bool => filled($districtName))
            ->unique()
            ->values()
            ->all();
    }

    public function resolveFromAddress(string $address): ?DistrictStreet
    {
        $queries = $this->buildSearchQueries($address);
        $bestMatch = null;
        $bestScore = 0;

        foreach ($queries as $query) {
            $results = DistrictStreet::search($query)
                ->take(10)
                ->get();

            foreach ($results as $result) {
                $score = $this->scoreMatch($address, $query, $result);

                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestMatch = $result;
                }
            }
        }

        if ($bestMatch) {
            return $bestMatch;
        }

        foreach ($queries as $query) {
            $fallback = DistrictStreet::query()
                ->where('is_active', true)
                ->where(function ($builder) use ($query): void {
                    $builder
                        ->where('normalized_street_name', 'like', '%'.$query.'%')
                        ->orWhere('full_name', 'like', '%'.$query.'%');
                })
                ->orderBy('district_name')
                ->first();

            if ($fallback) {
                return $fallback;
            }
        }

        return null;
    }

    public function normalizeAddressToGeorgian(string $address): string
    {
        $trimmedAddress = trim($address);

        if ($trimmedAddress === '') {
            return $trimmedAddress;
        }

        $match = $this->resolveFromAddress($trimmedAddress);

        if (! $match) {
            return $trimmedAddress;
        }

        $replacement = $match->street_name;
        $candidates = collect([
            $match->street_name,
            ...($match->aliases ?? []),
        ])
            ->filter(fn (?string $value): bool => filled($value))
            ->map(fn (string $value): string => trim($value))
            ->unique()
            ->sortByDesc(fn (string $value): int => mb_strlen($value))
            ->values();

        foreach ($candidates as $candidate) {
            if (mb_stripos($trimmedAddress, $candidate) === false) {
                continue;
            }

            return $this->replaceCaseInsensitive($trimmedAddress, $candidate, $replacement);
        }

        return $trimmedAddress;
    }

    /**
     * @return list<string>
     */
    public function buildSearchQueries(string $address): array
    {
        $normalizedAddress = $this->normalizeAddress($address);
        $parts = preg_split('/[,;]+/u', $normalizedAddress) ?: [];

        $queries = collect($parts)
            ->map(fn (string $part): string => $this->stripStreetNoise($part))
            ->filter(fn (string $part): bool => mb_strlen($part) >= 3)
            ->values();

        $queries->prepend($this->stripStreetNoise($normalizedAddress));

        return $queries
            ->filter(fn (string $query): bool => mb_strlen($query) >= 3)
            ->unique()
            ->sortByDesc(fn (string $query): int => mb_strlen($query))
            ->values()
            ->all();
    }

    public function normalizeAddress(string $value): string
    {
        $normalized = trim(mb_strtolower($value));
        $normalized = preg_replace('/[[:space:]]+/u', ' ', $normalized) ?? $normalized;
        $normalized = preg_replace('/\s*,\s*/u', ', ', $normalized) ?? $normalized;
        $normalized = preg_replace('/[.]+/u', ' ', $normalized) ?? $normalized;

        return trim($normalized);
    }

    private function stripStreetNoise(string $value): string
    {
        $normalized = $this->normalizeAddress($value);
        $normalized = preg_replace('/\b\d+[a-zA-Zა-ჰ\/-]*\b/u', ' ', $normalized) ?? $normalized;
        $normalized = preg_replace('/\b(street|st|str|avenue|ave|av|road|rd|lane|ln|square|sq)\b/u', ' ', $normalized) ?? $normalized;
        $normalized = preg_replace('/\b(ქუჩა|ქ|გამზირი|გამზ|მოედანი|ჩიხი|გამზირი)\b/u', ' ', $normalized) ?? $normalized;
        $normalized = preg_replace('/[[:space:]]+/u', ' ', $normalized) ?? $normalized;

        return trim($normalized, " ,");
    }

    private function scoreMatch(string $fullAddress, string $query, DistrictStreet $districtStreet): int
    {
        $score = 0;
        $normalizedAddress = $this->normalizeAddress($fullAddress);
        $normalizedDistrict = DistrictStreet::normalizeName($districtStreet->district_name);
        $normalizedStreet = DistrictStreet::normalizeName($districtStreet->street_name);
        $aliases = collect($districtStreet->aliases ?? [])
            ->map(fn (string $alias): string => DistrictStreet::normalizeName($alias));

        if ($query === $normalizedStreet) {
            $score += 120;
        }

        if (str_contains($normalizedStreet, $query) || str_contains($query, $normalizedStreet)) {
            $score += 90;
        }

        if ($aliases->contains($query)) {
            $score += 100;
        }

        if ($aliases->contains(fn (string $alias): bool => str_contains($alias, $query) || str_contains($query, $alias))) {
            $score += 70;
        }

        if (str_contains($normalizedAddress, $normalizedDistrict)) {
            $score += 40;
        }

        if ($districtStreet->is_active) {
            $score += 10;
        }

        return $score;
    }

    private function replaceCaseInsensitive(string $subject, string $search, string $replace): string
    {
        $position = mb_stripos($subject, $search);

        if ($position === false) {
            return $subject;
        }

        return mb_substr($subject, 0, $position)
            .$replace
            .mb_substr($subject, $position + mb_strlen($search));
    }
}
