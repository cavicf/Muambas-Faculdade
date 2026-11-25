import styles from "./page.module.css";
import ProductCard from "@/components/ProductCard/ProductCard";
import { categorias, produtos } from "@/mocks/mock-data";
import { formatarPreco } from "@/utils/formatarPreco";

const PRECO_MAXIMO_DO_FILTRO = 400;

export default function Catalogo() {
  const todasAsMarcas: string[] = [];

  for (const produto of produtos) {
    if (!todasAsMarcas.includes(produto.vendor)) {
      todasAsMarcas.push(produto.vendor);
    }
  }
  todasAsMarcas.sort();

  return (
    <div>
      <input className="campoBusca" placeholder="Buscar produtos, marcas..." />

      <div className={styles.conteudo}>
        <aside className={`card ${styles.lateral}`}>
          <h4 className={styles.tituloSecao}>Categorias</h4>

          <button className={styles.categoriaSelecionada}>
            Todas <span>{produtos.length}</span>
          </button>

          {categorias.map((categoria) => (
            <button key={categoria._id} className={styles.categoria}>
              {categoria.name} <span>{categoria.productCount}</span>
            </button>
          ))}

          <hr className={styles.divisoria} />

          <h4 className={styles.tituloSecao}>Filtros</h4>

          <label className={styles.rotulo}>
            Marca
            <select className="campoBusca">
              <option>Todas</option>
              {todasAsMarcas.map((marca) => (
                <option key={marca}>{marca}</option>
              ))}
            </select>
          </label>

          <label className={styles.rotulo}>
            Preço até {formatarPreco(PRECO_MAXIMO_DO_FILTRO)}
            <input
              type="range"
              min={0}
              max={PRECO_MAXIMO_DO_FILTRO}
              defaultValue={PRECO_MAXIMO_DO_FILTRO}
            />
          </label>

          <label className={styles.rotulo}>
            Ordenar
            <select className="campoBusca">
              <option>Menor preço</option>
              <option>Maior preço</option>
            </select>
          </label>
        </aside>

        <section>
          <p className={styles.contagem}>{produtos.length} produto(s)</p>

          <div className={styles.grade}>
            {produtos.map((produto) => (
              <ProductCard key={produto._id} produto={produto} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
