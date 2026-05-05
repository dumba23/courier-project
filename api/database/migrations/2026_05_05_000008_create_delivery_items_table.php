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
        Schema::create('delivery_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('assigned_courier_id')->nullable()->constrained('couriers')->nullOnDelete();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->string('address', 1000)->nullable();
            $table->string('district')->nullable();
            $table->string('phone', 50)->nullable();
            $table->decimal('price', 10, 2);
            $table->text('comment')->nullable();
            $table->string('product')->nullable();
            $table->string('person_name')->nullable();
            $table->string('delivery_status')->default('pending');
            $table->date('delivery_date')->nullable();
            $table->timestamp('actual_delivery_date')->nullable();
            $table->timestamps();

            $table->index(['partner_id', 'delivery_date']);
            $table->index(['assigned_courier_id', 'delivery_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_items');
    }
};
