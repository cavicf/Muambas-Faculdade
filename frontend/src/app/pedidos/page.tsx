import Link from "next/link";
import styles from "./page.module.css";
import {
  itensPedido,
  pagamentos,
  pedidos,
  usuarioLogado
} from "@/mocks/mock-data";
import { formatarData } from "@/utils/formatarData";
import { formatarPreco } from "@/utils/formatarPreco";

export default function MeusPedidos() {
  const pedidosDoUsuario = pedidos.filter(
    (pedido) => pedido.user_id === usuarioLogado?.id
  );
  pedidosDoUsuario.sort((pedidoA, pedidoB) => pedidoB.id - pedidoA.id);

  if (pedidosDoUsuario.length === 0) {
    return (
      <div className="card">
        <h2>Meus pedidos</h2>
        <p>Você ainda não fez nenhum pedido.</p>
        <Link href="/" className={styles.linkCatalogo}>
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className={styles.titulo}>Meus pedidos</h2>

      <div className={styles.lista}>
        {pedidosDoUsuario.map((pedido, posicao) => {
          const itensDoPedido = itensPedido.filter(
            (item) => item.order_id === pedido.id
          );
          const pagamento = pagamentos.find(
            (pagamento) => pagamento.order_id === pedido.id
          );
          const numeroDoPedido = String(pedido.id).padStart(3, "0");
          const statusFormatado =
            pedido.status[0].toUpperCase() + pedido.status.slice(1);
          const ehOMaisRecente = posicao === 0;

          return (
            <details key={pedido.id} className="card" open={ehOMaisRecente}>
              <summary className={styles.cabecalho}>
                <strong>Pedido #{numeroDoPedido}</strong>
                <span className={styles.data}>
                  {formatarData(pedido.created_at)}
                </span>
                <span className={styles.status}>{statusFormatado}</span>
                <strong className={styles.total}>
                  {formatarPreco(pedido.total_amount)}
                </strong>
              </summary>

              <table className={styles.tabela}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qtd</th>
                    <th>Preço un.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {itensDoPedido.map((item) => (
                    <tr key={item.id}>
                      <td>{item.product_title}</td>
                      <td>{item.quantity}</td>
                      <td>{formatarPreco(item.unit_price)}</td>
                      <td>{formatarPreco(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className={styles.entrega}>
                Entrega: {pedido.shipping_address_snapshot} · Pagamento:{" "}
                {pagamento?.method}
              </p>
            </details>
          );
        })}
      </div>
    </div>
  );
}
