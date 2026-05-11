<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Partner extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'phone_number',
        'pickup_address',
        'tariff',
        'tariff_per_kg',
        'tariff_per_kg_ranges',
    ];

    protected function casts(): array
    {
        return [
            'tariff_per_kg' => 'boolean',
            'tariff_per_kg_ranges' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function deliveryItems(): HasMany
    {
        return $this->hasMany(DeliveryItem::class);
    }
}
