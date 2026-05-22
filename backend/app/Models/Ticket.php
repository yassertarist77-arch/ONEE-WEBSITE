<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    protected $fillable = [
        'reference',
        'user_id',
        'status',
        'notes',
        'rejection_reason',
        'validated_by',
        'validated_at',
        'discharge_id',
    ];

    protected function casts(): array
    {
        return [
            'validated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'validated_by');
    }

    public function ticketItems(): HasMany
    {
        return $this->hasMany(TicketItem::class);
    }

    public function discharge(): BelongsTo
    {
        return $this->belongsTo(Discharge::class);
    }
}
