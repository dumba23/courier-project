<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryItem extends Model
{
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_CANCELED = 'canceled';
    public const STATUS_POSTPONEMENT = 'postponement';
    public const STATUS_CANCELLATION_ON_SITE = 'cancellation_on_site';
    public const STATUS_POSTPONEMENT_AFTER_ARRIVE = 'postponement_after_arrive';
    public const STATUS_REDIRECT_ADDRESS = 'redirect_address';
    public const STATUS_FUTURE_DELIVERY = 'future_delivery';

    protected $fillable = [
        'assigned_courier_id',
        'partner_id',
        'address',
        'district',
        'phone',
        'price',
        'comment',
        'product',
        'person_name',
        'delivery_status',
        'delivery_date',
        'actual_delivery_date',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'delivery_date' => 'date',
            'actual_delivery_date' => 'datetime',
        ];
    }

    public function courier(): BelongsTo
    {
        return $this->belongsTo(Courier::class, 'assigned_courier_id');
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    /**
     * @return array<string, string>
     */
    public static function statusLabels(): array
    {
        return [
            self::STATUS_DELIVERED => 'Delivered',
            self::STATUS_CANCELED => 'Canceled',
            self::STATUS_POSTPONEMENT => 'Postponement',
            self::STATUS_CANCELLATION_ON_SITE => 'Cancellation on site',
            self::STATUS_POSTPONEMENT_AFTER_ARRIVE => 'Postponement after arrive',
            self::STATUS_REDIRECT_ADDRESS => 'Redirect address',
            self::STATUS_FUTURE_DELIVERY => 'Future delivery',
        ];
    }
}
