// Consulta de estoque (fonte da verdade no PostgreSQL).
//
// A baixa de estoque NÃO fica aqui: ela acontece somente dentro
// da transação do checkout (OrderService).

import { HttpError } from "../../../shared/http";

import { InventoryRepository } from "./inventory.repository";
import { toStockLevel, type StockLevel } from "./inventory.types";

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  async getStock(productId: string): Promise<StockLevel> {
    const [row] = await this.repository.findByIds([productId]);

    if (!row) {
      throw new HttpError(404, "Produto sem estoque cadastrado.");
    }

    return toStockLevel(row);
  }

  async getStocks(productIds: unknown): Promise<StockLevel[]> {
    if (
      !Array.isArray(productIds) ||
      productIds.length === 0 ||
      productIds.length > 100 ||
      !productIds.every((id) => typeof id === "string" && id.trim())
    ) {
      throw new HttpError(400, "Informe um array de 1 a 100 IDs de produto.");
    }

    const rows = await this.repository.findByIds(productIds);

    return rows.map(toStockLevel);
  }
}
