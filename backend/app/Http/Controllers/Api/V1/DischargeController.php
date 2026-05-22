<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Discharge;
use App\Models\Consumable;
use App\Models\StockMovement;
use App\Services\DischargeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class DischargeController extends Controller
{
    public function index(Request $request)
    {
        $query = Discharge::where('status', '!=', 'cancelled')
                          ->orderBy('created_at', 'desc');
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhere('recipient', 'like', "%{$search}%")
                  ->orWhere('recipient_matricule', 'like', "%{$search}%")
                  ->orWhere('entity', 'like', "%{$search}%");
            });
        }
        
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        
        $discharges = $query->paginate(15);
        
        // Transform data to include items count and total quantity
        $discharges->getCollection()->transform(function ($discharge) {
            $discharge->items_count = count($discharge->items);
            $discharge->total_quantity = collect($discharge->items)->sum(fn ($i) => (int) ($i['quantity'] ?? 0));
            return $discharge;
        });

        return response()->json([
            'success' => true,
            'data' => $discharges
        ]);
    }

    public function show($id)
    {
        $discharge = Discharge::find($id);
        
        if (!$discharge) {
            return response()->json([
                'success' => false,
                'message' => 'Décharge non trouvée.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $discharge
        ]);
    }

    public function download($id)
    {
        $discharge = Discharge::find($id);

        if (! $discharge) {
            return response()->json([
                'success' => false,
                'message' => 'Décharge non trouvée.',
            ], 404);
        }

        // Always rebuild PDF from the current Blade template (avoids stale files on disk).
        $pdfPath = (new DischargeService())->generatePDF($discharge);
        $discharge->forceFill(['pdf_path' => $pdfPath])->save();

        $filePath = Storage::disk('public')->path($pdfPath);
        if (! is_file($filePath)) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de générer le PDF.',
            ], 500);
        }

        $filename = "decharge_{$discharge->reference}.pdf";

        return response()->file($filePath, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function cancel($id)
    {
        $discharge = Discharge::find($id);

        if (!$discharge) {
            return response()->json([
                'success' => false,
                'message' => 'Décharge non trouvée.'
            ], 404);
        }

        if ($discharge->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'Cette décharge est déjà annulée.'
            ], 400);
        }

        try {
            DB::transaction(function () use ($discharge) {
                // Return items to stock
                foreach ($discharge->items as $item) {
                    // Les items dans la décharge n'ont pas d'ID, mais une référence unique
                    $consumable = Consumable::where('reference', $item['reference'] ?? '')->first();
                    
                    if ($consumable) {
                        $stockBefore = $consumable->stock_quantity;
                        $consumable->increment('stock_quantity', $item['quantity']);
                        
                        StockMovement::create([
                            'consumable_id' => $consumable->id,
                            'type' => 'in',
                            'quantity' => $item['quantity'],
                            'reason' => 'discharge_cancelled',
                            'stock_before' => $stockBefore,
                            'stock_after' => $stockBefore + $item['quantity'],
                            'reference' => $discharge->reference,
                            'user_id' => request()->user()->id, // Admin who cancelled
                            'notes' => 'Annulation de la décharge ' . $discharge->reference
                        ]);
                    }
                }

                // Update discharge status
                $discharge->update(['status' => 'cancelled']);
            });

            return response()->json([
                'success' => true,
                'message' => 'Décharge annulée. Stock restauré.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'annulation : ' . $e->getMessage()
            ], 500);
        }
    }
}
