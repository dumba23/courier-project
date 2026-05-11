<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courier_districts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('courier_id')->constrained()->cascadeOnDelete();
            $table->foreignId('district_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['courier_id', 'district_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courier_districts');
    }
};
