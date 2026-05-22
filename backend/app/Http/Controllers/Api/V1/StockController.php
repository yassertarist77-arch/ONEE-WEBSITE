<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Consumable;
use App\Models\Discharge;
use App\Models\StockMovement;
use App\Services\DischargeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    public function addStock(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.consumable_id' => 'required|exists:consumables,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.notes' => 'nullable|string|max:500',
            'reference' => 'nullable|string|max:255',
            'entity' => 'required|string|max:255',
            'ville' => 'required|string|max:255'
        ]);

        $items = $validated['items'];
        $reference = $validated['reference'] ?? null;
        $entity = $validated['entity'];
        $ville = $validated['ville'];
        $updatedConsumables = [];
        $totalItems = count($items);

        DB::transaction(function () use ($items, $reference, $entity, $ville, &$updatedConsumables) {
            foreach ($items as $item) {
                $consumable = Consumable::findOrFail($item['consumable_id']);
                
                $stockBefore = $consumable->stock_quantity;
                $quantityToAdd = $item['quantity'];
                $stockAfter = $stockBefore + $quantityToAdd;
                
                // Update consumable stock
                $consumable->stock_quantity = $stockAfter;
                $consumable->save();
                
                // Create stock movement record
                StockMovement::create([
                    'consumable_id' => $consumable->id,
                    'type' => 'in',
                    'reason' => 'stock_added',
                    'quantity' => $quantityToAdd,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                    'reference' => $reference,
                    'notes' => $item['notes'] ?? null,
                    'entity' => $entity,
                    'ville' => $ville
                ]);
                
                $updatedConsumables[] = [
                    'id' => $consumable->id,
                    'name' => $consumable->name,
                    'reference' => $consumable->reference,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                    'quantity_added' => $quantityToAdd
                ];
            }
        });

        return response()->json([
            'success' => true,
            'message' => "Stock mis à jour. {$totalItems} article(s) ajouté(s).",
            'data' => [
                'updated_consumables' => $updatedConsumables,
                'reference' => $reference,
                'total_items' => $totalItems
            ]
        ]);
    }

    public function removeStock(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.consumable_id' => 'required|exists:consumables,id',
            'items.*.quantity' => 'required|integer|min:1',
            'recipient' => 'required_without:user_id|string|max:255|nullable',
            'user_id' => 'required_without:recipient|exists:users,id|nullable',
            'notes' => 'nullable|string|max:1000'
        ]);

        $items = $validated['items'];
        $notes = $validated['notes'] ?? null;
        
        $userId = $validated['user_id'] ?? null;
        $recipient = $validated['recipient'] ?? null;
        $recipientMatricule = null;
        $entity = null;
        $ville = null;

        if ($userId) {
            $user = \App\Models\User::find($userId);
            if ($user) {
                $recipient = $user->name;
                $recipientMatricule = $user->matricule;
                $entity = $user->entity;
                $ville = $user->ville;
            }
        }

        // Validate stock availability before transaction
        foreach ($items as $item) {
            $consumable = Consumable::findOrFail($item['consumable_id']);
            if ($consumable->stock_quantity < $item['quantity']) {
                return response()->json([
                    'success' => false,
                    'message' => "Stock insuffisant pour {$consumable->name}. Disponible: {$consumable->stock_quantity}"
                ], 422);
            }
        }

        $dischargeReference = $this->generateDischargeReference();
        $dischargeItems = [];
        $updatedConsumables = [];
        $dischargeId = null;

        DB::transaction(function () use ($items, $recipient, $userId, $recipientMatricule, $entity, $ville, $notes, $dischargeReference, &$dischargeItems, &$updatedConsumables, &$dischargeId) {
            foreach ($items as $item) {
                $consumable = Consumable::findOrFail($item['consumable_id']);
                
                $stockBefore = $consumable->stock_quantity;
                $quantityToRemove = $item['quantity'];
                $stockAfter = $stockBefore - $quantityToRemove;
                
                // Update consumable stock
                $consumable->stock_quantity = $stockAfter;
                $consumable->save();
                
                // Create stock movement record
                StockMovement::create([
                    'consumable_id' => $consumable->id,
                    'type' => 'out',
                    'reason' => 'stock_exit',
                    'quantity' => -$quantityToRemove,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                    'reference' => $dischargeReference,
                    'notes' => null,
                    'recipient' => $recipient,
                    'entity' => $entity,
                    'ville' => $ville
                ]);
                
                $dischargeItems[] = [
                    'name' => $consumable->name,
                    'reference' => $consumable->reference,
                    'quantity' => $quantityToRemove
                ];
                
                $updatedConsumables[] = [
                    'id' => $consumable->id,
                    'name' => $consumable->name,
                    'reference' => $consumable->reference,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                    'quantity_removed' => $quantityToRemove
                ];
            }

            // Create discharge record
            $discharge = Discharge::create([
                'reference' => $dischargeReference,
                'recipient' => $recipient,
                'user_id' => $userId,
                'recipient_matricule' => $recipientMatricule,
                'entity' => $entity,
                'ville' => $ville,
                'items' => $dischargeItems,
                'notes' => $notes
            ]);

            // Generate PDF
            $dischargeService = new DischargeService();
            $pdfPath = $dischargeService->generatePDF($discharge);
            
            // Update discharge with PDF path
            $discharge->pdf_path = $pdfPath;
            $discharge->save();

            $dischargeId = $discharge->id;
        });

        return response()->json([
            'success' => true,
            'message' => 'Sortie de stock validée. Décharge générée avec succès.',
            'data' => [
                'discharge_id' => $dischargeId,
                'discharge_reference' => $dischargeReference,
                'recipient' => $recipient,
                'updated_consumables' => $updatedConsumables,
                'total_items' => count($items)
            ]
        ]);
    }

    private function generateDischargeReference(): string
    {
        $year = date('Y');
        $prefix = "DCH-{$year}-";
        
        $lastDischarge = Discharge::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();
        
        if ($lastDischarge) {
            $parts = explode('-', $lastDischarge->reference);
            $lastNumber = intval(end($parts));
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . str_pad($newNumber, 5, '0', STR_PAD_LEFT);
    }

    public function history(Request $request)
    {
        $query = StockMovement::with('consumable')->orderBy('created_at', 'desc');

        // Type filter
        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        // Consumable filter
        if ($request->filled('consumable_id')) {
            $query->where('consumable_id', $request->consumable_id);
        }

        // Date range filter
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('consumable', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        $movements = $query->paginate(20);

        // Calculate total in/out
        $totalIn = StockMovement::where('quantity', '>', 0)->sum('quantity');
        $totalOut = abs(StockMovement::where('quantity', '<', 0)->sum('quantity'));

        return response()->json([
            'success' => true,
            'data' => $movements,
            'meta' => [
                'total_in' => $totalIn,
                'total_out' => $totalOut,
            ]
        ]);
    }

    public function lowStock()
    {
        $items = Consumable::whereColumn('stock_quantity', '<=', 'threshold')
            ->orderBy('stock_quantity', 'asc')
            ->get();

        $ruptureCount = $items->where('stock_quantity', '<=', 0)->count();
        $critiqueCount = $items->where('stock_quantity', '>', 0)->count();

        $formattedItems = $items->map(function ($item) {
            return [
                'id' => $item->id,
                'name' => $item->name,
                'reference' => $item->reference,
                'stock_quantity' => $item->stock_quantity,
                'threshold' => $item->threshold,
                'unit' => $item->unit,
                'status' => $item->stock_quantity <= 0 ? 'rupture' : 'critique',
                'progress' => $item->threshold > 0
                    ? min(100, round(($item->stock_quantity / $item->threshold) * 100))
                    : 0,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formattedItems,
            'meta' => [
                'total_alerts' => $items->count(),
                'rupture' => $ruptureCount,
                'critique' => $critiqueCount,
            ]
        ]);
    }

    public function getEntitiesAndVilles()
    {
        $userEntities = \App\Models\User::whereNotNull('entity')->distinct()->pluck('entity');
        $userVilles = \App\Models\User::whereNotNull('ville')->distinct()->pluck('ville');
        
        $movementEntities = StockMovement::whereNotNull('entity')->distinct()->pluck('entity');
        $movementVilles = StockMovement::whereNotNull('ville')->distinct()->pluck('ville');

        $allEntities = $userEntities->concat($movementEntities)->unique()->values();
        $allVilles = $userVilles->concat($movementVilles)->unique()->values();

        return response()->json([
            'success' => true,
            'data' => [
                'entities' => $allEntities,
                'villes' => $allVilles
            ]
        ]);
    }
}
