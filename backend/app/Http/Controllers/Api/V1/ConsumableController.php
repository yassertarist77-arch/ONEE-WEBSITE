<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Consumable;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ConsumableController extends Controller
{
    public function index(Request $request)
    {
        $query = Consumable::latest();
        
        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%");
            });
        }
        

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }
        
        // Status filter
        if ($request->filled('status')) {
            switch ($request->status) {
                case 'en_stock':
                    $query->where('stock_quantity', '>', 0)
                          ->where('stock_quantity', '>=', \DB::raw('threshold'));
                    break;
                case 'critique':
                    $query->where('stock_quantity', '>', 0)
                          ->where('stock_quantity', '<', \DB::raw('threshold'));
                    break;
                case 'rupture':
                    $query->where('stock_quantity', '<=', 0);
                    break;
            }
        }
        
        // Order by name ascending
        $consumables = $query->orderBy('name', 'asc')->paginate(15);
        
        return response()->json([
            'success' => true,
            'data' => $consumables
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'reference' => 'required|string|max:100|unique:consumables,reference',
            'stock_quantity' => 'required|integer|min:0',
            'threshold' => 'required|integer|min:0',
            'unit' => 'nullable|string|max:50'
        ]);

        $consumable = Consumable::create($validated);

        // Create initial stock movement if stock > 0
        if ($consumable->stock_quantity > 0) {
            StockMovement::create([
                'consumable_id' => $consumable->id,
                'type' => 'in',
                'reason' => 'stock_initial',
                'quantity' => $consumable->stock_quantity,
                'stock_before' => 0,
                'stock_after' => $consumable->stock_quantity,
                'reference' => $consumable->reference,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $consumable,
            'message' => 'Consommable créé avec succès.'
        ], 201);
    }

    public function show($id)
    {
        $consumable = Consumable::with(['stockMovements' => function ($query) {
            $query->latest()->limit(10);
        }])->find($id);
        
        if (!$consumable) {
            return response()->json([
                'success' => false,
                'message' => 'Consommable non trouvé.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $consumable
        ]);
    }

    public function update(Request $request, $id)
    {
        $consumable = Consumable::find($id);
        
        if (!$consumable) {
            return response()->json([
                'success' => false,
                'message' => 'Consommable non trouvé.'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'reference' => 'required|string|max:100|unique:consumables,reference,' . $id,
            'stock_quantity' => 'required|integer|min:0',
            'threshold' => 'required|integer|min:0',
            'unit' => 'nullable|string|max:50'
        ]);

        $consumable->update($validated);

        return response()->json([
            'success' => true,
            'data' => $consumable,
            'message' => 'Consommable mis à jour avec succès.'
        ]);
    }

    public function destroy($id)
    {
        $consumable = Consumable::find($id);
        
        if (!$consumable) {
            return response()->json([
                'success' => false,
                'message' => 'Consommable non trouvé.'
            ], 404);
        }

        // Check if stock is zero
        if ($consumable->stock_quantity > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer ce consommable car il a du stock. Veuillez d\'abord vider le stock.'
            ], 422);
        }

        // Check if has stock movements
        $hasMovements = StockMovement::where('consumable_id', $id)->exists();
        
        if ($hasMovements) {
            // Deactivate instead of delete
            $consumable->update(['is_active' => false]);
            
            return response()->json([
                'success' => false,
                'message' => 'Consommable désactivé car il a un historique de mouvements.'
            ]);
        }

        $consumable->delete();

        return response()->json([
            'success' => true,
            'message' => 'Consommable supprimé avec succès.'
        ]);
    }
}
