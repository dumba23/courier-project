<?php

namespace App\Services;

use App\Models\DeliveryZone;
use Illuminate\Support\Facades\DB;

class DeliveryZoneService
{
    public function getZoneForCoordinates(float $lat, float $lng): ?DeliveryZone
    {
        $zone = DB::table('delivery_zones')
            ->select('id')
            ->whereRaw(
                '
                MBRContains(area, POINT(?, ?))
                AND ST_Contains(area, POINT(?, ?))
                ',
                [$lng, $lat, $lng, $lat],
            )
            ->first();

        if (! $zone) {
            return null;
        }

        return DeliveryZone::query()->find($zone->id);
    }
}
