import styles from "./page.module.css";
import PaymentOptions from "@/components/PaymentOptions/PaymentOptions";
import { carrinho, enderecos, produtos, usuarioLogado, Product } from "@/mocks/mock-data";
import { formatarPreco } from "@/utils/formatarPreco";

type ItemDoResumo = {
  produto: Product;
  quantidade: number;
  subtotal: number;
};

export default function Checkout() {
  const itensDoResumo: ItemDoResumo[] = [];
  let total = 0;

  for (const productId in carrinho) {
    const produto = produtos.find((produto) => produto._id === productId);

    if (produto) {
      const quantidade = carrinho[productId];
      const subtotal = produto.price * quantidade;

      itensDoResumo.push({ produto, quantidade, subtotal });
      total += subtotal;
    }
  }

  const enderecoDoUsuario = enderecos.find((endereco) => endereco.user_id === usuarioLogado?.id);
  const enderecoFormatado = enderecoDoUsuario
    ? `${enderecoDoUsuario.street}, ${enderecoDoUsuario.street_number} - ${enderecoDoUsuario.neighborhood}, ${enderecoDoUsuario.city}/${enderecoDoUsuario.state}`
    : "";

  return (
    <div className={styles.conteudo}>
      <div className={`card ${styles.formulario}`}>
        <h2>Checkout</h2>

        <label className={styles.rotulo}>
          Endereço de entrega
          <textarea className="campoBusca" rows={2} defaultValue={enderecoFormatado} />
        </label>

        <div className={styles.rotulo}>
          Pagamento (simulado)
          <PaymentOptions />
        </div>

        <button className="botao">Confirmar pedido</button>
      </div>

      <div className={`card ${styles.resumo}`}>
        <h4>Resumo</h4>

        {itensDoResumo.map((item) => (
          <div key={item.produto._id} className={styles.linha}>
            <span>
              {item.quantidade}× {item.produto.title}
            </span>
            <span>{formatarPreco(item.subtotal)}</span>
          </div>
        ))}

        <div className={`${styles.linha} ${styles.total}`}>
          <span>Total</span>
          <span>{formatarPreco(total)}</span>
        </div>
      </div>
    </div>
  );
}
