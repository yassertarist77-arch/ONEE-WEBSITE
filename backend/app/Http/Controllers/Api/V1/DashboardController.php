<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Consumable;
use App\Models\Discharge;
use App\Models\StockMovement;
use App\Models\Ticket;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $totalConsumables = Consumable::count();

        // Stock status counts
        $enStock = Consumable::where('stock_quantity', '>', 0)
            ->whereColumn('stock_quantity', '>', 'threshold')
            ->count();

        $critique = Consumable::where('stock_quantity', '>', 0)
            ->whereColumn('stock_quantity', '<=', 'threshold')
            ->count();

        $rupture = Consumable::where('stock_quantity', '<=', 0)
            ->count();

        // Recent movements (last 5) with consumable name
        $recentMovements = StockMovement::with('consumable')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($movement) {
                return [
                    'id' => $movement->id,
                    'type' => $movement->type,
                    'reason' => $movement->reason,
                    'quantity' => $movement->quantity,
                    'consumable_name' => $movement->consumable->name ?? 'N/A',
                    'consumable_reference' => $movement->consumable->reference ?? 'N/A',
                    'created_at' => $movement->created_at->toDateTimeString(),
                ];
            });

        // Recent discharges (last 5)
        $recentDischarges = Discharge::orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($discharge) {
                return [
                    'id' => $discharge->id,
                    'reference' => $discharge->reference,
                    'recipient' => $discharge->recipient,
                    'items_count' => count($discharge->items ?? []),
                    'created_at' => $discharge->created_at->toDateTimeString(),
                ];
            });

        $pendingTicketsCount = Ticket::where('status', 'soumis')->count();

        $recentTickets = Ticket::with('user:id,name')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(function ($ticket) {
                return [
                    'id'         => $ticket->id,
                    'reference'  => $ticket->reference,
                    'status'     => $ticket->status,
                    'user_name'  => $ticket->user->name ?? '—',
                    'created_at' => $ticket->created_at->toDateTimeString(),
                ];
            });

        // Low stock items (stock <= threshold)
        $lowStockItems = Consumable::where('stock_quantity', '>', 0)
            ->whereColumn('stock_quantity', '<=', 'threshold')
            ->orderBy('stock_quantity', 'asc')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'reference' => $item->reference,
                    'stock_quantity' => $item->stock_quantity,
                    'threshold' => $item->threshold,
                    'unit' => $item->unit,
                    'status' => $item->stock_quantity <= 0 ? 'rupture' : ($item->stock_quantity <= $item->threshold ? 'critique' : 'en_stock'),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'total_consumables' => $totalConsumables,
                'stock_status' => [
                    'en_stock' => $enStock,
                    'critique' => $critique,
                    'rupture' => $rupture,
                ],
                'recent_movements' => $recentMovements,
                'recent_discharges' => $recentDischarges,
                'low_stock_items' => $lowStockItems,
                'pending_tickets_count' => $pendingTicketsCount,
                'recent_tickets' => $recentTickets,
            ]
        ]);
    }
}
