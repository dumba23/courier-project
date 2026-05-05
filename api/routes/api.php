<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CourierController;
use App\Http\Controllers\DeliveryItemController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/delivery-items', [DeliveryItemController::class, 'index']);
    Route::patch('/delivery-items/bulk', [DeliveryItemController::class, 'bulkUpdate']);
    Route::patch('/delivery-items/{deliveryItem}/status', [DeliveryItemController::class, 'updateStatus']);

    Route::middleware('role:admin')->group(function (): void {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/couriers', [CourierController::class, 'index']);
        Route::post('/couriers', [CourierController::class, 'store']);
        Route::put('/couriers/{courier}', [CourierController::class, 'update']);
        Route::get('/partners', [PartnerController::class, 'index']);
        Route::post('/partners', [PartnerController::class, 'store']);
    });
});
