# Muambas-Faculdade

## PostgreSQL (usuários, estoque, pedidos e pagamentos)

O PostgreSQL sobe junto com os outros bancos:

```bash
docker compose up -d
```

- Porta local: `127.0.0.1:5433` · banco/usuário/senha: `muambas` (somente desenvolvimento)
- No backend, configure `POSTGRES_URL=postgresql://muambas:muambas@127.0.0.1:5433/muambas` no `backend/.env`
- O schema (`backend/database/postgres/init/001_schema.sql`) é aplicado automaticamente
  na **primeira** inicialização do container (volume vazio). Se você alterar o schema,
  recrie o volume: `docker compose rm -sf postgres && docker volume rm muambas-faculdade_postgres_data && docker compose up -d postgres`

### Usuários de teste

Criados automaticamente junto com o schema (`002_seed_users.sql`), todos com a senha `1234567`:
`rodolfo@unifei.edu.br`, `luis@unifei.edu.br`, `camily@unifei.edu.br`, `joao@unifei.edu.br`.

Se o seu volume do PostgreSQL já existia, crie-os sem apagar nada (pode rodar quantas vezes quiser):

```bash
cd backend && npm run seed:postgres
```

### pgAdmin

Importe `pgadmin/servers.json` em **Tools → Import/Export Servers** e informe a senha
`muambas` na primeira conexão.
