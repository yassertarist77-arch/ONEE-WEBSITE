<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Consumable extends Model
{
    protected $fillable = [
        'name', 'reference', 
        'stock_quantity', 'threshold', 'unit', 'is_active'
    ];

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function ticketItems(): HasMany
    {
        return $this->hasMany(TicketItem::class);
    }

    public function getStockStatusAttribute(): string
    {
        if ($this->stock_quantity <= 0) return 'rupture';
        if ($this->stock_quantity <= $this->threshold) return 'critique';
        return 'en_stock';
    }
}
