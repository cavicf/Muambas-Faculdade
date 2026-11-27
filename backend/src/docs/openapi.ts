// Especificação OpenAPI 3 da API do Muambas UNIFEI.
//
// Servida em:
//   http://localhost:3001/docs       (Swagger UI)
//   http://localhost:3001/docs.json  (JSON bruto)
//
// Autenticação no Swagger: execute POST /api/auth/login. O navegador
// guarda o cookie HttpOnly "muambas_session" e o envia sozinho nas
// próximas chamadas (mesma origem), sem precisar colar token.
//
// Ao criar ou alterar uma rota, atualize este arquivo.

const json = (schema: object) => ({ "application/json": { schema } });

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const errorResponse = (description: string) => ({
  description,
  content: json(ref("Error"))
});

const ok = (description: string, schema: object) => ({
  description,
  content: json(schema)
});

const requiresLogin = {
  security: [{ sessionCookie: [] }]
};

const idParam = (name: string, description: string, type = "integer") => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type }
});

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Muambas UNIFEI - API",
    version: "1.0.0",
    description: [
      "E-commerce com persistência poliglota: **MongoDB** (catálogo), **Redis** (carrinho e sessões) e **PostgreSQL** (usuários, estoque, pedidos, pagamentos e outbox).",
      "",
      "### Simular o fluxo de checkout (Seção 5 do relatório)",
      "1. `POST /api/auth/login` com `camily@unifei.edu.br` / `1234567` (o cookie de sessão é salvo pelo navegador).",
      "2. `GET /api/products` → escolha um `_id`; `GET /api/inventory/{productId}` mostra o estoque.",
      "3. `POST /api/cart/items` → item vai para `cart:{userId}` no **Redis**.",
      "4. `GET /api/addresses` → pegue um `id` (ou crie com `POST /api/addresses`).",
      "5. `POST /api/orders/checkout` → transação no **PostgreSQL**: bloqueio e baixa do estoque, pedido, itens, pagamento e evento na outbox; depois o carrinho é removido do Redis.",
      "6. `GET /api/outbox/events` → evento `pendente`; `POST /api/outbox/process` (ou aguarde ~5s) → `processado` e `availabilityStatus` atualizado no **MongoDB**.",
      '7. `GET /api/orders` → histórico em "Meus pedidos".'
    ].join("\n")
  },
  servers: [
    { url: "http://localhost:3001", description: "Desenvolvimento local" }
  ],
  tags: [
    {
      name: "Auth",
      description: "Cadastro e login (PostgreSQL + sessão no Redis)"
    },
    { name: "Catálogo", description: "Produtos e categorias (MongoDB)" },
    {
      name: "Estoque",
      description: "Fonte da verdade do estoque (PostgreSQL)"
    },
    {
      name: "Carrinho",
      description: "Carrinho de visitante ou do usuário logado (Redis)"
    },
    { name: "Endereços", description: "Endereços de entrega (PostgreSQL)" },
    {
      name: "Pedidos",
      description: "Checkout transacional e histórico (PostgreSQL)"
    },
    {
      name: "Outbox",
      description: "Sincronização PostgreSQL → MongoDB (desenvolvimento)"
    },
    { name: "Sistema" }
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "muambas_session",
        description:
          "Definido automaticamente por POST /api/auth/login (cookie HttpOnly). Não é preciso preencher."
      }
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Mensagem descrevendo o erro." },
          details: {
            type: "object",
            additionalProperties: true,
            description:
              "Presente em alguns erros, ex.: itens sem estoque no checkout"
          }
        }
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 3 },
          name: { type: "string", example: "Camily Victal Finamor" },
          username: { type: "string", example: "camily" },
          email: { type: "string", example: "camily@unifei.edu.br" },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      RegisterInput: {
        type: "object",
        required: ["name", "username", "email", "password"],
        properties: {
          name: { type: "string", maxLength: 150, example: "Maria Souza" },
          username: {
            type: "string",
            pattern: "^[A-Za-z0-9_.]{3,80}$",
            example: "maria"
          },
          email: {
            type: "string",
            format: "email",
            example: "maria@unifei.edu.br"
          },
          password: {
            type: "string",
            minLength: 6,
            maxLength: 72,
            example: "1234567"
          }
        }
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "camily@unifei.edu.br" },
          password: { type: "string", example: "1234567" }
        }
      },
      LoginResponse: {
        type: "object",
        properties: {
          user: ref("User"),
          expiresAt: { type: "string", format: "date-time" },
          mergedCartItems: {
            type: "integer",
            description:
              "Produtos do carrinho de visitante mesclados no carrinho do usuário"
          }
        }
      },
      Product: {
        type: "object",
        properties: {
          _id: { type: "string", example: "apparel-2840" },
          title: { type: "string" },
          description: { type: "string" },
          brand: { type: "string" },
          productType: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          price: { type: "number", example: 29.9 },
          availabilityStatus: {
            type: "string",
            enum: ["Em estoque", "Esgotado"]
          },
          category: {
            type: "object",
            properties: { slug: { type: "string" }, name: { type: "string" } }
          },
          image: { type: "string" }
        }
      },
      Category: {
        type: "object",
        properties: {
          _id: { type: "string", example: "moda" },
          name: { type: "string", example: "Moda" },
          productCount: { type: "integer", example: 30 }
        }
      },
      IdsInput: {
        type: "object",
        required: ["ids"],
        properties: {
          ids: {
            type: "array",
            items: { type: "string" },
            example: ["apparel-2840"]
          }
        }
      },
      StockLevel: {
        type: "object",
        properties: {
          productId: { type: "string", example: "apparel-2840" },
          quantityAvailable: { type: "integer", example: 12 },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      Cart: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                productId: { type: "string" },
                quantity: { type: "integer" }
              }
            }
          },
          totalItems: { type: "integer" }
        }
      },
      AddressInput: {
        type: "object",
        required: [
          "recipientName",
          "street",
          "streetNumber",
          "city",
          "state",
          "postalCode"
        ],
        properties: {
          recipientName: { type: "string", example: "Camily Victal Finamor" },
          street: { type: "string", example: "Av. BPS" },
          streetNumber: { type: "string", example: "1303" },
          complement: { type: "string", nullable: true, example: "Bloco A" },
          neighborhood: {
            type: "string",
            nullable: true,
            example: "Pinheirinho"
          },
          city: { type: "string", example: "Itajubá" },
          state: { type: "string", example: "MG" },
          postalCode: { type: "string", example: "37500-903" }
        }
      },
      Address: {
        allOf: [
          {
            type: "object",
            properties: { id: { type: "integer", example: 1 } }
          },
          ref("AddressInput")
        ]
      },
      CheckoutInput: {
        type: "object",
        required: ["addressId", "paymentMethod"],
        properties: {
          addressId: { type: "integer", example: 1 },
          paymentMethod: {
            type: "string",
            enum: ["Pix", "Cartão", "Boleto"],
            example: "Pix"
          }
        }
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "integer" },
          status: {
            type: "string",
            enum: ["criado", "pago", "enviado", "entregue", "cancelado"]
          },
          totalAmount: { type: "number" },
          addressId: { type: "integer" },
          shippingAddressSnapshot: { type: "string" },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                productId: { type: "string" },
                productTitle: { type: "string" },
                unitPrice: { type: "number" },
                quantity: { type: "integer" },
                subtotal: { type: "number" }
              }
            }
          },
          payments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                method: { type: "string" },
                amount: { type: "number" },
                status: { type: "string" },
                createdAt: { type: "string" }
              }
            }
          }
        }
      },
      OutboxEvent: {
        type: "object",
        properties: {
          id: { type: "integer" },
          orderId: { type: "integer", nullable: true },
          eventType: { type: "string", example: "inventory.changed" },
          payload: {
            type: "object",
            example: { productId: "apparel-2840", quantityAvailable: 11 }
          },
          status: {
            type: "string",
            enum: ["pendente", "processado", "falhou"]
          },
          attempts: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          processedAt: { type: "string", format: "date-time", nullable: true }
        }
      }
    }
  },
  paths: {
    // ================= AUTH =================
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Cadastrar usuário",
        requestBody: { required: true, content: json(ref("RegisterInput")) },
        responses: {
          201: ok("Usuário criado", ref("User")),
          400: errorResponse("Dados inválidos"),
          409: errorResponse("E-mail ou username já cadastrado")
        }
      }
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login (cria a sessão e mescla o carrinho de visitante)",
        description:
          "Confere a senha (bcrypt) no PostgreSQL, cria `session:{tokenId}` no Redis e envia o cookie HttpOnly `muambas_session`. Se houver carrinho de visitante, ele é mesclado em `cart:{userId}`.",
        requestBody: { required: true, content: json(ref("LoginInput")) },
        responses: {
          200: ok("Login realizado", ref("LoginResponse")),
          401: errorResponse("E-mail ou senha inválidos")
        }
      }
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (revoga a sessão no Redis)",
        ...requiresLogin,
        responses: {
          204: { description: "Sessão encerrada" },
          401: errorResponse("Sem login")
        }
      }
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Usuário logado",
        ...requiresLogin,
        responses: {
          200: ok("Usuário", ref("User")),
          401: errorResponse("Sem login")
        }
      }
    },

    // ================= CATÁLOGO =================
    "/api/products": {
      get: {
        tags: ["Catálogo"],
        summary: "Listar, pesquisar e filtrar produtos",
        parameters: [
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            example: "shirt"
          },
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            example: "moda"
          },
          { name: "brand", in: "query", schema: { type: "string" } },
          { name: "minPrice", in: "query", schema: { type: "number" } },
          { name: "maxPrice", in: "query", schema: { type: "number" } },
          {
            name: "priceOrder",
            in: "query",
            schema: { type: "string", enum: ["asc", "desc"] }
          }
        ],
        responses: {
          200: ok("Produtos", { type: "array", items: ref("Product") }),
          400: errorResponse("Parâmetro inválido")
        }
      }
    },
    "/api/products/filters": {
      get: {
        tags: ["Catálogo"],
        summary: "Opções de filtro (marcas e preço máximo)",
        responses: {
          200: ok("Opções", { type: "object", additionalProperties: true })
        }
      }
    },
    "/api/products/batch": {
      post: {
        tags: ["Catálogo"],
        summary: "Buscar vários produtos pelos IDs",
        requestBody: { required: true, content: json(ref("IdsInput")) },
        responses: {
          200: ok("Produtos", { type: "array", items: ref("Product") })
        }
      }
    },
    "/api/products/{id}": {
      get: {
        tags: ["Catálogo"],
        summary: "Buscar produto por ID",
        parameters: [
          idParam("id", "ID do produto (ex.: apparel-2840)", "string")
        ],
        responses: {
          200: ok("Produto", ref("Product")),
          404: errorResponse("Não encontrado")
        }
      }
    },
    "/api/categories": {
      get: {
        tags: ["Catálogo"],
        summary: "Listar categorias com contagem de produtos",
        responses: {
          200: ok("Categorias", { type: "array", items: ref("Category") })
        }
      }
    },

    // ================= ESTOQUE =================
    "/api/inventory/{productId}": {
      get: {
        tags: ["Estoque"],
        summary: "Estoque de um produto",
        parameters: [
          idParam("productId", "ID do produto (mesmo _id do MongoDB)", "string")
        ],
        responses: {
          200: ok("Estoque", ref("StockLevel")),
          404: errorResponse("Sem estoque cadastrado")
        }
      }
    },
    "/api/inventory/batch": {
      post: {
        tags: ["Estoque"],
        summary: "Estoque de vários produtos",
        requestBody: { required: true, content: json(ref("IdsInput")) },
        responses: {
          200: ok("Estoques", { type: "array", items: ref("StockLevel") })
        }
      }
    },

    // ================= CARRINHO =================
    "/api/cart": {
      get: {
        tags: ["Carrinho"],
        summary: "Consultar carrinho",
        description:
          "Logado: `cart:{userId}` (TTL 7 dias). Visitante: `cart:guest:{uuid}` (TTL 24h, cookie criado automaticamente).",
        responses: { 200: ok("Carrinho", ref("Cart")) }
      },
      delete: {
        tags: ["Carrinho"],
        summary: "Esvaziar carrinho",
        responses: { 200: ok("Carrinho vazio", ref("Cart")) }
      }
    },
    "/api/cart/items": {
      post: {
        tags: ["Carrinho"],
        summary: "Adicionar produto",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["productId"],
            properties: {
              productId: { type: "string", example: "apparel-2840" },
              quantity: { type: "integer", minimum: 1, maximum: 99, example: 2 }
            }
          })
        },
        responses: {
          200: ok("Carrinho atualizado", ref("Cart")),
          400: errorResponse("Quantidade inválida"),
          404: errorResponse("Produto não existe no catálogo")
        }
      }
    },
    "/api/cart/items/{productId}": {
      patch: {
        tags: ["Carrinho"],
        summary: "Alterar quantidade (0 remove)",
        parameters: [idParam("productId", "ID do produto", "string")],
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["quantity"],
            properties: {
              quantity: { type: "integer", minimum: 0, maximum: 99, example: 3 }
            }
          })
        },
        responses: { 200: ok("Carrinho atualizado", ref("Cart")) }
      },
      delete: {
        tags: ["Carrinho"],
        summary: "Remover produto",
        parameters: [idParam("productId", "ID do produto", "string")],
        responses: { 200: ok("Carrinho atualizado", ref("Cart")) }
      }
    },

    // ================= ENDEREÇOS =================
    "/api/addresses": {
      get: {
        tags: ["Endereços"],
        summary: "Listar endereços do usuário",
        ...requiresLogin,
        responses: {
          200: ok("Endereços", { type: "array", items: ref("Address") }),
          401: errorResponse("Sem login")
        }
      },
      post: {
        tags: ["Endereços"],
        summary: "Cadastrar endereço",
        ...requiresLogin,
        requestBody: { required: true, content: json(ref("AddressInput")) },
        responses: {
          201: ok("Endereço criado", ref("Address")),
          400: errorResponse("Dados inválidos"),
          401: errorResponse("Sem login")
        }
      }
    },
    "/api/addresses/{id}": {
      put: {
        tags: ["Endereços"],
        summary: "Alterar endereço",
        ...requiresLogin,
        parameters: [idParam("id", "ID do endereço")],
        requestBody: { required: true, content: json(ref("AddressInput")) },
        responses: {
          200: ok("Endereço alterado", ref("Address")),
          404: errorResponse("Não encontrado")
        }
      },
      delete: {
        tags: ["Endereços"],
        summary: "Remover endereço",
        ...requiresLogin,
        parameters: [idParam("id", "ID do endereço")],
        responses: {
          204: { description: "Removido" },
          404: errorResponse("Não encontrado"),
          409: errorResponse("Endereço já usado em pedido")
        }
      }
    },

    // ================= PEDIDOS =================
    "/api/orders/checkout": {
      post: {
        tags: ["Pedidos"],
        summary: "Finalizar compra do carrinho (transação ACID)",
        description:
          "Lê o carrinho (Redis), busca preços (MongoDB) e, numa única transação do PostgreSQL, bloqueia e baixa o estoque e grava pedido, itens, pagamento simulado e eventos da outbox. Após o COMMIT, o carrinho é removido.",
        ...requiresLogin,
        requestBody: { required: true, content: json(ref("CheckoutInput")) },
        responses: {
          201: ok("Pedido criado", ref("Order")),
          400: errorResponse("Carrinho vazio ou dados inválidos"),
          401: errorResponse("Sem login"),
          404: errorResponse("Endereço não encontrado"),
          409: errorResponse(
            "Estoque insuficiente (details.items) ou produto fora do catálogo"
          )
        }
      }
    },
    "/api/orders": {
      get: {
        tags: ["Pedidos"],
        summary: "Meus pedidos",
        ...requiresLogin,
        responses: {
          200: ok("Pedidos (mais recentes primeiro)", {
            type: "array",
            items: ref("Order")
          }),
          401: errorResponse("Sem login")
        }
      }
    },
    "/api/orders/{id}": {
      get: {
        tags: ["Pedidos"],
        summary: "Detalhe do pedido",
        ...requiresLogin,
        parameters: [idParam("id", "ID do pedido")],
        responses: {
          200: ok("Pedido", ref("Order")),
          404: errorResponse("Não encontrado")
        }
      }
    },

    // ================= OUTBOX =================
    "/api/outbox/events": {
      get: {
        tags: ["Outbox"],
        summary: "Listar eventos da outbox",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["pendente", "processado", "falhou"]
            }
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50 }
          }
        ],
        responses: {
          200: ok("Eventos", { type: "array", items: ref("OutboxEvent") })
        }
      }
    },
    "/api/outbox/process": {
      post: {
        tags: ["Outbox"],
        summary: "Processar eventos pendentes agora",
        description:
          "Executa um ciclo do processador (que também roda sozinho a cada 5s): atualiza o availabilityStatus no MongoDB.",
        responses: {
          200: ok("Resultado", {
            type: "object",
            properties: {
              processed: { type: "integer" },
              failed: { type: "integer" }
            }
          })
        }
      }
    },

    // ================= SISTEMA =================
    "/health": {
      get: {
        tags: ["Sistema"],
        summary: "Verificação de saúde",
        responses: {
          200: ok("OK", {
            type: "object",
            properties: { status: { type: "string" } }
          })
        }
      }
    }
  }
};
