
# API de E-commerce Whitelabel

Esta é a API para um projeto de e-commerce whitelabel desenvolvido como parte de um processo seletivo. A API gerencia produtos de diferentes fornecedores e pode ser configurada para diferentes clientes (lojas).

## Tecnologias utilizadas

- NestJS como framework backend
- TypeORM para ORM (Object-Relational Mapping)
- PostgreSQL como banco de dados
- JWT para autenticação
- Swagger para documentação da API

## Estrutura do Projeto

A API segue uma arquitetura modular, com os seguintes módulos principais:

- **Auth**: Autenticação e autorização
- **Users**: Gerenciamento de usuários
- **Clients**: Gerenciamento de clientes whitelabel
- **Products**: Gerenciamento de produtos
- **Suppliers**: Gerenciamento de fornecedores

## Diagrama de Entidade Relacionamento (DER)

A estrutura do banco de dados inclui as seguintes entidades principais:

- **Users**: Usuários do sistema
  - id (UUID)
  - email (String, Unique)
  - name (String)
  - password (String, Hashed)
  - role (String)
  - clientId (UUID, FK)
  - isActive (Boolean)
  - createdAt (DateTime)
  - updatedAt (DateTime)

- **Clients**: Clientes whitelabel
  - id (UUID)
  - name (String, Unique)
  - domain (String, Unique)
  - logo (String)
  - primaryColor (String)
  - secondaryColor (String)
  - isActive (Boolean)
  - createdAt (DateTime)
  - updatedAt (DateTime)

- **Products**: Produtos
  - id (UUID)
  - name (String)
  - description (String)
  - price (Decimal)
  - image (String)
  - gallery (String[])
  - category (String)
  - material (String)
  - department (String)
  - discountValue (String)
  - hasDiscount (Boolean)
  - details (JSON)
  - externalId (String)
  - supplierId (UUID, FK)
  - createdAt (DateTime)
  - updatedAt (DateTime)

- **Suppliers**: Fornecedores
  - id (UUID)
  - name (String, Unique)
  - type (String)
  - apiUrl (String)
  - isActive (Boolean)
  - createdAt (DateTime)
  - updatedAt (DateTime)

## Configuração de Desenvolvimento

### Pré-requisitos

- Node.js (v16+)
- npm (v7+)
- PostgreSQL (v12+)

### Instalação

1. Clone o repositório
   ```
   git clone https://github.com/seu-usuario/e-commerce-whitelabel.git
   cd e-commerce-whitelabel/api
   ```

2. Instale as dependências
   ```
   npm install
   ```

3. Copie o arquivo `.env.example` para `.env` e configure as variáveis de ambiente
   ```
   cp .env.example .env
   ```

4. Configure o arquivo `/etc/hosts` para o modo whitelabel
   ```
   127.0.0.1 loja-a.localhost
   127.0.0.1 loja-b.localhost
   ```

5. Inicie o banco de dados PostgreSQL

6. Execute as migrações (ou use o modo synchronize no desenvolvimento)
   ```
   npm run start:dev
   ```

7. Popule o banco de dados com dados iniciais
   ```
   npm run seed:all
   ```

### Executando a Aplicação

Para desenvolvimento:
```
npm run start:dev
```

Para produção:
```
npm run build
npm run start:prod
```

## Endpoints da API

A API disponibiliza os seguintes endpoints principais:

### Autenticação
- `POST /api/auth/login`: Autenticação de usuários

### Usuários
- `GET /api/users`: Listar todos os usuários
- `POST /api/users`: Criar novo usuário
- `GET /api/users/:id`: Obter usuário por ID
- `PATCH /api/users/:id`: Atualizar usuário
- `DELETE /api/users/:id`: Remover usuário

### Clientes
- `GET /api/clients`: Listar todos os clientes
- `POST /api/clients`: Criar novo cliente
- `GET /api/clients/:id`: Obter cliente por ID
- `GET /api/clients/current`: Obter cliente atual (baseado no domínio)
- `PATCH /api/clients/:id`: Atualizar cliente
- `DELETE /api/clients/:id`: Remover cliente

### Produtos
- `GET /api/products`: Listar todos os produtos (com filtros)
- `POST /api/products`: Criar novo produto
- `GET /api/products/:id`: Obter produto por ID
- `PATCH /api/products/:id`: Atualizar produto
- `DELETE /api/products/:id`: Remover produto
- `POST /api/products/sync`: Sincronizar produtos dos fornecedores

### Fornecedores
- `GET /api/suppliers`: Listar todos os fornecedores
- `POST /api/suppliers`: Criar novo fornecedor
- `GET /api/suppliers/:id`: Obter fornecedor por ID
- `GET /api/suppliers/:id/products`: Obter produtos do fornecedor
- `PATCH /api/suppliers/:id`: Atualizar fornecedor
- `DELETE /api/suppliers/:id`: Remover fornecedor

## Funcionalidades Implementadas

- [x] Login de usuários
- [x] Identificação de cliente por domínio (whitelabel)
- [x] Listagem e filtragem de produtos
- [x] Sincronização de produtos dos fornecedores
- [x] Gestão de usuários, clientes, produtos e fornecedores
- [x] Autenticação JWT

## Funcionalidades Adicionais

- [x] Middleware para identificação de clientes pelo domínio
- [x] Scripts para inicialização de dados
- [x] Filtros avançados para produtos
- [x] Validação de dados com class-validator
- [x] Transformação de dados com class-transformer

## Autor

Desenvolvido como parte do processo seletivo 2025.
