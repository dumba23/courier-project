<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_items', function (Blueprint $table): void {
            $table->timestamp('return_date')->nullable()->after('delivery_date');
        });

        DB::table('delivery_items')
            ->whereNotNull('actual_delivery_date')
            ->update([
                'return_date' => DB::raw('actual_delivery_date'),
            ]);
    }

    public function down(): void
    {
        Schema::table('delivery_items', function (Blueprint $table): void {
            $table->dropColumn('return_date');
        });
    }
};
