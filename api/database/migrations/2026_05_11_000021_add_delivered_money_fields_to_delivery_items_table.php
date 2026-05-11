<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_items', function (Blueprint $table): void {
            $table->decimal('transferred_to_shop_amount', 10, 2)->nullable()->after('deduction_price_per_item');
            $table->decimal('collected_amount', 10, 2)->nullable()->after('transferred_to_shop_amount');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_items', function (Blueprint $table): void {
            $table->dropColumn(['transferred_to_shop_amount', 'collected_amount']);
        });
    }
};
