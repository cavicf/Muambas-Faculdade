// Linha da tabela inventory (fonte da verdade do estoque).
export interface InventoryRow {
  product_id: string;
  quantity_available: number;
  updated_at: Date;
}

export interface StockLevel {
  productId: string;
  quantityAvailable: number;
  updatedAt: string;
}

export function toStockLevel(row: InventoryRow): StockLevel {
  return {
    productId: row.product_id,
    quantityAvailable: row.quantity_available,
    updatedAt: row.updated_at.toISOString()
  };
}
