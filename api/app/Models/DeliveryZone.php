<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class DeliveryZone extends Model
{
    protected $fillable = [
        'name',
        'area',
    ];

    public function couriers(): BelongsToMany
    {
        return $this->belongsToMany(Courier::class, 'courier_delivery_zones')
            ->withTimestamps();
    }
}
