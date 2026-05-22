<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Remove stale row so password is never left wrong (e.g. double-hashed or plain).
        User::where('email', 'mohammed.alami@onee.ma')->delete();

        User::create([
            'name'      => 'Mohammed Alami',
            'email'     => 'mohammed.alami@onee.ma',
            'password'  => 'user123', // plain: User model casts password as 'hashed'
            'matricule' => 'M10001',
        ]);
    }
}

