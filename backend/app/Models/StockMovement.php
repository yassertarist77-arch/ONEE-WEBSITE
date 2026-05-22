<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    protected $fillable = [
        'consumable_id',
        'type',
        'quantity',
        'reason',
        'stock_before',
        'stock_after',
        'reference',
        'user_id',
        'recipient',
        'entity',
        'ville',
        'notes'
    ];

    public function consumable()
    {
        return $this->belongsTo(Consumable::class);
    }
}
