<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('courier_delivery_zones');
        Schema::dropIfExists('delivery_zones');
    }

    public function down(): void
    {
        // Historical delivery zone tables were removed in favor of districts.
    }
};
