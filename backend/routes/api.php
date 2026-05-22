<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\UserAuthController;
use App\Http\Controllers\Api\V1\ConsumableController;
use App\Http\Controllers\Api\V1\StockController;
use App\Http\Controllers\Api\V1\DischargeController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ExportController;
use App\Http\Controllers\Api\V1\TicketController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\AdminUserController;

// ─────────────────────────────────────────────
//  ADMIN API  (guard: admin / provider: admins)
// ─────────────────────────────────────────────
Route::prefix('v1')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::apiResource('consumables', ConsumableController::class);
        Route::post('/stock/add', [StockController::class, 'addStock']);
        Route::post('/stock/remove', [StockController::class, 'removeStock']);
        Route::get('/stock/history', [StockController::class, 'history']);
        Route::get('/stock/low-stock', [StockController::class, 'lowStock']);
        Route::get('/stock/options', [StockController::class, 'getEntitiesAndVilles']);
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/export/database', [ExportController::class, 'exportDatabase']);
        Route::get('/export/csv', [ExportController::class, 'exportCSV']);
        Route::get('/discharges', [DischargeController::class, 'index']);
        Route::get('/discharges/{id}', [DischargeController::class, 'show']);
        Route::post('/discharges/{id}/cancel', [DischargeController::class, 'cancel']);
        Route::get('/discharges/{id}/download', [DischargeController::class, 'download']);
        Route::get('/tickets', [TicketController::class, 'index']);
        Route::get('/tickets/{id}', [TicketController::class, 'show'])->whereNumber('id');
        Route::post('/tickets/{id}/approve', [TicketController::class, 'approve'])->whereNumber('id');
        Route::post('/tickets/{id}/reject', [TicketController::class, 'reject'])->whereNumber('id');
        Route::get('/admin/manage-users', [AdminUserController::class, 'index']);
        Route::post('/admin/manage-users', [AdminUserController::class, 'store']);
        Route::put('/admin/manage-users/{id}', [AdminUserController::class, 'update']);
        Route::delete('/admin/manage-users/{id}', [AdminUserController::class, 'destroy']);
        Route::post('/admin/manage-users/{id}/reset-password', [AdminUserController::class, 'resetPassword']);
    });
});

// ─────────────────────────────────────────────
//  USER API  (guard: sanctum / provider: users)
// ─────────────────────────────────────────────
Route::prefix('v1/user')->group(function () {
    Route::post('/login', [UserAuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [UserAuthController::class, 'logout']);
        Route::get('/me', [UserAuthController::class, 'me']);
        Route::get('/consumables', [ConsumableController::class, 'index']);
        Route::get('/tickets', [TicketController::class, 'myTickets']);
        Route::post('/tickets', [TicketController::class, 'store']);
        Route::get('/tickets/{id}', [TicketController::class, 'show'])->whereNumber('id');
        Route::put('/tickets/{id}', [TicketController::class, 'update'])->whereNumber('id');
        Route::delete('/tickets/{id}', [TicketController::class, 'destroy'])->whereNumber('id');
        Route::get('/discharges/{id}/download', [TicketController::class, 'downloadMyDischarge'])->whereNumber('id');
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->whereNumber('id');
    });
});
