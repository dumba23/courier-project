<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_items', function (Blueprint $table): void {
            $table->text('courier_comment')->nullable()->after('comment');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_items', function (Blueprint $table): void {
            $table->dropColumn('courier_comment');
        });
    }
};
