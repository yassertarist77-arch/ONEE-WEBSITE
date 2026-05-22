<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index()
    {
        $users = User::withCount('tickets')
            ->orderBy('created_at', 'desc')
            ->get(['id', 'name', 'email', 'matricule', 'entity', 'ville', 'created_at']);
        
        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'matricule' => 'required|string|max:255|unique:users',
            'entity' => 'required|string',
            'ville' => 'nullable|string',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'matricule' => $validated['matricule'],
            'entity' => $validated['entity'] ?? null,
            'ville' => $validated['ville'] ?? null,
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur créé avec succès.',
            'data' => $user
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'matricule' => ['required', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'entity' => 'required|string',
            'ville' => 'nullable|string',
            'password' => 'nullable|string|min:6',
        ]);

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'matricule' => $validated['matricule'],
            'entity' => $validated['entity'] ?? $user->entity,
            'ville' => $validated['ville'] ?? $user->ville,
        ];

        if (!empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur mis à jour avec succès.',
            'data' => $user
        ]);
    }

    public function resetPassword($id)
    {
        $user = User::findOrFail($id);
        
        // Generate random 8-character password (letters + numbers)
        $newPassword = Str::random(8);

        $user->update([
            'password' => Hash::make($newPassword)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Mot de passe réinitialisé.',
            'new_password' => $newPassword
        ]);
    }

    public function destroy($id)
    {
        $user = User::withCount('tickets')->findOrFail($id);

        if ($user->tickets_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer cet utilisateur car il a des demandes.'
            ], 400);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur supprimé avec succès.'
        ]);
    }
}
