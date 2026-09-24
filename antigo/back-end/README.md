# SyncDev Backend

Backend bsico em Node.js + Express, preparado para dar incio ao servio do site Arcdia (syncdev).

## Como rodar

Instale as dependncias e inicie o servidor:

```bash
cd back-end
npm install
npm run dev
```

O servidor ficar disponvel em `http://localhost:3000` por padro (pode alterar com a varivel `PORT`).

## Rotas disponveis

### Health
- `GET /health`  verifica se o servio est vivo.

### Autenticao
- `POST /api/auth/login`  recebe `{ email, senha }`.
- `POST /api/auth/cadastro`  recebe `{ nome, email, senha, tipo }`.
- `GET /api/auth/perfil`  perfil do usurio logado (a ser implementado).

### Avisos
- `GET /api/avisos`  lista de avisos.
- `POST /api/avisos`  cria um aviso (`{ titulo, conteudo, data }`).

### Documentos
- `GET /api/documentos`  lista de documentos.
- `POST /api/documentos`  cria um documento (`{ titulo, descricao, arquivo }`).

### Projetos
- `GET /api/projetos`  lista de projetos.
- `POST /api/projetos`  cria um projeto (`{ nome, descricao, prazo }`).

### Feed inicial
- `GET /api/inicio`  feed da pgina inicial.

## Prximos passos

- Substituir os retornos placeholder por lgica real (banco de dados, validao, autenticao).
- Adicionar autenticao (JWT, sesso, etc.).
- Integrar com o front-end e com o portal React.
