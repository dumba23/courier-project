<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('district_streets', function (Blueprint $table): void {
            $table->id();
            $table->string('city')->default('Tbilisi');
            $table->string('district_name');
            $table->string('street_name');
            $table->string('normalized_district_name');
            $table->string('normalized_street_name');
            $table->string('full_name');
            $table->json('aliases')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique([
                'city',
                'normalized_district_name',
                'normalized_street_name',
            ], 'district_streets_unique_pair');
            $table->index(['district_name', 'street_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('district_streets');
    }
};
