<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_items', function (Blueprint $table): void {
            $table->decimal('extra_price_per_item', 10, 2)->default(0)->after('price');
            $table->timestamp('paid_at')->nullable()->after('return_date');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_items', function (Blueprint $table): void {
            $table->dropColumn(['extra_price_per_item', 'paid_at']);
        });
    }
};
