<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CourierController;
use App\Http\Controllers\CourierPayrollController;
use App\Http\Controllers\CourierCommentTemplateController;
use App\Http\Controllers\DistrictController;
use App\Http\Controllers\DistrictStreetController;
use App\Http\Controllers\DeliveryItemController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\PartnerPayrollController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/courier-comment-templates', [CourierCommentTemplateController::class, 'index']);
    Route::get('/delivery-items', [DeliveryItemController::class, 'index']);
    Route::post('/delivery-items', [DeliveryItemController::class, 'store']);
    Route::patch('/delivery-items/bulk', [DeliveryItemController::class, 'bulkUpdate']);
    Route::patch('/delivery-items/{deliveryItem}/product', [DeliveryItemController::class, 'updateProduct']);
    Route::patch('/delivery-items/{deliveryItem}/courier', [DeliveryItemController::class, 'updateCourier']);
    Route::patch('/delivery-items/{deliveryItem}/courier-comment', [DeliveryItemController::class, 'updateCourierComment']);
    Route::patch('/delivery-items/{deliveryItem}/status', [DeliveryItemController::class, 'updateStatus']);

    Route::middleware('role:admin')->group(function (): void {
        Route::patch('/delivery-items/assign-districts', [DeliveryItemController::class, 'assignDistricts']);
        Route::patch('/delivery-items/{deliveryItem}/additional-status', [DeliveryItemController::class, 'updateAdditionalStatus']);
        Route::patch('/delivery-items/{deliveryItem}/warehouse-state', [DeliveryItemController::class, 'updateWarehouseState']);
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/district-streets', [DistrictStreetController::class, 'index']);
        Route::post('/district-streets', [DistrictStreetController::class, 'store']);
        Route::put('/district-streets/{districtStreet}', [DistrictStreetController::class, 'update']);
        Route::get('/districts', [DistrictController::class, 'index']);
        Route::post('/districts', [DistrictController::class, 'store']);
        Route::put('/districts/{district}', [DistrictController::class, 'update']);
        Route::get('/couriers', [CourierController::class, 'index']);
        Route::post('/couriers', [CourierController::class, 'store']);
        Route::put('/couriers/{courier}', [CourierController::class, 'update']);
        Route::get('/courier-payroll', [CourierPayrollController::class, 'index']);
        Route::patch('/courier-payroll/{deliveryItem}/extra-price', [CourierPayrollController::class, 'updateExtraPrice']);
        Route::patch('/courier-payroll/{deliveryItem}/deduction-price', [CourierPayrollController::class, 'updateDeductionPrice']);
        Route::patch('/courier-payroll/mark-paid', [CourierPayrollController::class, 'markPaid']);
        Route::post('/courier-comment-templates', [CourierCommentTemplateController::class, 'store']);
        Route::put('/courier-comment-templates/{courierCommentTemplate}', [CourierCommentTemplateController::class, 'update']);
        Route::delete('/courier-comment-templates/{courierCommentTemplate}', [CourierCommentTemplateController::class, 'destroy']);
        Route::get('/partners', [PartnerController::class, 'index']);
        Route::post('/partners', [PartnerController::class, 'store']);
        Route::put('/partners/{partner}', [PartnerController::class, 'update']);
        Route::get('/partner-payroll', [PartnerPayrollController::class, 'index']);
        Route::patch('/partner-payroll/{deliveryItem}/extra-price', [PartnerPayrollController::class, 'updateExtraPrice']);
        Route::patch('/partner-payroll/mark-paid', [PartnerPayrollController::class, 'markPaid']);
    });
});
