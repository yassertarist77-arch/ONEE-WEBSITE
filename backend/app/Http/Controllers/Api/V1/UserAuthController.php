<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserAuthController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $email    = mb_strtolower(trim($validated['email']));
        $password = trim($validated['password']);

        $user = User::whereRaw('lower(email) = ?', [$email])->first();

        if (!$user || !Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants invalides.'],
            ]);
        }

        $token = $user->createToken('user-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token'   => $token,
            'user'    => [
                'id'        => $user->id,
                'name'      => $user->name,
                'email'     => $user->email,
                'matricule' => $user->matricule,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user('sanctum')->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Déconnecté avec succès.',
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user('sanctum');

        return response()->json([
            'success' => true,
            'user'    => [
                'id'        => $user->id,
                'name'      => $user->name,
                'email'     => $user->email,
                'matricule' => $user->matricule,
            ],
        ]);
    }

    public function adminIndex()
    {
        // For admin dropdown to select recipient
        $users = User::select('id', 'name', 'matricule', 'email')->get();
        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }
}
