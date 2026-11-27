export type OrderStatus =
  "criado" | "pago" | "enviado" | "entregue" | "cancelado";

export type PaymentMethod = "Pix" | "Cartão" | "Boleto";

export const PAYMENT_METHODS: PaymentMethod[] = ["Pix", "Cartão", "Boleto"];

export type PaymentStatus = "pendente" | "aprovado" | "recusado" | "estornado";

export interface OrderItem {
  id: number;
  productId: string;
  productTitle: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Payment {
  id: number;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
}

// Pedido completo, como aparece em "Meus pedidos".
export interface Order {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  addressId: number;
  shippingAddressSnapshot: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments: Payment[];
}

// Item já com o preço/título do MongoDB, pronto para gravar.
export interface CheckoutLine {
  productId: string;
  productTitle: string;
  unitPrice: number;
  quantity: number;
}
