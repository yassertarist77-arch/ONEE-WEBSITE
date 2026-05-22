<?php
namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Câbles Réseau (RJ45)', 'description' => null],
            ['name' => 'Câbles USB', 'description' => null],
            ['name' => 'Toners', 'description' => null],
            ['name' => 'Unités de maintenance', 'description' => null],
            ['name' => 'Drums (tambours)', 'description' => null],
            ['name' => 'Souris', 'description' => null],
            ['name' => 'Claviers', 'description' => null],
            ['name' => 'CD-ROM', 'description' => null],
            ['name' => 'DVD-ROM', 'description' => null],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}
