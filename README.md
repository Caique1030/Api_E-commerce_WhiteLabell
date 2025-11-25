# 🛒 E-commerce Whitelabel API

> API completa para sistema de e-commerce whitelabel construído com NestJS, TypeScript e PostgreSQL

[![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql)](https://www.postgresql.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📋 Descrição

Esta API permite que diferentes clientes (lojas) utilizem a mesma plataforma de e-commerce com suas próprias personalizações visuais (whitelabel). O sistema consome produtos de **dois fornecedores externos** e os disponibiliza através de endpoints próprios com sincronização automática.

### 🎯 Principais Funcionalidades

- ✅ **Autenticação JWT** - Sistema de autenticação sem LocalStrategy (validação direta)
- ✅ **Sistema Whitelabel** - Identificação automática de cliente por domínio
- ✅ **Integração com Fornecedores** - Sincronização automática de produtos de múltiplas APIs
- ✅ **Listagem e Filtros Avançados** - Busca por nome, categoria, preço e fornecedor
- ✅ **WebSockets** - Notificações em tempo real via Socket.io
- ✅ **CRUD Completo** - Produtos, Clientes, Fornecedores e Usuários
- ✅ **Inicialização Automática** - Criação automática de banco e dados iniciais
- ✅ **CORS Configurado** - Suporte para múltiplos domínios e ambientes

---

## 🏗️ Arquitetura

O projeto segue uma **arquitetura modular** baseada em NestJS, utilizando:

- **Clean Architecture** - Separação clara entre camadas de domínio, aplicação e infraestrutura
- **Repository Pattern** - Isolamento da lógica de acesso aos dados
- **Dependency Injection** - Gerenciamento automático de dependências pelo NestJS
- **DTOs e Validation** - Validação de dados com class-validator e class-transformer
- **Middleware** - Identificação automática de cliente por domínio (x-client-domain ou host)
- **Guards Customizados** - Proteção de rotas sem dependência de LocalStrategy
- **WebSockets** - Comunicação bidirecional em tempo real
- **Request Scope** - Injeção de contexto da requisição para multi-tenancy

### 📦 Módulos Principais

| Módulo                   | Responsabilidade                                                    |
| ------------------------ | ------------------------------------------------------------------- |
| **AuthModule**           | Autenticação JWT (sem LocalStrategy, validação direta)              |
| **UsersModule**          | Gerenciamento completo de usuários                                  |
| **ClientsModule**        | Gerenciamento de clientes whitelabel (domínio, cores, logo)         |
| **ProductsModule**       | Sincronização e gerenciamento de produtos de múltiplos fornecedores |
| **SuppliersModule**      | Gerenciamento de fornecedores externos (brazilian/european)         |
| **EventsModule**         | WebSockets para notificações em tempo real                          |
| **DatabaseModule**       | Configuração TypeORM e criação automática do banco                  |
| **InitializationModule** | População automática de dados iniciais (clientes e fornecedores)    |

---

## 🗄️ Estrutura do Banco de Dados

### 📊 Tabelas Principais

| Tabela        | Descrição                                                           |
| ------------- | ------------------------------------------------------------------- |
| **clients**   | Clientes whitelabel (domínio, primary_color, secondary_color, logo) |
| **users**     | Usuários do sistema vinculados a um cliente específico              |
| **suppliers** | Fornecedores externos (brazilian, european) com URLs das APIs       |
| **products**  | Produtos sincronizados de todos os fornecedores                     |

#### 🔗 Relacionamentos Principais

```
clients (1) ──→ (N) users
clients (1) ──→ (N) products
suppliers (1) ──→ (N) products
```

### 🗂️ Entidades TypeORM

#### Product Entity

```typescript
- id: UUID (PK)
- name: string
- description: text
- price: numeric(10,2)
- image: string (URL)
- gallery: string[] (array de URLs)
- category: string
- material: string (apenas fornecedor brasileiro)
- department: string (apenas fornecedor brasileiro)
- discountValue: string
- hasDiscount: boolean
- externalId: string (ID do fornecedor)
- supplierId: UUID (FK)
- clientId: UUID (FK)
- createdAt: timestamp
- updatedAt: timestamp
```

---

## 🧰 Tecnologias Utilizadas

### Backend Core

- **[NestJS](https://nestjs.com/)** v11.x - Framework Node.js progressivo para aplicações server-side
- **[TypeScript](https://www.typescriptlang.org/)** v5.7 - JavaScript com tipagem estática
- **[TypeORM](https://typeorm.io/)** v0.3 - ORM TypeScript/JavaScript para bancos relacionais

### Banco de Dados

- **[PostgreSQL](https://www.postgresql.org/)** v14+ - Banco de dados relacional com suporte a JSONB

### Autenticação & Segurança

- **[@nestjs/passport](https://www.npmjs.com/package/@nestjs/passport)** v11.x - Integração Passport com NestJS
- **[@nestjs/jwt](https://www.npmjs.com/package/@nestjs/jwt)** - JWT tokens para autenticação stateless
- **[bcrypt](https://www.npmjs.com/package/bcrypt)** - Hash seguro de senhas

### Validação & Transformação

- **[class-validator](https://github.com/typestack/class-validator)** - Validação baseada em decorators
- **[class-transformer](https://github.com/typestack/class-transformer)** - Transformação e serialização

### Comunicação em Tempo Real

- **[Socket.io](https://socket.io/)** v4.x - WebSockets para eventos em tempo real
- **[@nestjs/websockets](https://www.npmjs.com/package/@nestjs/websockets)** - Integração WebSocket

### HTTP & APIs Externas

- **[Axios](https://axios-http.com/)** - Cliente HTTP para consumir APIs dos fornecedores

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
```

### 3️⃣ Configure as Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de Dados
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=sua_senha
DATABASE_NAME=e_commerce_whitelabel

# JWT
JWT_SECRET=seu_segredo_super_seguro_aqui_12345
JWT_EXPIRES_IN=1d

# Aplicação
PORT=3000
NODE_ENV=development
```

### 4️⃣ Inicie a Aplicação

```bash
# Modo desenvolvimento (com hot-reload)
npm run start:dev
```

**🎉 Pronto!** O sistema irá:

1. ✅ Criar automaticamente o banco de dados `e_commerce_whitelabel`
2. ✅ Executar todas as migrations do TypeORM
3. ✅ Popular dados iniciais (3 clientes e 2 fornecedores)
4. ✅ Iniciar o servidor HTTP em `http://localhost:3000`
5. ✅ Iniciar o servidor WebSocket em `ws://localhost:3000/events`

**Logs esperados:**

```bash
✔ Database 'e_commerce_whitelabel' já existe.
[NestFactory] Starting Nest application...
[InitializationService] 🌱 Iniciando verificação de dados...
[InitializationService] ✔ Cliente já existe: Devnology
[InitializationService] ✔ Cliente já existe: IN8
[InitializationService] ✔ Cliente já existe: Localhost Client
[InitializationService] ✔ Fornecedor já existe: Fornecedor Brasileiro
[InitializationService] ✔ Fornecedor já existe: Fornecedor Europeu
[InitializationService] ✅ Dados iniciais verificados e inseridos quando necessário!
🚀 Application is running on: http://localhost:3000
📡 WebSocket Server available at: ws://localhost:3000/events
```

---

## 📡 Endpoints da API

### Base URL

```
http://localhost:3000/api
```

### 🔐 Autenticação

#### POST `/auth/register`

Registra um novo usuário para o cliente identificado pelo domínio

**Headers:**

```
X-Client-Domain: devnology.com
# ou deixe que o sistema detecte automaticamente pelo Host
```

**Body:**

```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123",
  "role": "user"
}
```

**Response:**

```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "role": "user",
  "clientId": "uuid",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

#### POST `/auth/login`

Realiza login do usuário (validação direta sem LocalStrategy)

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
    "email": "joao@example.com",
    "role": "user",
    "clientId": "uuid"
  }
}
```

---

### 🏢 Clientes (Whitelabel)

#### GET `/clients`

Lista todos os clientes cadastrados

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Devnology",
    "domain": "devnology.com",
    "primaryColor": "#2ecc71",
    "secondaryColor": "#27ae60",
    "logo": null,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

#### GET `/clients/:id`

Obtém detalhes de um cliente específico

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
- `limit` - Quantidade de resultados (padrão: 150, use -1 para todos)
- `offset` - Paginação (padrão: 0)

**Exemplo:**

```bash
GET /api/products?category=Eletrônicos&minPrice=1000&limit=20
```

**Response:**

```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Notebook",
      "description": "Notebook de alta performance",
      "price": 3500.0,
      "image": "https://example.com/image.jpg",
      "gallery": ["url1", "url2"],
      "category": "Eletrônicos",
      "material": "Plástico",
      "department": "Informática",
      "discountValue": "10%",
      "hasDiscount": true,
      "externalId": "123",
      "supplierId": "uuid",
      "supplier": {
        "id": "uuid",
        "name": "Fornecedor Brasileiro",
        "type": "brazilian"
      }
    }
  ],
  "total": 150
}
```

#### GET `/products/:id`

Obtém detalhes completos de um produto específico

#### POST `/products/sync` 🔒

Sincroniza produtos de todos os fornecedores cadastrados

**Headers:**

```
Authorization: Bearer <seu_token>
```

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

Lista todos os fornecedores cadastrados

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Fornecedor Brasileiro",
    "type": "brazilian",
    "apiUrl": "http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/brazilian_provider",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

#### GET `/suppliers/:id`

Obtém detalhes de um fornecedor específico

#### GET `/suppliers/:id/products`

Lista produtos de um fornecedor específico

#### GET `/suppliers/:id/products/:productId`

Obtém um produto específico de um fornecedor

---

### 👥 Usuários

#### GET `/users` 🔒

Lista todos os usuários

#### GET `/users/profile` 🔒

Obtém perfil do usuário autenticado

#### GET `/users/:id` 🔒

Obtém um usuário específico

#### PATCH `/users/profile` 🔒

Atualiza perfil do usuário autenticado

#### PATCH `/users/change-password` 🔒

Altera senha do usuário autenticado

**Body:**

```json
{
  "oldPassword": "senha_antiga",
  "newPassword": "senha_nova"
}
```

---

## 🔌 WebSockets (Eventos em Tempo Real)

### Conectar ao WebSocket

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/events', {
  transports: ['websocket'],
  auth: {
    token: 'seu_jwt_token_aqui', // Opcional
  },
});

socket.on('connect', () => {
  console.log('Conectado ao servidor WebSocket');
  console.log('Socket ID:', socket.id);
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
  // { id, name, price, supplierId, clientId }
});

// Escutar atualizações de produtos
socket.on('product:updated', (data) => {
  console.log('Produto atualizado:', data);
});

// Escutar sincronização de produtos
socket.on('products:synced', (stats) => {
  console.log('Produtos sincronizados:', stats);
  // { productsCreated, productsUpdated, totalSuppliers }
});
```

---

## 🎨 Sistema Whitelabel

O sistema identifica automaticamente o cliente através do **domínio da requisição**.

### Como Funciona?

1. **ClientMiddleware** intercepta todas as requisições
2. Extrai o domínio de: `X-Client-Domain` header → `Host` header
3. Busca o cliente no banco de dados
4. Anexa as informações do cliente à requisição (`req.client`)

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
# Cliente Devnology (tema verde: #2ecc71)
curl http://devnology.com:3000/api/products

# Cliente In8 (tema roxo: #8e44ad)
curl http://in8.com:3000/api/products

# Localhost (tema verde padrão)
curl http://localhost:3000/api/products
```

---

## 🧪 Testando a API

### Com cURL

#### 1. Fazer Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com",
    "password": "senha123"
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
curl "http://localhost:3000/api/products?category=Eletrônicos&minPrice=1000&limit=10"
```

#### 5. Buscar por Nome

```bash
curl "http://localhost:3000/api/products?name=notebook"
```

---

## 📗 APIs dos Fornecedores

### Fornecedor Brasileiro

```
Base URL: http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/brazilian_provider
```

**Endpoints:**

- `GET /brazilian_provider` - Lista todos os produtos
- `GET /brazilian_provider/:id` - Busca produto por ID

**Estrutura de resposta:**

```json
{
  "id": "1",
  "nome": "Produto Brasileiro",
  "descricao": "Descrição detalhada",
  "preco": "100.00",
  "imagem": "https://example.com/image.jpg",
  "categoria": "Eletrônicos",
  "material": "Plástico",
  "departamento": "Informática"
}
```

### Fornecedor Europeu

```
Base URL: http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/european_provider
```

**Endpoints:**

- `GET /european_provider` - Lista todos os produtos
- `GET /european_provider/:id` - Busca produto por ID

**Estrutura de resposta:**

```json
{
  "id": "1",
  "name": "European Product",
  "description": "Detailed description",
  "price": "100.00",
  "gallery": ["url1", "url2", "url3"],
  "hasDiscount": true,
  "discountValue": "10%"
}
```

---

## 📚 Estrutura do Projeto

```
src/
├── auth/                    # Módulo de autenticação
│   ├── guards/              # Guards JWT customizados
│   │   └── jwt-auth.guard.ts
│   ├── strategies/          # Estratégias Passport
│   │   └── jwt.strategy.ts  # Apenas JWT (LocalStrategy removido)
│   ├── dto/                 # DTOs de login/register
│   ├── auth.controller.ts   # Controller (sem LocalAuthGuard)
│   ├── auth.service.ts      # Service com validateUser()
│   └── auth.module.ts       # Module simplificado
├── users/                   # Módulo de usuários
│   ├── entities/            # Entidade User
│   ├── dto/                 # DTOs de usuários
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── clients/                 # Módulo de clientes (whitelabel)
│   ├── entities/            # Entidade Client
│   ├── middleware/          # ClientMiddleware (identificação)
│   ├── clients.controller.ts
│   ├── clients.service.ts
│   └── clients.module.ts
├── products/                # Módulo de produtos
│   ├── entities/            # Entidade Product
│   ├── dto/                 # FilterProductsDto
│   ├── products.controller.ts
│   ├── products.service.ts  # Sincronização e normalização
│   └── products.module.ts
├── suppliers/               # Módulo de fornecedores
│   ├── entities/            # Entidade Supplier
│   ├── suppliers.controller.ts
│   ├── suppliers.service.ts # Integração com APIs externas
│   └── suppliers.module.ts
├── events/                  # Módulo WebSocket
│   ├── events.gateway.ts    # Socket.io Gateway
│   └── events.module.ts
├── database/                # Configuração do banco
│   ├── database.module.ts   # TypeORM config
│   └── create-database.ts   # Script de criação automática
├── initialization/          # Módulo de inicialização
│   ├── initialization.service.ts  # Seed automático
│   └── initialization.module.ts
├── config/                  # Configurações globais
│   └── config.ts            # Carregamento de variáveis .env
├── interfaces/              # Interfaces compartilhadas
│   ├── client.interface.ts
│   ├── product.interface.ts
│   └── supplier.interface.ts
├── app.module.ts            # Módulo raiz
└── main.ts                  # Bootstrap da aplicação
```

---

## 🔧 Scripts Disponíveis

```json
{
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:prod": "node dist/main",
  "build": "nest build",
  "format": "prettier --write \"src/**/*.ts\"",
  "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
}
```

---

## 🛠️ Troubleshooting

### ❌ Erro: "Unknown authentication strategy 'local'"

**Solução:** Este erro foi corrigido! A autenticação agora usa validação direta no controller sem depender de LocalStrategy.

```typescript
// Novo método de login (sem LocalAuthGuard)
@Post('login')
async login(@Body() loginDto: LoginDto) {
  const user = await this.authService.validateUser(email, password);
  if (!user) throw new UnauthorizedException('Credenciais inválidas');
  return this.authService.login(user, domain);
}
```

### ❌ Erro de conexão com banco de dados

```bash
# Verifique se o PostgreSQL está rodando
sudo systemctl status postgresql

# Teste a conexão
psql -U postgres -h localhost
```

### ❌ Erro ao sincronizar produtos

```bash
# Verifique se os fornecedores estão cadastrados
curl http://localhost:3000/api/suppliers

# Verifique os logs
npm run start:dev
```

### ❌ Token JWT inválido

```bash
# Faça login novamente para obter um novo token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "seu@email.com", "password": "senha"}'
```

### ❌ CORS Error

O sistema já está configurado para aceitar requisições de:

- `http://localhost:8000`
- `http://localhost:8080`
- `http://devnology.com:8000`
- `http://in8.com:8000`

---

## 🚀 Deploy

### Variáveis de Ambiente para Produção

```env
NODE_ENV=production
DATABASE_HOST=seu-host-postgres.com
DATABASE_PORT=5432
DATABASE_USERNAME=seu_usuario
DATABASE_PASSWORD=senha_segura
DATABASE_NAME=e_commerce_whitelabel
JWT_SECRET=secret_production_super_seguro_64_caracteres
JWT_EXPIRES_IN=7d
PORT=3000
```

### Build para Produção

```bash
npm run build
npm run start:prod
```

---

## 📄 Licença

Este projeto foi desenvolvido como parte de um processo seletivo.

---

## 👨‍💻 Autor

**Caique Junior**

Desenvolvido para demonstrar habilidades em:

- NestJS & TypeScript
- Arquitetura Clean & Modular
- Integração com APIs Externas
- WebSockets & Tempo Real
- Autenticação JWT
- Sistema Multi-tenant (Whitelabel)
- PostgreSQL & TypeORM

---

## 📞 Contato & Suporte

Para dúvidas ou sugestões sobre este projeto, entre em contato através dos canais apropriados do processo seletivo.

---

**Desenvolvido com ❤️ usando NestJS**
