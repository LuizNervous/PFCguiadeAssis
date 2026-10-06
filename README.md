<div align="center">

# 🗺️ Guia Assis

**O guia digital de Assis Chateaubriand, Paraná**

Pontos turísticos, serviços, mapa interativo e história da cidade, em um só lugar.
Feito com foco em **acessibilidade**.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

</div>

---

## 📖 Sobre o projeto

O **Guia Assis** reúne informações úteis sobre Assis Chateaubriand para moradores e visitantes: onde comer, onde abastecer, qual farmácia ou posto de saúde procurar, o que visitar e como a cidade nasceu.

Os usuários podem criar uma conta, **avaliar os locais** e personalizar o perfil. Um painel administrativo permite cadastrar e manter os pontos da cidade.

> Projeto Final de Curso, desenvolvido por estudantes de Informática.

---

## ✨ Funcionalidades

| | Recurso | Descrição |
|---|---|---|
| 🏠 | **Página inicial** | Apresentação da cidade e acesso rápido ao mapa |
| 📍 | **Mapa interativo** | Pontos de interesse por categoria (Leaflet + OpenStreetMap), com atalhos para Google Maps e Waze |
| 🧭 | **Guia de serviços** | Busca e filtros por categoria, notas e observações da comunidade |
| ⭐ | **Avaliações** | Nota de 1 a 5 estrelas e tags, para usuários logados |
| 📜 | **História** | Linha do tempo e prefeitos de Assis Chateaubriand |
| 👤 | **Contas de usuário** | Cadastro, login, edição de dados e foto de perfil |
| 🛠️ | **Painel administrativo** | Criar, editar e excluir pontos, com upload de imagem (acesso restrito) |
| 🤖 | **IAssis** | Chatbot para tirar dúvidas sobre a cidade |

### ♿ Acessibilidade

- Seis temas: **Padrão, Modo Escuro, Alto Contraste, Tricromacia Anômala, Dicromacia e Monocromacia**
- Controle do **tamanho do texto**
- **VLibras** (tradução para Libras)
- **Tradução do site** com Google Tradutor
- Preferências salvas no navegador

---

## 🧱 Tecnologias

**Frontend:** HTML, CSS e JavaScript puro, com Header e Footer carregados como componentes reutilizáveis.

**Backend:** Node.js, Express e MySQL.

**Bibliotecas do backend:** `mysql2`, `bcryptjs`, `jsonwebtoken`, `helmet`, `cors`, `express-rate-limit`, `dotenv`, `multer`, `sharp`.

**Serviços externos:** Leaflet/OpenStreetMap (mapa), ImageKit (armazenamento de imagens), Botpress (chatbot), VLibras e Google Tradutor.

---

## 📁 Estrutura de pastas

```
Guia-Assis/
├── index.html              # Página inicial
├── addPoint/               # Painel administrativo
├── componentes/            # Header, Footer e o carregador deles
├── css/
├── js/
├── historia/
├── imagens/
├── login/                  # Login, cadastro e perfil
├── mapa/
├── servicos/               # Guia de serviços e avaliações
│
└── back/                   # API
    ├── server.js           # Ponto de entrada
    ├── package.json
    └── src/
        ├── app.js          # Configuração do Express
        ├── config/         # Conexão com o banco
        ├── middlewares/    # Autenticação, limites e upload
        ├── routes/         # Rotas da API
        ├── services/       # Integração com ImageKit
        └── utils/          # Validações
```

---

## 🔌 API

Todas as rotas começam com `/api`.

**Públicas**

| Método | Rota | Descrição |
|---|---|---|
| GET | `/pontos` | Lista os pontos com nota média e tags |
| GET | `/pontos/:id` | Detalhes de um ponto |
| GET | `/pontos/:id/avaliacoes` | Avaliações de um ponto |
| POST | `/cadastro` | Cria uma conta |
| POST | `/login` | Autentica e devolve o token JWT |

**Exigem login** (`Authorization: Bearer TOKEN`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/avaliar` | Cria ou atualiza a avaliação do usuário |
| GET | `/usuario` | Dados do usuário logado |
| PUT | `/usuario` | Atualiza nome e e-mail |
| PUT | `/usuario/foto` | Troca a foto de perfil |
| DELETE | `/usuario/foto` | Remove a foto de perfil |

**Exigem login e permissão de administrador**

| Método | Rota | Descrição |
|---|---|---|
| GET | `/admin/verificar` | Confirma que o usuário é administrador |
| GET | `/admin/categorias` | Lista as categorias |
| POST | `/admin/pontos` | Cria um ponto |
| PUT | `/admin/pontos/:id` | Edita um ponto |
| DELETE | `/admin/pontos/:id` | Exclui um ponto e suas avaliações |

---

## 🗄️ Banco de dados

Tabelas principais: `usuarios`, `categorias`, `pontos` e `avaliacoes`.

---

## 🔐 Segurança

- Senhas com hash **bcrypt**
- Autenticação com **JWT** (criado e validado somente no backend)
- Permissão de administrador verificada no **servidor**, nunca só no navegador
- **Rate limiting** nas rotas de login e cadastro
- Cabeçalhos de segurança com **Helmet**
- Validação de tipo e tamanho dos dados recebidos
- Upload de imagem validado pelo conteúdo do arquivo e otimizado antes de ser salvo
- Saída de dados escapada no frontend contra injeção de HTML

---

## 🚀 Como rodar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20.9 ou superior
- Um banco MySQL com as tabelas do projeto
- Uma conta no ImageKit (para upload de imagens)

### 1. Clonar

```bash
git clone https://github.com/LuizNervous/PFCguiadeAssis.git
cd PFCguiadeAssis
```

### 2. Instalar as dependências do backend

```bash
cd back
npm install
cd ..
```

### 3. Configurar o `back/.env`

Crie o arquivo `back/.env` com as variáveis abaixo. **Nunca envie esse arquivo ao GitHub.**

```env
PORT=
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_CA=
JWT_SECRET=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=
```

> `DB_CA` é o certificado do banco. No `.env`, coloque-o em **uma única linha**, entre aspas, com `\n` no lugar das quebras de linha.

### 4. Iniciar o servidor

Rode **da raiz do projeto** (o caminho do `.env` é relativo a ela):

```bash
node back/server.js
```

### 5. Abrir o frontend

Abra a **raiz do projeto** com uma extensão como o **Live Server** do VS Code. O site usa caminhos como `/componentes/header.html`, então ele precisa ser servido a partir da raiz, e não aberto com um duplo clique no arquivo.

Para usar a API local, altere o `API_URL` em `js/global.js`:

```js
const API_URL = "http://localhost:PORTA/api";
```

> ⚠️ Não envie o `API_URL` com `localhost` para o GitHub: o site publicado deixaria de funcionar.

---

## 👥 Autores

- **Luiz Gustavo**
- **Bruno Eduardo**
- **Gabriel Bombarda**

---

<div align="center">

Feito com 💙 em Assis Chateaubriand, Paraná

</div>