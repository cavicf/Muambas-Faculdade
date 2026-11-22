// DADOS MOCKADOS
// Usados só enquanto o back-end não existe. Quando a API estiver
// pronta, este arquivo será apagado e os imports trocados.


export type Product = {
  _id: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];
  price: number;
  availabilityStatus: string;
  categoryId: string;
  images: string[];
  thumbnail: string;
};

export type Category = {
  _id: string;
  name: string;
  productCount: number;
};

export type Cart = Record<string, number>;

export type User = {
  id: number;
  name: string;
  username: string;
  email: string;
  created_at: string;
};

export type Address = {
  id: number;
  user_id: number;
  recipient_name: string;
  street: string;
  street_number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
};

export type Inventory = {
  product_id: string;
  quantity_available: number;
  updated_at: string;
};

export type Order = {
  id: number;
  user_id: number;
  address_id: number;
  shipping_address_snapshot: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: string;
  product_title: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
};

export type Payment = {
  id: number;
  order_id: number;
  method: string;
  amount: number;
  status: string;
  created_at: string;
};


export const categorias: Category[] = [
  { _id: "eletronicos", name: "Eletrônicos", productCount: 3 },
  { _id: "moda", name: "Moda", productCount: 3 },
  { _id: "beleza", name: "Beleza", productCount: 2 },
  { _id: "casa", name: "Casa", productCount: 2 },
  { _id: "mercearia", name: "Mercearia", productCount: 2 },
];

export const produtos: Product[] = [
  {
    _id: "fone-bluetooth-pulse",
    title: "Fone Bluetooth Pulse",
    description: "Fone sem fio com bateria de até 20 horas e microfone embutido.",
    vendor: "SoundCo",
    productType: "Fone de ouvido",
    tags: ["eletronicos", "audio", "bluetooth"],
    price: 129.9,
    availabilityStatus: "Em estoque",
    categoryId: "eletronicos",
    images: [],
    thumbnail: "",
  },
  {
    _id: "carregador-turbo-30w",
    title: "Carregador Turbo 30W",
    description: "Carregador USB-C de carregamento rápido, compatível com a maioria dos celulares.",
    vendor: "VoltMax",
    productType: "Carregador",
    tags: ["eletronicos", "celular", "usb-c"],
    price: 59.9,
    availabilityStatus: "Em estoque",
    categoryId: "eletronicos",
    images: [],
    thumbnail: "",
  },
  {
    _id: "mouse-sem-fio-click",
    title: "Mouse Sem Fio Click",
    description: "Mouse sem fio silencioso, ideal para estudar e trabalhar.",
    vendor: "Tekno",
    productType: "Mouse",
    tags: ["eletronicos", "computador", "sem fio"],
    price: 79.9,
    availabilityStatus: "Esgotado",
    categoryId: "eletronicos",
    images: [],
    thumbnail: "",
  },
  {
    _id: "camiseta-basica-algodao",
    title: "Camiseta Básica Algodão",
    description: "Camiseta 100% algodão, confortável para o dia a dia.",
    vendor: "Urbano",
    productType: "Camiseta",
    tags: ["moda", "camiseta", "algodao"],
    price: 49.9,
    availabilityStatus: "Em estoque",
    categoryId: "moda",
    images: [],
    thumbnail: "",
  },
  {
    _id: "moletom-unifei",
    title: "Moletom UNIFEI",
    description: "Moletom com capuz e bolso canguru, estampa da UNIFEI.",
    vendor: "Campus Wear",
    productType: "Moletom",
    tags: ["moda", "moletom", "unifei"],
    price: 89.9,
    availabilityStatus: "Em estoque",
    categoryId: "moda",
    images: [],
    thumbnail: "",
  },
  {
    _id: "tenis-corrida-stride",
    title: "Tênis Corrida Stride",
    description: "Tênis leve com amortecimento, para corrida e caminhada.",
    vendor: "Stride",
    productType: "Tênis",
    tags: ["moda", "tenis", "esporte"],
    price: 199.9,
    availabilityStatus: "Em estoque",
    categoryId: "moda",
    images: [],
    thumbnail: "",
  },
  {
    _id: "hidratante-facial",
    title: "Hidratante Facial",
    description: "Hidratante facial leve, para todos os tipos de pele.",
    vendor: "Pele Viva",
    productType: "Hidratante",
    tags: ["beleza", "pele", "hidratante"],
    price: 39.9,
    availabilityStatus: "Em estoque",
    categoryId: "beleza",
    images: [],
    thumbnail: "",
  },
  {
    _id: "shampoo-nutritivo",
    title: "Shampoo Nutritivo",
    description: "Shampoo para cabelos secos, com óleo de argan.",
    vendor: "Fios & Co",
    productType: "Shampoo",
    tags: ["beleza", "cabelo", "shampoo"],
    price: 24.9,
    availabilityStatus: "Em estoque",
    categoryId: "beleza",
    images: [],
    thumbnail: "",
  },
  {
    _id: "caneca-termica",
    title: "Caneca Térmica",
    description: "Caneca térmica de 350 ml que mantém o café quente por horas.",
    vendor: "Haven & Hearth",
    productType: "Caneca",
    tags: ["casa", "cozinha", "caneca"],
    price: 44.9,
    availabilityStatus: "Em estoque",
    categoryId: "casa",
    images: [],
    thumbnail: "",
  },
  {
    _id: "luminaria-mesa-led",
    title: "Luminária de Mesa LED",
    description: "Luminária de mesa com três níveis de brilho, ótima para estudar.",
    vendor: "Lumina",
    productType: "Luminária",
    tags: ["casa", "iluminacao", "led"],
    price: 119.9,
    availabilityStatus: "Em estoque",
    categoryId: "casa",
    images: [],
    thumbnail: "",
  },
  {
    _id: "cafe-especial-500g",
    title: "Café Especial 500g",
    description: "Café torrado e moído, grãos selecionados do Sul de Minas.",
    vendor: "Grão Mineiro",
    productType: "Café",
    tags: ["mercearia", "cafe"],
    price: 34.9,
    availabilityStatus: "Em estoque",
    categoryId: "mercearia",
    images: [],
    thumbnail: "",
  },
  {
    _id: "chocolate-70-cacau",
    title: "Chocolate 70% Cacau",
    description: "Barra de chocolate meio amargo de 100 g.",
    vendor: "Cacau Sul",
    productType: "Chocolate",
    tags: ["mercearia", "doce", "chocolate"],
    price: 12.9,
    availabilityStatus: "Esgotado",
    categoryId: "mercearia",
    images: [],
    thumbnail: "",
  },
];


export const carrinho: Cart = {
  "fone-bluetooth-pulse": 1,
  "camiseta-basica-algodao": 2,
};


export const usuarios: User[] = [
  {
    id: 1,
    name: "Camily",
    username: "camily",
    email: "camily@unifei.edu.br",
    created_at: "2026-10-01T10:00:00Z",
  },
];

export const usuarioLogado: User | null = usuarios[0];

export const enderecos: Address[] = [
  {
    id: 1,
    user_id: 1,
    recipient_name: "Camily",
    street: "Av. BPS",
    street_number: "1303",
    complement: null,
    neighborhood: "Pinheirinho",
    city: "Itajubá",
    state: "MG",
    postal_code: "37500-903",
  },
];

export const estoque: Inventory[] = [
  { product_id: "fone-bluetooth-pulse", quantity_available: 12, updated_at: "2026-11-20T12:00:00Z" },
  { product_id: "carregador-turbo-30w", quantity_available: 3, updated_at: "2026-11-20T12:00:00Z" },
  { product_id: "mouse-sem-fio-click", quantity_available: 0, updated_at: "2026-11-20T12:00:00Z" },
  { product_id: "camiseta-basica-algodao", quantity_available: 25, updated_at: "2026-11-20T12:00:00Z" },
  { product_id: "moletom-unifei", quantity_available: 18, updated_at: "2026-11-20T12:00:00Z" },
  { product_id: "tenis-corrida-stride", quantity_available: 9, updated_at: "2026-11-20T12:00:00Z" },
  { product_id: "hidratante-facial", quantity_available: 14, updated_at: "2026-11-20T12:00:00Z" },
  { product_id: "shampoo-nutritivo", quantity_available: 20, updated_at: "2026-11-20T12:00:00Z" },
  { product_id: "caneca-termica", quantity_available: 11, updated_at: "2026-11-20T12:00:00Z" },
  { product_id: "luminaria-mesa-led", quantity_available: 2, updated_at: "2026-11-20T12:00:00Z" },
  { product_id: "cafe-especial-500g", quantity_available: 30, updated_at: "2026-11-20T12:00:00Z" },
  { product_id: "chocolate-70-cacau", quantity_available: 0, updated_at: "2026-11-20T12:00:00Z" },
];

export const pedidos: Order[] = [
  {
    id: 1,
    user_id: 1,
    address_id: 1,
    shipping_address_snapshot: "Av. BPS, 1303 - Pinheirinho, Itajubá/MG",
    status: "entregue",
    total_amount: 179.8,
    created_at: "2026-10-20T14:30:00Z",
    updated_at: "2026-10-25T09:00:00Z",
  },
  {
    id: 2,
    user_id: 1,
    address_id: 1,
    shipping_address_snapshot: "Av. BPS, 1303 - Pinheirinho, Itajubá/MG",
    status: "enviado",
    total_amount: 69.8,
    created_at: "2026-11-05T16:10:00Z",
    updated_at: "2026-11-07T08:00:00Z",
  },
];

export const itensPedido: OrderItem[] = [
  {
    id: 1,
    order_id: 1,
    product_id: "moletom-unifei",
    product_title: "Moletom UNIFEI",
    unit_price: 89.9,
    quantity: 2,
    subtotal: 179.8,
  },
  {
    id: 2,
    order_id: 2,
    product_id: "cafe-especial-500g",
    product_title: "Café Especial 500g",
    unit_price: 34.9,
    quantity: 2,
    subtotal: 69.8,
  },
];

export const pagamentos: Payment[] = [
  { id: 1, order_id: 1, method: "Pix", amount: 179.8, status: "aprovado", created_at: "2026-10-20T14:30:00Z" },
  { id: 2, order_id: 2, method: "Cartão", amount: 69.8, status: "aprovado", created_at: "2026-11-05T16:10:00Z" },
];
