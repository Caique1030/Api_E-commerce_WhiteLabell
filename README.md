# 🛒 E-commerce Whitelabel API - Processo Seletivo 2025

> API completa para sistema de e-commerce whitelabel construído com NestJS

[![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📋 Descrição

Esta API permite que diferentes clientes (lojas) utilizem a mesma plataforma de e-commerce com suas próprias personalizações visuais (whitelabel). O sistema consome produtos de **dois fornecedores externos** e os disponibiliza através de endpoints próprios.

### 🎯 Principais Funcionalidades

- ✅ **Autenticação JWT** - Login e registro de usuários
- ✅ **Sistema Whitelabel** - Identificação de cliente por domínio
- ✅ **Integração com Fornecedores** - Sincronização automática de produtos
- ✅ **Listagem e Filtros** - Busca avançada de produtos
- ✅ **WebSockets** - Notificações em tempo real
- ✅ **CRUD Completo** - Produtos, Clientes, Fornecedores e Usuários
- ✅ **Auditoria** - Logs de atividades do sistema

---

## 🏗️ Arquitetura

O projeto segue uma **arquitetura modular** baseada em NestJS, utilizando:

- **Repository Pattern** - Separação de lógica de acesso aos dados
- **Dependency Injection** - Gerenciamento automático de dependências
- **DTOs e Validation** - Validação de dados com class-validator
- **Middleware** - Identificação de cliente por domínio
- **Guards** - Proteção de rotas com JWT
- **WebSockets** - Comunicação em tempo real via Socket.io

### 📦 Módulos Principais

| Módulo              | Responsabilidade                          |
| ------------------- | ----------------------------------------- |
| **AuthModule**      | Autenticação e autorização (JWT)          |
| **UsersModule**     | Gerenciamento de usuários                 |
| **ClientsModule**   | Gerenciamento de clientes whitelabel      |
| **ProductsModule**  | Gerenciamento e sincronização de produtos |
| **SuppliersModule** | Gerenciamento de fornecedores externos    |
| **EventsModule**    | Notificações em tempo real (WebSockets)   |
| **DatabaseModule**  | Configuração do TypeORM e PostgreSQL      |

---

## 🗄️ Estrutura do Banco de Dados

### Diagrama Entidade-Relacionamento (ER)

![Diagrama ER](./er-diagram.svg)

### 📊 Tabelas Principais

| Tabela            | Descrição                                                        |
| ----------------- | ---------------------------------------------------------------- |
| **clients**       | Armazena os dados dos clientes whitelabel (domínio, cores, logo) |
| **users**         | Usuários do sistema associados a um cliente específico           |
| **suppliers**     | Fornecedores externos que disponibilizam produtos                |
| **products**      | Produtos de todos os fornecedores (sincronizados)                |
| **orders**        | Pedidos realizados pelos usuários                                |
| **order_items**   | Itens individuais de cada pedido                                 |
| **activity_logs** | Logs de auditoria do sistema                                     |

#### 🔗 Relacionamentos Principais

```
clients (1) ──→ (N) users
clients (1) ──→ (N) products
clients (1) ──→ (N) orders

suppliers (1) ──→ (N) products

users (1) ──→ (N) orders
users (1) ──→ (N) activity_logs

orders (1) ──→ (N) order_items
products (1) ──→ (N) order_items
```

---

## 🧰 Tecnologias Utilizadas

### Backend

- **[NestJS](https://nestjs.com/)** v11.x - Framework Node.js progressivo
- **[TypeScript](https://www.typescriptlang.org/)** v5.7 - JavaScript com tipagem estática
- **[TypeORM](https://typeorm.io/)** v0.3 - ORM para interação com banco de dados

### Banco de Dados

- **[PostgreSQL](https://www.postgresql.org/)** v14+ - Banco de dados relacional robusto

### Autenticação & Segurança

- **[Passport](http://www.passportjs.org/)** - Middleware de autenticação
- **[JWT](https://jwt.io/)** - JSON Web Tokens para autenticação stateless
- **[bcrypt](https://www.npmjs.com/package/bcrypt)** - Hash de senhas

### Validação & Transformação

- **[class-validator](https://github.com/typestack/class-validator)** - Validação baseada em decorators
- **[class-transformer](https://github.com/typestack/class-transformer)** - Transformação de objetos

### Comunicação em Tempo Real

- **[Socket.io](https://socket.io/)** v4.x - WebSockets para eventos em tempo real

### HTTP & APIs

- **[Axios](https://axios-http.com/)** - Cliente HTTP para integração com fornecedores

---

## 🚀 Instalação e Execução

### 📋 Pré-requisitos

Certifique-se de ter instalado:

- **Node.js** v18 ou superior
- **npm** ou **yarn**
- **PostgreSQL** v14 ou superior

### 1️⃣ Clone o Repositório

```bash
git clone <seu-repositorio>
cd <nome-do-projeto>
```

### 2️⃣ Instale as Dependências

```bash
npm install
# ou
yarn install
```

### 3️⃣ Configure o Banco de Dados

#### Crie o banco de dados:

```bash
# Conecte ao PostgreSQL
psql -U postgres

# Crie o banco de dados
CREATE DATABASE ecommerce_whitelabel;

# Saia do psql
\q
```

#### Execute o script SQL:

```bash
psql -U postgres -d ecommerce_whitelabel -a -f database_script.sql
```

O script criará:

- ✅ Extensão UUID
- ✅ Função de atualização automática de timestamps
- ✅ Todas as tabelas com relacionamentos
- ✅ Índices otimizados
- ✅ Triggers para updated_at

### 4️⃣ Configure as Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de Dados
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=sua_senha
DATABASE_NAME=ecommerce_whitelabel

# JWT
JWT_SECRET=seu_segredo_super_seguro_aqui_12345
JWT_EXPIRES_IN=1d

# Aplicação
PORT=3000
NODE_ENV=development
```

### 5️⃣ Popule o Banco com Dados Iniciais (Opcional)

```bash
# Criar fornecedores
npm run seed:suppliers

# Criar clientes whitelabel
npm run seed:clients

# Criar usuário administrador
npm run seed:admin

# Ou executar todos de uma vez
npm run seed:all
```

### 6️⃣ Inicie a Aplicação

```bash
# Modo desenvolvimento (com hot-reload)
npm run start:dev

# Modo produção
npm run build
npm run start:prod
```

A API estará disponível em: **http://localhost:3000**

---

## 📡 Endpoints da API

### Base URL

```
http://localhost:3000/api
```

### 🔐 Autenticação

#### POST `/auth/register`

Registra um novo usuário

**Body:**

```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "user"
  }
}
```

#### POST `/auth/login`

Realiza login do usuário

**Body:**

```json
{
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com"
  }
}
```

---

### 🏢 Clientes (Whitelabel)

#### GET `/clients`

Lista todos os clientes

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Devnology Store",
    "domain": "devnology.com:3000",
    "primaryColor": "#00FF00",
    "secondaryColor": "#004400",
    "logo": "https://example.com/logo.png",
    "isActive": true
  }
]
```

#### GET `/clients/:id`

Obtém detalhes de um cliente específico

#### POST `/clients` 🔒 (Requer autenticação)

Cria um novo cliente

**Headers:**

```
Authorization: Bearer <seu_token>
```

**Body:**

```json
{
  "name": "Nova Loja",
  "domain": "novaloja.com:3000",
  "primaryColor": "#FF0000",
  "secondaryColor": "#990000",
  "logo": "https://example.com/logo.png"
}
```

#### PATCH `/clients/:id` 🔒

Atualiza um cliente existente

#### DELETE `/clients/:id` 🔒

Remove um cliente

---

### 📦 Produtos

#### GET `/products`

Lista produtos com filtros opcionais

**Query Parameters:**

- `name` - Busca por nome (parcial)
- `category` - Filtra por categoria
- `minPrice` - Preço mínimo
- `maxPrice` - Preço máximo
- `supplierId` - Filtra por fornecedor
- `limit` - Quantidade de resultados (default: 10)
- `offset` - Paginação (default: 0)

**Exemplo:**

```bash
GET /api/products?name=notebook&minPrice=1000&maxPrice=5000&limit=20
```

**Response:**

```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Notebook Dell",
      "description": "Notebook de alta performance",
      "price": 3500.0,
      "image": "https://example.com/image.jpg",
      "category": "Eletrônicos",
      "supplier": {
        "id": "uuid",
        "name": "Fornecedor Brasileiro"
      }
    }
  ],
  "total": 45
}
```

#### GET `/products/:id`

Obtém detalhes de um produto específico

#### POST `/products` 🔒

Cria um novo produto manualmente

#### PATCH `/products/:id` 🔒

Atualiza um produto existente

#### DELETE `/products/:id` 🔒

Remove um produto

#### POST `/products/sync` 🔒

**Sincroniza produtos dos fornecedores externos**

Este é o endpoint mais importante! Ele busca produtos dos dois fornecedores e os adiciona ao banco de dados.

**Response:**

```json
{
  "success": true,
  "message": "Sincronização concluída: 50 criados, 0 atualizados, 0 ignorados",
  "stats": {
    "totalSuppliers": 2,
    "successfulSuppliers": 2,
    "failedSuppliers": 0,
    "productsCreated": 50,
    "productsUpdated": 0,
    "productsSkipped": 0
  }
}
```

---

### 🏭 Fornecedores

#### GET `/suppliers`

Lista todos os fornecedores

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Fornecedor Brasileiro",
    "type": "brazilian",
    "apiUrl": "http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/brazilian_provider",
    "isActive": true
  }
]
```

#### POST `/suppliers` 🔒

Cria um novo fornecedor

**Body:**

```json
{
  "name": "Novo Fornecedor",
  "type": "brazilian",
  "apiUrl": "https://api.fornecedor.com/products",
  "isActive": true
}
```

#### PATCH `/suppliers/:id` 🔒

Atualiza um fornecedor

#### DELETE `/suppliers/:id` 🔒

Remove um fornecedor

---

### 👥 Usuários

#### GET `/users` 🔒

Lista todos os usuários

#### GET `/users/:id` 🔒

Obtém um usuário específico

#### POST `/users` 🔒

Cria um novo usuário

#### PATCH `/users/:id` 🔒

Atualiza um usuário

#### DELETE `/users/:id` 🔒

Remove um usuário

---

## 🔌 WebSockets (Eventos em Tempo Real)

O sistema utiliza Socket.io para notificações em tempo real.

### Conectar ao WebSocket

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/events', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Conectado ao servidor WebSocket');
});
```

### Eventos Disponíveis

| Evento             | Descrição                         |
| ------------------ | --------------------------------- |
| `supplier:created` | Novo fornecedor criado            |
| `supplier:updated` | Fornecedor atualizado             |
| `supplier:removed` | Fornecedor removido               |
| `product:created`  | Novo produto disponível           |
| `product:updated`  | Produto atualizado                |
| `product:removed`  | Produto removido                  |
| `client:created`   | Nova loja criada                  |
| `client:updated`   | Configurações da loja atualizadas |
| `client:removed`   | Loja removida                     |

### Exemplo de Uso

```javascript
// Escutar novos produtos
socket.on('product:created', (data) => {
  console.log('Novo produto:', data);
  // { id, name, price, clientId }
});

// Escutar atualizações de produtos
socket.on('product:updated', (data) => {
  console.log('Produto atualizado:', data);
});
```

---

## 🎨 Sistema Whitelabel

O sistema identifica automaticamente o cliente pelo **domínio da requisição**.

### Como Funciona?

1. O `ClientMiddleware` intercepta todas as requisições
2. Extrai o domínio do header `Host`
3. Busca o cliente no banco de dados
4. Anexa as informações do cliente à requisição

### Configuração Local (/etc/hosts)

Para testar localmente com diferentes domínios:

#### Linux/Mac:

```bash
sudo nano /etc/hosts
```

#### Windows:

```
C:\Windows\System32\drivers\etc\hosts
```

Adicione as linhas:

```
127.0.0.1 devnology.com
127.0.0.1 in8.com
```

### Testando o Whitelabel

```bash
# Cliente Devnology (tema verde)
curl http://devnology.com:3000/api/products

# Cliente In8 (tema roxo)
curl http://in8.com:3000/api/products
```

Cada cliente terá suas próprias cores e logo retornados nas requisições.

---

## 🧪 Testando a API

### Com cURL

#### 1. Fazer Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

Guarde o `access_token` retornado.

#### 2. Sincronizar Produtos

```bash
curl -X POST http://localhost:3000/api/products/sync \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### 3. Listar Produtos

```bash
curl http://localhost:3000/api/products
```

#### 4. Filtrar Produtos

```bash
curl "http://localhost:3000/api/products?category=Eletrônicos&minPrice=1000"
```

### Com Postman/Insomnia

Importe a collection disponível em: `docs/postman_collection.json`

A collection inclui:

- ✅ Todos os endpoints documentados
- ✅ Exemplos de requisições
- ✅ Variáveis de ambiente configuradas
- ✅ Testes automatizados

---

## 🔗 APIs dos Fornecedores

O sistema integra com duas APIs externas:

### Fornecedor Brasileiro

```
Base URL: http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/brazilian_provider

GET /brazilian_provider        # Lista todos os produtos
GET /brazilian_provider/:id    # Busca produto por ID
```

**Estrutura de resposta:**

```json
{
  "id": "1",
  "nome": "Produto",
  "descricao": "Descrição",
  "preco": "100.00",
  "imagem": "url",
  "categoria": "Categoria",
  "material": "Material",
  "departamento": "Departamento"
}
```

### Fornecedor Europeu

```
Base URL: http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/european_provider

GET /european_provider         # Lista todos os produtos
GET /european_provider/:id     # Busca produto por ID
```

**Estrutura de resposta:**

```json
{
  "id": "1",
  "name": "Product",
  "description": "Description",
  "price": "100.00",
  "gallery": ["url1", "url2"],
  "hasDiscount": false,
  "discountValue": "0"
}
```

---

## 📚 Documentação Adicional

### Estrutura de Pastas

```
src/
├── auth/               # Módulo de autenticação
│   ├── guards/         # Guards JWT e Local
│   ├── strategies/     # Estratégias Passport
│   └── dto/            # DTOs de login/register
├── users/              # Módulo de usuários
├── clients/            # Módulo de clientes (whitelabel)
│   └── middleware/     # Middleware de identificação
├── products/           # Módulo de produtos
│   ├── entities/       # Entidade Product
│   └── dto/            # DTOs de produtos
├── suppliers/          # Módulo de fornecedores
├── events/             # Módulo WebSocket
├── database/           # Configuração TypeORM
└── interfaces/         # Interfaces compartilhadas
```

### Scripts Disponíveis

```json
{
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:prod": "node dist/main",
  "build": "nest build",
  "seed:suppliers": "ts-node -r tsconfig-paths/register src/scripts/init-suppliers.ts",
  "seed:clients": "ts-node -r tsconfig-paths/register src/scripts/init-clients.ts",
  "seed:admin": "ts-node -r tsconfig-paths/register src/scripts/init-admin.ts",
  "seed:all": "npm run seed:suppliers && npm run seed:clients && npm run seed:admin"
}
```

---

## ✅ Critérios do Processo Seletivo Atendidos

### Backend (API NestJS)

- ✅ **Desenvolvido com NestJS** - Framework utilizado
- ✅ **Funcionalidade de Login** - JWT implementado
- ✅ **Diferenciação de Clientes** - Middleware por domínio
- ✅ **Collection e Documentação** - Postman collection disponível
- ✅ **DER do Banco de Dados** - Diagrama visual + SQL

### Funcionalidades Extras

- ✅ WebSockets para eventos em tempo real
- ✅ Sistema de logs e auditoria
- ✅ Filtros avançados de produtos
- ✅ Validação robusta com DTOs
- ✅ Tratamento de erros adequado
- ✅ Código limpo e bem documentado

---

## 🐛 Troubleshooting

### Erro de conexão com banco de dados

```bash
# Verifique se o PostgreSQL está rodando
sudo systemctl status postgresql

# Teste a conexão
psql -U postgres -h localhost
```

### Erro ao sincronizar produtos

```bash
# Verifique se os fornecedores estão cadastrados
curl http://localhost:3000/api/suppliers

# Verifique os logs
npm run start:dev
```

### Token JWT inválido

```bash
# Faça login novamente para obter um novo token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "seu@email.com", "password": "senha"}'
```

---

## 📞 Suporte

Para dúvidas ou problemas:

- 📧 Email: pedro.antonio@in8.com.br
- 📝 Issues: Abra uma issue no repositório

---

## 📄 Licença

Este projeto foi desenvolvido como parte do processo seletivo 2025.

---

## 👨‍💻 Autor

Desenvolvido para o processo seletivo - Caique Junior

**Data de Entrega:** Até 28 de novembro de 2025, 23:59

---

**🚀 Boa sorte com a avaliação!**
