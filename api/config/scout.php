<?php

use App\Models\DistrictStreet;

return [

    'driver' => env('SCOUT_DRIVER', 'meilisearch'),

    'prefix' => env('SCOUT_PREFIX', ''),

    'queue' => env('SCOUT_QUEUE', false),

    'after_commit' => false,

    'chunk' => [
        'searchable' => 500,
        'unsearchable' => 500,
    ],

    'soft_delete' => false,

    'identify' => env('SCOUT_IDENTIFY', false),

    'meilisearch' => [
        'host' => env('MEILISEARCH_HOST', 'http://127.0.0.1:7700'),
        'key' => env('MEILISEARCH_KEY'),
        'index-settings' => [
            DistrictStreet::class => [
                'filterableAttributes' => [
                    'district_name',
                    'city',
                    'is_active',
                ],
                'sortableAttributes' => [
                    'district_name',
                    'street_name',
                    'created_at',
                    'updated_at',
                ],
            ],
        ],
    ],
];
