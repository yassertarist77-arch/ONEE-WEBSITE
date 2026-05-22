<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Consumable;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ExportController extends Controller
{
    public function exportDatabase()
    {
        $databasePath = database_path('database.sqlite');
        
        if (!file_exists($databasePath)) {
            return response()->json([
                'success' => false,
                'message' => 'Base de données non trouvée.'
            ], 404);
        }

        $filename = 'ONEE_backup_' . Carbon::now()->format('Y-m-d_H-i-s') . '.sqlite';

        return response()->file($databasePath, [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function exportCSV()
    {
        $consumables = Consumable::orderBy('name')->get();

        $filename = 'ONEE_consommables_' . Carbon::now()->format('Y-m-d') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
        ];

        $callback = function () use ($consumables) {
            $file = fopen('php://output', 'w');
            
            // BOM for UTF-8
            fprintf($file, "\xEF\xBB\xBF");
            
            // Headers
            fputcsv($file, ['Référence', 'Nom', 'Stock', 'Seuil', 'Unité', 'Statut']);
            
            foreach ($consumables as $item) {
                $status = $item->stock_quantity <= 0 
                    ? 'Rupture' 
                    : ($item->stock_quantity <= $item->threshold ? 'Critique' : 'En stock');
                
                fputcsv($file, [
                    $item->reference,
                    $item->name,
                    $item->stock_quantity,
                    $item->threshold,
                    $item->unit,
                    $status,
                ]);
            }
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
