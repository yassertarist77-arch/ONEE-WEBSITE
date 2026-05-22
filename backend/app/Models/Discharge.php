<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Discharge extends Model
{
    protected $fillable = [
        'reference',
        'recipient',
        'recipient_matricule',
        'entity',
        'ville',
        'user_id',
        'status',
        'items',
        'notes',
        'pdf_path'
    ];

    protected function casts(): array
    {
        return ['items' => 'array'];
    }
}
