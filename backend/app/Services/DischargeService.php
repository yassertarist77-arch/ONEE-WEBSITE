<?php
namespace App\Services;

use App\Models\Discharge;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

class DischargeService
{
    public function generatePDF(Discharge $discharge): string
    {
        $data = [
            'discharge' => $discharge,
            'date' => Carbon::parse($discharge->created_at)->format('d/m/Y à H:i'),
            'items' => $discharge->items,
        ];

        $pdf = Pdf::loadView('pdf.discharge', $data);
        $pdf->setPaper('A4', 'portrait');

        $filename = "decharge_{$discharge->reference}.pdf";
        $path = "discharges/{$filename}";
        $fullPath = storage_path("app/public/{$path}");

        // Ensure directory exists
        $directory = dirname($fullPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $pdf->save($fullPath);

        return $path;
    }
}
