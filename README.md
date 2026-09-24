# SyncDev IFPA — Sistema de Mural e Portal Acadêmico

## Stacks Utilizadas

- **Front-end:** HTML5, CSS3 e JavaScript puro (Vanilla JS).
- **Back-end:** Node.js com Express.
- **Banco de Dados:** mysql (`syncdev.db`).

## Estrutura de Pastas

```text
Project/
├── front/                 # Todo o front-end (HTML, CSS, JS e assets)
│   ├── index.html         # Landing page institucional
│   ├── login.html         # Tela de login
│   ├── cadastro.html      # Tela de cadastro (Aluno/Professor/Servidor)
│   ├── inicio.html        # Dashboard do portal
│   ├── avisos.html        # Feed e mural de avisos
│   ├── aviso.html         # Detalhes de um aviso
│   ├── documentos.html    # Central de documentos acadêmicos
│   ├── projetos.html      # Mural de projetos e oportunidades
│   ├── calendario.html    # Calendário acadêmico e prazos
│   ├── perfil.html        # Perfil e preferências do usuário
│   ├── script.js          # Lógica JavaScript do front-end
│   ├── style.css          # Estilos do portal interno
│   ├── landing.css        # Estilos da landing page
│   ├── auth.css           # Estilos das telas de autenticação
│   ├── ilustracoes/       # Vetores e imagens
│   └── public/            # Logos e ícones
│
├── back-end/              # Servidor Node.js + Express
│   ├── server.js          # API REST e servidor de arquivos estáticos
│   ├── syncdev.db         # Banco de dados local SQLite
│   └── package.json       # Dependências (express, cors, sqlite3)
│
├── package.json           # Atalho para executar o projeto da raiz
└── README.md              # Documentação do projeto
```


## Como Executar o Projeto

## 1. Instalar as dependências (apenas na primeira vez)
Entre na pasta do back-end e instale:
```bash
cd back-end
npm install
```

### 2. Iniciar o servidor
A partir da pasta raiz do projeto (`Project`), execute:
```bash
npm start
```
Ou direto da pasta `back-end`:
```bash
node server.js
```

### 3. Acessar a aplicação
Abra no navegador:
- **Aplicação / Front-end:** [http://localhost:3000](http://localhost:3000)
- **Status da API:** [http://localhost:3000/health](http://localhost:3000/health)

> **Dica:** Se preferir abrir os arquivos HTML com a extensão **Live Server** do VS Code, a comunicação com a API em `http://localhost:3000` continuará funcionando perfeitamente.
