<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $this->guardUser($request);

        $unreadCount = Notification::where('user_id', $user->id)->where('is_read', false)->count();

        $paginator = Notification::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate(20)
            ->through(fn (Notification $n) => $this->payload($n));

        return response()->json([
            'success' => true,
            'data'    => $paginator,
            'meta'    => [
                'unread_count' => $unreadCount,
            ],
        ]);
    }

    public function unreadCount(Request $request)
    {
        $user = $this->guardUser($request);

        $count = Notification::where('user_id', $user->id)->where('is_read', false)->count();

        return response()->json([
            'unread_count' => $count,
        ]);
    }

    public function markAsRead(Request $request, int $id)
    {
        $user = $this->guardUser($request);

        $notification = Notification::where('user_id', $user->id)->whereKey($id)->first();

        if (! $notification) {
            return response()->json(['success' => false, 'message' => 'Notification introuvable.'], 404);
        }

        $notification->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'data'    => $this->payload($notification->fresh()),
        ]);
    }

    public function markAllAsRead(Request $request)
    {
        $user = $this->guardUser($request);

        Notification::where('user_id', $user->id)->where('is_read', false)->update(['is_read' => true]);

        return response()->json(['success' => true]);
    }

    private function guardUser(Request $request): User
    {
        $u = $request->user('sanctum');
        if (! $u instanceof User) {
            abort(403, 'Accès agent requis.');
        }

        return $u;
    }

    private function payload(Notification $n): array
    {
        return [
            'id'         => $n->id,
            'type'       => $n->type,
            'title'      => $n->title,
            'message'    => $n->message,
            'is_read'    => (bool) $n->is_read,
            'metadata'   => $n->metadata,
            'created_at' => $n->created_at?->toIso8601String(),
        ];
    }
}
