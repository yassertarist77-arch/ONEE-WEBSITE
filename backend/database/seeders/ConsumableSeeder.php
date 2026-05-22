<?php
namespace Database\Seeders;

use App\Models\Consumable;
use Illuminate\Database\Seeder;

class ConsumableSeeder extends Seeder
{
    public function run(): void
    {
        $consumables = [
            // Câbles Réseau (category_id: 1)
            ['name' => 'Câble RJ45 - 1m', 'reference' => 'CAB-001', 'stock_quantity' => 45, 'threshold' => 10, 'unit' => 'pièce'],
            ['name' => 'Câble RJ45 - 3m', 'reference' => 'CAB-002', 'stock_quantity' => 32, 'threshold' => 10, 'unit' => 'pièce'],
            ['name' => 'Câble RJ45 - 5m', 'reference' => 'CAB-003', 'stock_quantity' => 28, 'threshold' => 10, 'unit' => 'pièce'],
            ['name' => 'Câble RJ45 - 10m', 'reference' => 'CAB-004', 'stock_quantity' => 15, 'threshold' => 5, 'unit' => 'pièce'],
            
            // Câbles USB (category_id: 2)
            ['name' => 'Câble USB Imprimante - 2m', 'reference' => 'USB-001', 'stock_quantity' => 20, 'threshold' => 5, 'unit' => 'pièce'],
            ['name' => 'Câble USB Imprimante - 5m', 'reference' => 'USB-002', 'stock_quantity' => 12, 'threshold' => 5, 'unit' => 'pièce'],
            
            // Toners (category_id: 3)
            ['name' => 'Toner HP 26A', 'reference' => 'TON-001', 'stock_quantity' => 0, 'threshold' => 5, 'unit' => 'pièce'],
            ['name' => 'Toner HP 85A', 'reference' => 'TON-002', 'stock_quantity' => 3, 'threshold' => 5, 'unit' => 'pièce'],
            ['name' => 'Toner HP 12A', 'reference' => 'TON-003', 'stock_quantity' => 8, 'threshold' => 5, 'unit' => 'pièce'],
            ['name' => 'Toner Canon 057', 'reference' => 'TON-004', 'stock_quantity' => 14, 'threshold' => 5, 'unit' => 'pièce'],
            ['name' => 'Toner Samsung MLT-D111S', 'reference' => 'TON-005', 'stock_quantity' => 6, 'threshold' => 5, 'unit' => 'pièce'],
            
            // Unités de maintenance (category_id: 4)
            ['name' => 'Unité maintenance HP M402', 'reference' => 'MAINT-001', 'stock_quantity' => 4, 'threshold' => 2, 'unit' => 'pièce'],
            ['name' => 'Unité maintenance Canon IR', 'reference' => 'MAINT-002', 'stock_quantity' => 3, 'threshold' => 2, 'unit' => 'pièce'],
            
            // Drums (category_id: 5)
            ['name' => 'Tambour HP 26A', 'reference' => 'DRUM-001', 'stock_quantity' => 2, 'threshold' => 2, 'unit' => 'pièce'],
            ['name' => 'Tambour Canon 057', 'reference' => 'DRUM-002', 'stock_quantity' => 5, 'threshold' => 2, 'unit' => 'pièce'],
            ['name' => 'Tambour Samsung MLT-R111', 'reference' => 'DRUM-003', 'stock_quantity' => 1, 'threshold' => 2, 'unit' => 'pièce'],
            
            // Souris (category_id: 6)
            ['name' => 'Souris USB standard', 'reference' => 'SOU-001', 'stock_quantity' => 35, 'threshold' => 10, 'unit' => 'pièce'],
            ['name' => 'Souris sans fil', 'reference' => 'SOU-002', 'stock_quantity' => 18, 'threshold' => 5, 'unit' => 'pièce'],
            
            // Claviers (category_id: 7)
            ['name' => 'Clavier USB standard', 'reference' => 'CLA-001', 'stock_quantity' => 25, 'threshold' => 8, 'unit' => 'pièce'],
            ['name' => 'Clavier sans fil', 'reference' => 'CLA-002', 'stock_quantity' => 12, 'threshold' => 5, 'unit' => 'pièce'],
            
            // CD-ROM (category_id: 8)
            ['name' => 'CD-ROM 700MB (boîte 50)', 'reference' => 'CD-001', 'stock_quantity' => 10, 'threshold' => 3, 'unit' => 'boîte'],
            
            // DVD-ROM (category_id: 9)
            ['name' => 'DVD-ROM 4.7GB (boîte 50)', 'reference' => 'DVD-001', 'stock_quantity' => 8, 'threshold' => 3, 'unit' => 'boîte'],
        ];

        foreach ($consumables as $consumable) {
            Consumable::create($consumable);
        }
    }
}
