# E-commerce Whitelabel API - Processo Seletivo 2025

Este projeto é uma API para um sistema de e-commerce whitelabel construído com NestJS, desenvolvido como parte do processo seletivo 2025.

## 📋 Descrição

Esta API permite que diferentes clientes utilizem a mesma plataforma de e-commerce com suas próprias personalizações (whitelabel). O sistema consome produtos de dois fornecedores externos e os disponibiliza para os clientes.

## 🧪 Tecnologias

- [NestJS](https://nestjs.com/) - Framework Node.js para backend
- [TypeORM](https://typeorm.io/) - ORM para interação com banco de dados
- [PostgreSQL](https://www.postgresql.org/) - Banco de dados relacional
- [JWT](https://jwt.io/) - Autenticação baseada em tokens
- [Socket.io](https://socket.io/) - Comunicação em tempo real
- [Class Validator](https://github.com/typestack/class-validator) - Validação de dados

## 🏗️ Arquitetura

O projeto segue uma arquitetura modular baseada em NestJS, utilizando o padrão de projeto Repository e seguindo os princípios de Injeção de Dependência.

### Módulos Principais

- **AuthModule**: Gerencia autenticação e autorização
- **UsersModule**: Gerencia usuários do sistema
- **ClientsModule**: Gerencia os clientes (lojas) whitelabel
- **ProductsModule**: Gerencia produtos e integração com fornecedores
- **SuppliersModule**: Gerencia fornecedores externos
- **EventsModule**: Gerencia comunicação em tempo real via WebSockets

## 🗂️ Estrutura do Banco de Dados

![Diagrama ER](/er-diagram.png)

O sistema utiliza PostgreSQL com as seguintes tabelas principais:

- `clients`: Armazena os dados dos clientes whitelabel (domínio, cores, logo)
- `users`: Usuários do sistema associados a um cliente específico
- `suppliers`: Fornecedores externos que disponibilizam produtos
- `products`: Produtos de todos os fornecedores
- `orders`: Pedidos realizados pelos usuários
- `order_items`: Itens individuais de cada pedido

## 🚀 Instalação e Execução

### Pré-requisitos

- Node.js (v18 ou superior)
- npm ou yarn
- PostgreSQL (v14 ou superior)

### Configuração do Banco de Dados

1. Crie um banco de dados PostgreSQL:

```sql
CREATE DATABASE e_commerce_whitelabel;
```

2. Execute o script de criação das tabelas:

```bash
psql -U seu_usuario -d e_commerce_whitelabel -a -f database_script.sql
```

O script completo de criação do banco está disponível no arquivo `database_script.sql` na raiz do projeto.

### Instalação das Dependências

```bash
# Instalar dependências
npm install

# Ou usando yarn
yarn install
```

### Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=seu_usuario
DATABASE_PASSWORD=sua_senha
DATABASE_NAME=whitelabel_system

# JWT
JWT_SECRET=seu_segredo_jwt
JWT_EXPIRES_IN=1d

# App
PORT=3000
```

### População Inicial do Banco

O projeto inclui scripts para criar dados iniciais:

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

### Execução

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

## 📝 Endpoints da API

### Autenticação

- **POST** `/api/auth/login` - Login
- **POST** `/api/auth/register` - Registro

### Clientes (Whitelabel)

- **GET** `/api/clients` - Listar todos os clientes
- **GET** `/api/clients/:id` - Obter um cliente específico
- **POST** `/api/clients` - Criar novo cliente
- **PATCH** `/api/clients/:id` - Atualizar cliente
- **DELETE** `/api/clients/:id` - Remover cliente

### Produtos

- **GET** `/api/products` - Listar produtos (com filtros)
- **GET** `/api/products/:id` - Obter produto específico
- **POST** `/api/products` - Criar produto
- **PATCH** `/api/products/:id` - Atualizar produto
- **DELETE** `/api/products/:id` - Remover produto
- **POST** `/api/products/sync` - Sincronizar produtos dos fornecedores

### Fornecedores

- **GET** `/api/suppliers` - Listar fornecedores
- **GET** `/api/suppliers/:id` - Obter fornecedor específico
- **POST** `/api/suppliers` - Criar fornecedor
- **PATCH** `/api/suppliers/:id` - Atualizar fornecedor
- **DELETE** `/api/suppliers/:id` - Remover fornecedor

### Usuários

- **GET** `/api/users` - Listar usuários
- **GET** `/api/users/:id` - Obter usuário específico
- **POST** `/api/users` - Criar usuário
- **PATCH** `/api/users/:id` - Atualizar usuário
- **DELETE** `/api/users/:id` - Remover usuário

## 🔌 WebSockets

O sistema utiliza Socket.io para notificações em tempo real. Eventos disponíveis:

- **supplier:created** - Novo fornecedor criado
- **supplier:updated** - Fornecedor atualizado
- **supplier:removed** - Fornecedor removido
- **product:created** - Novo produto disponível
- **product:updated** - Produto atualizado
- **product:removed** - Produto removido
- **client:created** - Nova loja criada
- **client:updated** - Configurações da loja atualizadas
- **client:removed** - Loja removida

## 🧪 Testando via Postman

1. Inicialize a aplicação:

   ```bash
   npm run start:dev
   ```

2. Faça login para obter um token:
   - **POST** `http://localhost:3000/api/auth/login`
   - Body:
     ```json
     {
       "email": "admin@example.com",
       "password": "admin123"
     }
     ```
   - Guarde o token `access_token` retornado

3. Use o token em todas as requisições protegidas:
   - Headers: `Authorization: Bearer [seu-token]`

4. Para sincronizar produtos dos fornecedores:
   - **POST** `http://localhost:3000/api/products/sync`
   - Esta requisição buscará produtos do Fornecedor Brasileiro e Fornecedor Europeu automaticamente

5. Para listar produtos sincronizados:
   - **GET** `http://localhost:3000/api/products`
   - Você pode usar filtros como: `?name=termo&category=categoria&minPrice=10&maxPrice=100&supplierId=id-fornecedor`

## 🔒 Whitelabel

O sistema identifica o cliente pelo domínio da requisição. Para testar localmente:

1. Configure o arquivo `/etc/hosts` para mapear domínios locais:

   ```
   127.0.0.1 devnology.com in8.com
   ```

2. Acesse a API usando os diferentes domínios:
   - `http://devnology.com:3000/api/products` - Tema verde
   - `http://in8.com:3000/api/products` - Tema roxo

## 📦 Observações Importantes

- O sistema já está configurado para buscar produtos dos fornecedores especificados no processo seletivo
- Os nomes dos fornecedores já estão configurados como "Fornecedor Brasileiro" e "Fornecedor Europeu"
- A sincronização de produtos deve ser executada manualmente através do endpoint `/api/products/sync`
- O Middleware `ClientMiddleware` identifica automaticamente o cliente pelo domínio da requisição
- O sistema utiliza WebSockets para notificar eventos em tempo real

## 🧱 Requisitos Atendidos

- ✅ Desenvolvido com NestJS
- ✅ Funcionalidade de Login/Autenticação
- ✅ Listagem e filtragem de produtos
- ✅ Funcionalidade de Whitelabel
- ✅ Integração com APIs de fornecedores
