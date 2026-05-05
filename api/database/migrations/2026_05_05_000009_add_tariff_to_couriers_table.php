<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('couriers', 'tariff')) {
            Schema::table('couriers', function (Blueprint $table): void {
                $table->decimal('tariff', 10, 2)->default(0)->after('car_plate_number');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('couriers', 'tariff')) {
            Schema::table('couriers', function (Blueprint $table): void {
                $table->dropColumn('tariff');
            });
        }
    }
};
