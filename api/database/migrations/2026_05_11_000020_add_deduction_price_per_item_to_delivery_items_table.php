<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_items', function (Blueprint $table): void {
            $table->decimal('deduction_price_per_item', 10, 2)->default(0)->after('extra_price_per_item');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_items', function (Blueprint $table): void {
            $table->dropColumn('deduction_price_per_item');
        });
    }
};
