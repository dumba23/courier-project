<?php

namespace App\Http\Controllers;

use App\Models\DeliveryZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryZoneController extends Controller
{
    public function index(): JsonResponse
    {
        $zones = DeliveryZone::query()
            ->select([
                'id',
                'name',
                DB::raw('ST_AsText(area) as area_wkt'),
            ])
            ->with([
                'couriers:id,first_name,last_name',
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (DeliveryZone $zone): array => $this->serializeZone($zone));

        return response()->json([
            'delivery_zones' => $zones,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'coordinates' => ['required', 'string'],
            'courier_ids' => ['nullable', 'array'],
            'courier_ids.*' => ['integer', 'exists:couriers,id'],
        ]);

        $polygonWkt = $this->coordinatesToWkt($validated['coordinates']);
        DB::insert(
            'INSERT INTO delivery_zones (name, area, created_at, updated_at) VALUES (?, ST_GeomFromText(?), ?, ?)',
            [
                $validated['name'],
                $polygonWkt,
                now(),
                now(),
            ],
        );

        $zoneId = (int) DB::getPdo()->lastInsertId();
        $zone = DeliveryZone::query()->findOrFail($zoneId);
        $zone->couriers()->sync($validated['courier_ids'] ?? []);
        $zone->load('couriers:id,first_name,last_name');

        return response()->json([
            'message' => 'Delivery zone created successfully.',
            'delivery_zone' => $this->serializeZone($zone, $validated['coordinates']),
        ], 201);
    }

    public function update(Request $request, DeliveryZone $deliveryZone): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'coordinates' => ['required', 'string'],
            'courier_ids' => ['nullable', 'array'],
            'courier_ids.*' => ['integer', 'exists:couriers,id'],
        ]);

        $polygonWkt = $this->coordinatesToWkt($validated['coordinates']);

        DB::update(
            'UPDATE delivery_zones SET name = ?, area = ST_GeomFromText(?), updated_at = ? WHERE id = ?',
            [
                $validated['name'],
                $polygonWkt,
                now(),
                $deliveryZone->id,
            ],
        );
        $deliveryZone->couriers()->sync($validated['courier_ids'] ?? []);
        $deliveryZone->load('couriers:id,first_name,last_name');

        return response()->json([
            'message' => 'Delivery zone updated successfully.',
            'delivery_zone' => $this->serializeZone($deliveryZone, $validated['coordinates']),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeZone(DeliveryZone $zone, ?string $coordinates = null): array
    {
        return [
            'id' => $zone->id,
            'name' => $zone->name,
            'coordinates' => $coordinates ? $this->normalizeCoordinateString($coordinates) : $this->wktToCoordinateString($zone->area_wkt),
            'courier_ids' => $zone->couriers->pluck('id')->all(),
            'couriers' => $zone->couriers->map(fn ($courier): array => [
                'id' => $courier->id,
                'name' => trim($courier->first_name.' '.$courier->last_name),
            ])->values()->all(),
        ];
    }

    private function coordinatesToWkt(string $coordinates): string
    {
        $points = collect(preg_split('/[;\n]+/', trim($coordinates)) ?: [])
            ->map(fn (string $point): string => trim($point))
            ->filter()
            ->map(function (string $point): string {
                $parts = preg_split('/\s*,\s*/', $point) ?: [];

                if (count($parts) !== 2 || ! is_numeric($parts[0]) || ! is_numeric($parts[1])) {
                    abort(422, 'Coordinates must use "lng,lat" pairs separated by semicolons or new lines.');
                }

                return trim($parts[0]).' '.trim($parts[1]);
            })
            ->values();

        if ($points->count() < 3) {
            abort(422, 'At least three coordinate pairs are required to create a polygon.');
        }

        if ($points->first() !== $points->last()) {
            $points->push($points->first());
        }

        return 'POLYGON(('.$points->implode(', ').'))';
    }

    private function wktToCoordinateString(?string $wkt): string
    {
        if (! $wkt) {
            return '';
        }

        $coordinates = preg_replace('/^POLYGON\s*\(\(|\)\)$/i', '', trim($wkt)) ?? '';

        return collect(explode(',', $coordinates))
            ->map(fn (string $point): string => trim(str_replace(' ', ',', trim($point))))
            ->implode('; ');
    }

    private function normalizeCoordinateString(string $coordinates): string
    {
        return collect(preg_split('/[;\n]+/', trim($coordinates)) ?: [])
            ->map(fn (string $point): string => trim($point))
            ->filter()
            ->implode('; ');
    }
}
