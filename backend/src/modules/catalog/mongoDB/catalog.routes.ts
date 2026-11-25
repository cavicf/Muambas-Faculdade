import { Router } from "express";
import { CatalogService } from "./catalog.service";
import type { ProductFilters } from "./product.types";

// Erros de parâmetros recebidos pela API
class InvalidRequestError extends Error {}

function validateOptionalString(
  value: unknown,
  field: string
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new InvalidRequestError(`${field} inválido.`);
  }

  return value.trim() || undefined;
}

function validateOptionalNumber(
  value: unknown,
  field: string
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new InvalidRequestError(`${field} inválido.`);
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new InvalidRequestError(`${field} inválido.`);
  }

  return number;
}

export function createCatalogRoutes(service: CatalogService) {
  const router = Router();

  // Listar, pesquisar e filtrar produtos
  router.get("/products", async (req, res) => {
    try {
      const priceOrder = validateOptionalString(
        req.query.priceOrder,
        "priceOrder"
      );

      if (
        priceOrder !== undefined &&
        priceOrder !== "asc" &&
        priceOrder !== "desc"
      ) {
        throw new InvalidRequestError("Ordenação inválida.");
      }

      const filters: ProductFilters = {
        category: validateOptionalString(req.query.category, "category"),
        brand: validateOptionalString(req.query.brand, "brand"),
        search: validateOptionalString(req.query.search, "search"),
        minPrice: validateOptionalNumber(req.query.minPrice, "minPrice"),
        maxPrice: validateOptionalNumber(req.query.maxPrice, "maxPrice"),
        priceOrder
      };

      if (
        (filters.minPrice !== undefined && filters.minPrice < 0) ||
        (filters.maxPrice !== undefined && filters.maxPrice < 0) ||
        (filters.minPrice !== undefined &&
          filters.maxPrice !== undefined &&
          filters.minPrice > filters.maxPrice)
      ) {
        throw new InvalidRequestError("Faixa de preço inválida.");
      }

      const products = await service.getProducts(filters);

      res.json(products);
    } catch (error) {
      if (error instanceof InvalidRequestError) {
        res.status(400).json({ error: error.message });
        return;
      }

      console.error(error);

      res.status(500).json({
        error: "Erro ao consultar produtos."
      });
    }
  });

  // Buscar vários produtos pelos IDs
  router.post("/products/batch", async (req, res) => {
    try {
      const ids = req.body?.ids;

      if (
        !Array.isArray(ids) ||
        ids.length > 100 ||
        !ids.every((id) => typeof id === "string" && id.trim().length > 0)
      ) {
        res.status(400).json({
          error: "Informe um array válido de IDs."
        });

        return;
      }

      const products = await service.getProductsByIds(ids);

      res.json(products);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao consultar produtos."
      });
    }
  });

  // Buscar produto por ID
  router.get("/products/:id", async (req, res) => {
    try {
      const product = await service.getProductById(req.params.id);

      if (!product) {
        res.status(404).json({
          error: "Produto não encontrado."
        });

        return;
      }

      res.json(product);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao consultar produto."
      });
    }
  });

  // Listar categorias
  router.get("/categories", async (req, res) => {
    try {
      const categories = await service.getCategories();

      res.json(categories);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao consultar categorias."
      });
    }
  });

  return router;
}
