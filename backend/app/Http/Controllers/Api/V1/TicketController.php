<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Consumable;
use App\Models\Discharge;
use App\Models\Notification;
use App\Models\StockMovement;
use App\Models\Ticket;
use App\Models\TicketItem;
use App\Models\User;
use App\Services\DischargeService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class TicketController extends Controller
{
    public function index(Request $request)
    {
        $admin = $this->guardAdmin($request);

        $query = Ticket::with([
            'user:id,name,email',
            'discharge:id,reference',
            'ticketItems.consumable:id,name',
        ])->orderByDesc('created_at');

        if ($request->filled('status') && in_array($request->status, ['soumis', 'validé', 'refusé'], true)) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', '%'.$search.'%')
                    ->orWhereHas('user', function ($u) use ($search) {
                        $u->where('name', 'like', '%'.$search.'%')
                            ->orWhere('email', 'like', '%'.$search.'%');
                    });
            });
        }

        $pendingCount = Ticket::where('status', 'soumis')->count();
        $paginator     = $query->paginate(20)->through(fn (Ticket $t) => $this->ticketListPayload($t, false));

        return response()->json([
            'success'       => true,
            'pending_count' => $pendingCount,
            'meta'          => [
                'pending_count' => $pendingCount,
            ],
            'data' => $paginator,
        ]);
    }

    public function show(Request $request, int $id)
    {
        $actor = $request->user('sanctum');

        $ticket = Ticket::with([
            'user:id,name,email,matricule',
            'validatedBy:id,name,email',
            'ticketItems.consumable',
            'discharge',
        ])->find($id);

        if (! $ticket) {
            return response()->json(['success' => false, 'message' => 'Demande introuvable.'], 404);
        }

        if ($actor instanceof User && $ticket->user_id !== $actor->id) {
            return response()->json(['success' => false, 'message' => 'Non autorisé.'], 403);
        }

        if (! ($actor instanceof Admin) && ! ($actor instanceof User)) {
            return response()->json(['success' => false, 'message' => 'Non autorisé.'], 403);
        }

        return response()->json([
            'success' => true,
            'data'    => $this->ticketDetailPayload($ticket),
        ]);
    }

    public function approve(Request $request, int $id)
    {
        $admin = $this->guardAdmin($request);

        $payload = DB::transaction(function () use ($admin, $id) {
            $ticket = Ticket::whereKey($id)->lockForUpdate()->with(['ticketItems', 'user'])->first();

            if (! $ticket) {
                return ['not_found' => true];
            }

            if ($ticket->status !== 'soumis') {
                throw ValidationException::withMessages([
                    'ticket' => ['Cette demande ne peut plus être validée.'],
                ]);
            }

            $failed = [];
            foreach ($ticket->ticketItems as $item) {
                $consumable = Consumable::whereKey($item->consumable_id)->lockForUpdate()->first();
                if (! $consumable) {
                    $failed[] = ['consumable_id' => $item->consumable_id, 'reason' => 'Article introuvable.'];

                    continue;
                }
                if ($consumable->stock_quantity < $item->quantity_requested) {
                    $failed[] = [
                        'consumable_id' => $consumable->id,
                        'name'          => $consumable->name,
                        'requested'     => $item->quantity_requested,
                        'available'     => $consumable->stock_quantity,
                    ];
                }
            }

            if (count($failed) > 0) {
                throw new HttpResponseException(response()->json([
                    'success'      => false,
                    'message'      => 'Stock insuffisant pour un ou plusieurs articles.',
                    'failed_items' => $failed,
                ], 422));
            }

            $dischargeReference = $this->nextDischargeReference();
            $dischargeItems     = [];
            $recipient          = $ticket->user->name;

            foreach ($ticket->ticketItems as $item) {
                $consumable = Consumable::whereKey($item->consumable_id)->lockForUpdate()->first();
                $stockBefore = $consumable->stock_quantity;
                $qty         = $item->quantity_requested;
                $stockAfter  = $stockBefore - $qty;

                $consumable->stock_quantity = $stockAfter;
                $consumable->save();

                StockMovement::create([
                    'consumable_id' => $consumable->id,
                    'type'          => 'out',
                    'reason'        => 'ticket_approved',
                    'quantity'      => -$qty,
                    'stock_before'  => $stockBefore,
                    'stock_after'   => $stockAfter,
                    'reference'     => $dischargeReference,
                    'notes'         => 'Ticket '.$ticket->reference,
                    'recipient'     => $ticket->user->name,
                    'entity'        => $ticket->user->entity,
                    'ville'         => $ticket->user->ville,
                ]);

                $dischargeItems[] = [
                    'name'      => $consumable->name,
                    'reference' => $consumable->reference,
                    'quantity'  => $qty,
                ];
            }

            $notes = trim(($ticket->notes ? "Demande: {$ticket->notes}\n" : '').'Réf. ticket: '.$ticket->reference);

            $discharge = Discharge::create([
                'reference' => $dischargeReference,
                'recipient' => $recipient,
                'user_id'   => $ticket->user_id,
                'recipient_matricule' => $ticket->user->matricule,
                'entity'    => $ticket->user->entity,
                'ville'     => $ticket->user->ville,
                'items'     => $dischargeItems,
                'notes'     => $notes ?: null,
            ]);

            $pdfPath = (new DischargeService())->generatePDF($discharge);
            $discharge->pdf_path = $pdfPath;
            $discharge->save();

            $ticket->update([
                'status'       => 'validé',
                'validated_by' => $admin->id,
                'validated_at' => now(),
                'discharge_id' => $discharge->id,
            ]);

            $ticket->refresh();

            Notification::create([
                'user_id' => $ticket->user_id,
                'type'    => 'ticket_validé',
                'title'   => 'Demande validée',
                'message' => "Votre demande {$ticket->reference} a été validée. Décharge: {$discharge->reference}",
                'metadata' => [
                    'ticket_id'           => $ticket->id,
                    'discharge_id'        => $discharge->id,
                    'discharge_reference' => $discharge->reference,
                ],
            ]);

            return [
                'ticket_reference'    => $ticket->reference,
                'discharge_reference' => $discharge->reference,
                'discharge_id'        => $discharge->id,
            ];
        });

        if (($payload['not_found'] ?? false) === true) {
            return response()->json(['success' => false, 'message' => 'Demande introuvable.'], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Demande validée. Décharge générée.',
            'data'    => $payload,
        ]);
    }

    public function reject(Request $request, int $id)
    {
        $admin = $this->guardAdmin($request);

        $validated = $request->validate([
            'rejection_reason' => 'required|string|min:3|max:5000',
        ]);

        $ticket = Ticket::find($id);

        if (! $ticket) {
            return response()->json(['success' => false, 'message' => 'Demande introuvable.'], 404);
        }

        if ($ticket->status !== 'soumis') {
            throw ValidationException::withMessages([
                'ticket' => ['Cette demande ne peut plus être refusée.'],
            ]);
        }

        $reason = $validated['rejection_reason'];

        $ticket->update([
            'status'            => 'refusé',
            'rejection_reason'  => $reason,
            'validated_by'      => $admin->id,
            'validated_at'      => now(),
        ]);

        Notification::create([
            'user_id' => $ticket->user_id,
            'type'    => 'ticket_refusé',
            'title'   => 'Demande refusée',
            'message' => "Votre demande {$ticket->reference} a été refusée. Motif: {$reason}",
            'metadata' => [
                'ticket_id'        => $ticket->id,
                'rejection_reason' => $reason,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Demande refusée.',
            'data'    => $this->ticketDetailPayload($ticket->fresh()->load(['user:id,name,email,matricule', 'validatedBy:id,name', 'ticketItems.consumable', 'discharge'])),
        ]);
    }

    public function store(Request $request)
    {
        $user = $this->guardUser($request);

        $validated = $request->validate([
            'items'            => 'required|array|min:1',
            'items.*.consumable_id' => 'required|integer|exists:consumables,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes'            => 'nullable|string|max:5000',
        ]);

        $items = $validated['items'];
        $notes = $validated['notes'] ?? null;

        $merged = [];
        foreach ($items as $row) {
            $cid = (int) $row['consumable_id'];
            $merged[$cid] = ($merged[$cid] ?? 0) + (int) $row['quantity'];
        }
        $items = collect($merged)->map(fn (int $qty, int $cid) => [
            'consumable_id' => $cid,
            'quantity'      => $qty,
        ])->values()->all();

        $consumableIds = collect($items)->pluck('consumable_id')->unique()->values();
        $consumables   = Consumable::whereIn('id', $consumableIds)->get()->keyBy('id');

        foreach ($items as $row) {
            $c = $consumables->get($row['consumable_id']);
            if (! $c || ! $c->is_active) {
                throw ValidationException::withMessages([
                    'items' => ["L'article #{$row['consumable_id']} n'est pas disponible."],
                ]);
            }
            if ($c->stock_quantity <= 0) {
                throw ValidationException::withMessages([
                    'items' => ["Stock indisponible pour « {$c->name} »."],
                ]);
            }
            if ($row['quantity'] > $c->stock_quantity) {
                throw ValidationException::withMessages([
                    'items' => ["Quantité trop élevée pour « {$c->name} » (max {$c->stock_quantity})."],
                ]);
            }
        }

        $ticket = DB::transaction(function () use ($user, $items, $notes) {
            $ref = $this->nextTicketReference();

            $ticket = Ticket::create([
                'reference' => $ref,
                'user_id'   => $user->id,
                'status'    => 'soumis',
                'notes'     => $notes,
            ]);

            foreach ($items as $row) {
                TicketItem::create([
                    'ticket_id'           => $ticket->id,
                    'consumable_id'       => $row['consumable_id'],
                    'quantity_requested'  => $row['quantity'],
                ]);
            }

            return $ticket->load('ticketItems.consumable');
        });

        return response()->json([
            'success' => true,
            'message' => 'Demande enregistrée.',
            'data'    => $this->ticketDetailPayload($ticket->load(['user:id,name,email,matricule', 'ticketItems.consumable'])),
        ], 201);
    }

    public function destroy(Request $request, int $id)
    {
        $actor = $request->user('sanctum');

        $ticket = Ticket::find($id);

        if (! $ticket) {
            return response()->json(['success' => false, 'message' => 'Demande introuvable.'], 404);
        }

        // Only allow owner to delete
        if ($actor instanceof User && $ticket->user_id !== $actor->id) {
            return response()->json(['success' => false, 'message' => 'Non autorisé.'], 403);
        }

        // Only allow delete if status is 'soumis'
        if ($ticket->status !== 'soumis') {
            return response()->json(['success' => false, 'message' => 'Seules les demandes en attente peuvent être annulées.'], 400);
        }

        DB::transaction(function () use ($ticket) {
            // Delete related items first (or they'll be deleted by cascade if defined)
            $ticket->ticketItems()->delete();
            $ticket->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Demande annulée avec succès.',
        ]);
    }

    public function update(Request $request, int $id)
    {
        $user = $this->guardUser($request);
        $ticket = Ticket::where('user_id', $user->id)->where('id', $id)->first();

        if (!$ticket) {
            return response()->json(['success' => false, 'message' => 'Demande introuvable.'], 404);
        }

        if ($ticket->status !== 'soumis') {
            return response()->json(['success' => false, 'message' => 'Seules les demandes en attente peuvent être modifiées.'], 400);
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.consumable_id' => 'required|integer|exists:consumables,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:5000',
        ]);

        $items = $validated['items'];
        $notes = $validated['notes'] ?? null;

        $merged = [];
        foreach ($items as $row) {
            $cid = (int) $row['consumable_id'];
            $merged[$cid] = ($merged[$cid] ?? 0) + (int) $row['quantity'];
        }
        $items = collect($merged)->map(fn (int $qty, int $cid) => [
            'consumable_id' => $cid,
            'quantity'      => $qty,
        ])->values()->all();

        $consumableIds = collect($items)->pluck('consumable_id')->unique()->values();
        $consumables   = Consumable::whereIn('id', $consumableIds)->get()->keyBy('id');

        foreach ($items as $row) {
            $c = $consumables->get($row['consumable_id']);
            if (!$c || !$c->is_active) {
                throw ValidationException::withMessages([
                    'items' => ["L'article #{$row['consumable_id']} n'est pas disponible."],
                ]);
            }
            if ($c->stock_quantity <= 0) {
                throw ValidationException::withMessages([
                    'items' => ["Stock indisponible pour « {$c->name} »."],
                ]);
            }
            if ($row['quantity'] > $c->stock_quantity) {
                throw ValidationException::withMessages([
                    'items' => ["Quantité trop élevée pour « {$c->name} » (max {$c->stock_quantity})."],
                ]);
            }
        }

        DB::transaction(function () use ($ticket, $items, $notes) {
            $ticket->update(['notes' => $notes]);
            $ticket->ticketItems()->delete();
            foreach ($items as $row) {
                TicketItem::create([
                    'ticket_id' => $ticket->id,
                    'consumable_id' => $row['consumable_id'],
                    'quantity_requested' => $row['quantity'],
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Demande modifiée avec succès.',
            'data' => $this->ticketDetailPayload($ticket->fresh()->load(['user:id,name,email,matricule', 'ticketItems.consumable'])),
        ]);
    }

    public function myTickets(Request $request)
    {
        $user = $this->guardUser($request);

        $query = Ticket::where('user_id', $user->id)
            ->with(['ticketItems.consumable:id,name,reference'])
            ->orderByDesc('created_at');

        if ($request->filled('status') && in_array($request->status, ['soumis', 'validé', 'refusé'], true)) {
            $query->where('status', $request->status);
        }

        $paginator = $query->paginate(15)->through(fn (Ticket $t) => $this->ticketListPayload($t, true));

        return response()->json([
            'success' => true,
            'data'    => $paginator,
        ]);
    }

    public function downloadMyDischarge(Request $request, int $dischargeId)
    {
        $user = $this->guardUser($request);

        $ticket = Ticket::where('user_id', $user->id)
            ->where('discharge_id', $dischargeId)
            ->first();

        if (! $ticket) {
            return response()->json(['success' => false, 'message' => 'Décharge introuvable.'], 404);
        }

        $discharge = Discharge::find($dischargeId);

        if (! $discharge) {
            return response()->json(['success' => false, 'message' => 'Décharge introuvable.'], 404);
        }

        $pdfPath = (new DischargeService())->generatePDF($discharge);
        $discharge->forceFill(['pdf_path' => $pdfPath])->save();

        $filePath = Storage::disk('public')->path($pdfPath);
        if (! is_file($filePath)) {
            return response()->json(['success' => false, 'message' => 'Impossible de générer le PDF.'], 500);
        }

        $filename = "decharge_{$discharge->reference}.pdf";

        return response()->file($filePath, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function guardAdmin(Request $request): Admin
    {
        $u = $request->user('sanctum');
        if (! $u instanceof Admin) {
            abort(403, 'Accès administrateur requis.');
        }

        return $u;
    }

    private function guardUser(Request $request): User
    {
        $u = $request->user('sanctum');
        if (! $u instanceof User) {
            abort(403, 'Accès agent requis.');
        }

        return $u;
    }

    private function ticketListPayload(Ticket $t, bool $includeItems = false): array
    {
        $t->loadMissing('user:id,name,email', 'discharge:id,reference', 'ticketItems.consumable:id,name');
        $itemsCount = $t->ticketItems?->count() ?? 0;
        $summary     = '';
        if ($t->relationLoaded('ticketItems') && $t->ticketItems->isNotEmpty()) {
            $summary = $t->ticketItems->map(fn ($i) => ($i->consumable->name ?? '?').' ×'.$i->quantity_requested)->implode(', ');
        } elseif ($itemsCount === 0) {
            $summary = '—';
        } else {
            $summary = $itemsCount.' article(s)';
        }

        $payload = [
            'id'                  => $t->id,
            'reference'           => $t->reference,
            'status'              => $t->status,
            'notes'               => $t->notes,
            'rejection_reason'    => $t->rejection_reason,
            'created_at'          => $t->created_at?->toIso8601String(),
            'validated_at'        => $t->validated_at?->toIso8601String(),
            'user'                => $t->user ? ['id' => $t->user->id, 'name' => $t->user->name, 'email' => $t->user->email] : null,
            'items_count'         => $itemsCount,
            'items_summary'       => $summary,
            'discharge_reference' => $t->discharge?->reference,
            'discharge_id'        => $t->discharge_id,
        ];

        if ($includeItems && $t->relationLoaded('ticketItems')) {
            $payload['items'] = $t->ticketItems->map(fn (TicketItem $i) => [
                'id'                 => $i->id,
                'quantity_requested' => $i->quantity_requested,
                'consumable'         => $i->consumable ? [
                    'id'        => $i->consumable->id,
                    'name'      => $i->consumable->name,
                    'reference' => $i->consumable->reference,
                ] : null,
            ])->values()->all();
        }

        return $payload;
    }

    private function ticketDetailPayload(Ticket $t): array
    {
        $base = $this->ticketListPayload($t, true);
        $base['validated_by'] = $t->validatedBy ? [
            'id'   => $t->validatedBy->id,
            'name' => $t->validatedBy->name,
        ] : null;
        $base['items'] = $t->ticketItems->map(fn (TicketItem $i) => [
            'id'                 => $i->id,
            'quantity_requested' => $i->quantity_requested,
            'consumable'         => $i->consumable ? [
                'id'              => $i->consumable->id,
                'name'            => $i->consumable->name,
                'reference'       => $i->consumable->reference,
                'unit'            => $i->consumable->unit,
                'stock_quantity'  => $i->consumable->stock_quantity,
            ] : null,
        ])->values()->all();

        $base['discharge'] = $t->discharge ? [
            'id'         => $t->discharge->id,
            'reference'  => $t->discharge->reference,
            'recipient'  => $t->discharge->recipient,
            'created_at' => $t->discharge->created_at?->toIso8601String(),
        ] : null;

        return $base;
    }

    private function nextTicketReference(): string
    {
        $year   = date('Y');
        $prefix = "TKT-{$year}-";
        $last   = Ticket::whereYear('created_at', $year)->orderByDesc('id')->first();
        $n      = 1;
        if ($last && preg_match('/-(\d+)$/', $last->reference, $m)) {
            $n = (int) $m[1] + 1;
        }

        return $prefix.str_pad((string) $n, 5, '0', STR_PAD_LEFT);
    }

    private function nextDischargeReference(): string
    {
        $year = date('Y');
        $prefix = "DCH-{$year}-";
        $last = Discharge::whereYear('created_at', $year)->orderByDesc('id')->first();
        $n = 1;
        if ($last && preg_match('/-(\d+)$/', $last->reference, $m)) {
            $n = (int) $m[1] + 1;
        }

        return $prefix.str_pad((string) $n, 5, '0', STR_PAD_LEFT);
    }
}
