<?php
namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        Admin::create([
            'name' => 'System Admin',
            'email' => 'yassertarist99@gmail.com',
            'password' => 'yasser123',
        ]);
        
    }
}
