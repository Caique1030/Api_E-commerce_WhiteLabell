# API E-Commerce Whitelabel - Documentação

## Diagrama de Entidade Relacionamento (DER)

```
+----------------+       +----------------+       +----------------+       +----------------+
|     Users      |       |    Clients     |       |    Products    |       |   Suppliers    |
+----------------+       +----------------+       +----------------+       +----------------+
| id (UUID) PK   |       | id (UUID) PK   |       | id (UUID) PK   |       | id (UUID) PK   |
| email          |       | name           |       | name           |       | name           |
| name           |       | domain         |       | description    |       | type           |
| password       |       | logo           |       | price          |       | apiUrl         |
| role           |       | primaryColor   |       | image          |       | isActive       |
| clientId FK    |------>| secondaryColor |       | gallery        |       | createdAt      |
| isActive       |       | isActive       |       | category       |       | updatedAt      |
| createdAt      |       | createdAt      |       | material       |       +----------------+
| updatedAt      |       | updatedAt      |       | department     |             ^
+----------------+       +----------------+       | discountValue  |             |
                                                 | hasDiscount    |             |
                                                 | details        |             |
                                                 | externalId     |             |
                                                 | supplierId FK  |-------------+
                                                 | createdAt      |
                                                 | updatedAt      |
                                                 +----------------+
```

## Documentação dos Endpoints da API

### Autenticação

#### Login de usuário
- **Método**: POST
- **Endpoint**: `/api/auth/login`
- **Autenticação**: Não necessária
- **Descrição**: Autentica um usuário e retorna um token JWT.
- **Corpo da Requisição**:
  ```json
  {
    "email": "usuario@exemplo.com",
    "password": "senha123"
  }
  ```
- **Resposta de Sucesso**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a8a4c7c9-2b4f-4c6e-8c8d-1d2e3f4g5h6i",
      "email": "usuario@exemplo.com",
      "name": "Nome do Usuário",
      "role": "user",
      "clientId": "a8a4c7c9-2b4f-4c6e-8c8d-1d2e3f4g5h6i"
    }
  }
  ```
- **Códigos de Resposta**:
  - `200 OK`: Login bem-sucedido
  - `401 Unauthorized`: Credenciais inválidas

### Usuários

#### Criar um novo usuário
- **Método**: POST
- **Endpoint**: `/api/users`
- **Autenticação**: Não necessária (para primeiro usuário) ou JWT (para outros usuários)
- **Descrição**: Cria um novo usuário no sistema.
- **Corpo da Requisição**:
  ```json
  {
    "name": "Nome do Usuário",
    "email": "usuario@exemplo.com",
    "password": "senha123",
    "role": "user",
    "clientId": "a8a4c7c9-2b4f-4c6e-8c8d-1d2e3f4g5h6i"
  }
  ```
- **Resposta de Sucesso**:
  ```json
  {
    "id": "a8a4c7c9-2b4f-4c6e-8c8d-1d2e3f4g5h6i",
    "name": "Nome do Usuário",
    "email": "usuario@exemplo.com",
    "role": "user",
    "isActive": true,
    "clientId": "a8a4c7c9-2b4f-4c6e-8c8d-1d2e3f4g5h6i",
    "createdAt": "2025-11-10T12:00:00.000Z",
    "updatedAt": "2025-11-10T12:00:00.000Z"
  }
  ```
- **Códigos de Resposta**:
  - `201 Created`: Usuário criado com sucesso
  - `400 Bad Request`: Dados inválidos
  - `409 Conflict`: Email já em uso

#### Listar todos os usuários
- **Método**: GET
- **Endpoint**: `/api/users`
- **Autenticação**: JWT
- **Descrição**: Lista todos os usuários do sistema.
- **Resposta de Sucesso**:
  ```json
  [
    {
      "id": "a8a4c7c9-2b4f-4c6e-8c8d-1d2e3f4g5h6i",
      "name": "Nome do Usuário",
      "email": "usuario@exemplo.com",
      "role": "user",
      "isActive": true,
      "clientId": "a8a4c7c9-2b4f-4c6e-8c8d-1d2e3f4g5h6i",
      "createdAt": "2025-11-10T12:00:00.000Z",
      "updatedAt": "2025-11-10T12:00:00.000Z"
    }
  ]
  ```
- **Códigos de Resposta**:
  - `200 OK`: Sucesso
  - `401 Unauthorized`: Token inválido

#### Obter um usuário pelo ID
- **Método**: GET
- **Endpoint**: `/api/users/:id`
- **Autenticação**: JWT
- **Descrição**: Retorna informações de um usuário específico.
- **Resposta de Sucesso**:
  ```json
  {
    "id": "a8a4c7c9-2b4f-4c6e-8c8d-1d2e3f4g5h6i",
    "name": "Nome do Usuário",
    "email": "usuario@exemplo.com",
    "role": "user",
    "isActive": true,
    "clientId": "a8a4c7c9-2b4f-4c6e-8c8d-1d2e3f4g5h6i",
    "createdAt": "2025-11-10T12:00:00.000Z",
    "updatedAt": "2025-11-10T12:00:00.000Z"
  }
  ```
- **Códigos de Resposta**:
  - `200 OK`: Sucesso
  - `401 Unauthorized`: Token inválido
  - `404 Not Found`: Usuário não encontrado

#### Atualizar um usuário
- **Método**: PATCH
- **Endpoint**: `/api/users/:id`
- **Autenticação**: JWT
- **Descrição**: Atualiza informações de um usuário.
- **Corpo da Requisição**:
  ```json
  {
    "name": "Novo Nome",
    "role": "admin"
  }
  ```
- **Resposta de Sucesso**:
  ```json
  {
    "id": "a8a4c7c9-2b4f-4c6e-8c8d-1d2e3f4g5h6i",
    "name": "Novo Nome",
    "email": "usuario@exemplo.com",
    "role": "admin",
    "isActive": true,
    "clientId": "a8a4c7c9-2b4f-4c6e-8c8d-1d2e3f4g5h6i",
    "createdAt": "2025-11-10T12:00:00.000Z",
    "updatedAt": "2025-11-10T12:15:00.000Z"
  }
  ```
- **Códigos de Resposta**:
  - `200 OK`: Sucesso
  - `400 Bad Request`: Dados inválidos
  - `401 Unauthorized`: Token inválido
  - `404 Not Found`: Usuário não encontrado

#### Remover um usuário
- **Método**: DELETE
- **Endpoint**: `/api/users/:id`
- **Autenticação**: JWT
- **Descrição**: Remove um usuário do sistema.
- **Códigos de Resposta**:
  - `204 No Content`: Sucesso
  - `401 Unauthorized`: Token inválido
  - `404 Not Found`: Usuário não encontrado

### Clientes (Whitelabel)

#### Criar um novo cliente
- **Método**: POST
- **Endpoint**: `/api/clients`
- **Autenticação**: JWT
- **Descrição**: Cria um novo cliente whitelabel.
- **Corpo da Requisição**:
  ```json
  {
    "name": "Loja A",
    "domain": "loja-a.localhost",
    "logo": "https://exemplo.com/logo.png",
    "primaryColor": "#FF5722",
    "secondaryColor": "#FFC107"
  }
  ```
- **Resposta de Sucesso**:
  ```json
  {
    "id": "b9b5d8d0-3c5g-5d7f-9d9e-2e3f4g5h6i7j",
    "name": "Loja A",
    "domain": "loja-a.localhost",
    "logo": "https://exemplo.com/logo.png",
    "primaryColor": "#FF5722",
    "secondaryColor": "#FFC107",
    "isActive": true,
    "createdAt": "2025-11-10T12:00:00.000Z",
    "updatedAt": "2025-11-10T12:00:00.000Z"
  }
  ```
- **Códigos de Resposta**:
  - `201 Created`: Cliente criado com sucesso
  - `400 Bad Request`: Dados inválidos
  - `401 Unauthorized`: Token inválido
  - `409 Conflict`: Nome ou domínio já em uso

#### Listar todos os clientes
- **Método**: GET
- **Endpoint**: `/api/clients`
- **Autenticação**: JWT
- **Descrição**: Lista todos os clientes whitelabel.
- **Resposta de Sucesso**:
  ```json
  [
    {
      "id": "b9b5d8d0-3c5g-5d7f-9d9e-2e3f4g5h6i7j",
      "name": "Loja A",
      "domain": "loja-a.localhost",
      "logo": "https://exemplo.com/logo.png",
      "primaryColor": "#FF5722",
      "secondaryColor": "#FFC107",
      "isActive": true,
      "createdAt": "2025-11-10T12:00:00.000Z",
      "updatedAt": "2025-11-10T12:00:00.000Z"
    },
    {
      "id": "c0c6e9e1-4d6h-6e8g-0e0f-3f4g5h6i7j8k",
      "name": "Loja B",
      "domain": "loja-b.localhost",
      "logo": "https://exemplo.com/logo-b.png",
      "primaryColor": "#2196F3",
      "secondaryColor": "#4CAF50",
      "isActive": true,
      "createdAt": "2025-11-10T12:00:00.000Z",
      "updatedAt": "2025-11-10T12:00:00.000Z"
    }
  ]
  ```
- **Códigos de Resposta**:
  - `200 OK`: Sucesso
  - `401 Unauthorized`: Token inválido

#### Obter o cliente atual
- **Método**: GET
- **Endpoint**: `/api/clients/current`
- **Autenticação**: Não necessária
- **Descrição**: Retorna o cliente whitelabel com base no domínio usado na requisição.
- **Resposta de Sucesso**:
  ```json
  {
    "id": "b9b5d8d0-3c5g-5d7f-9d9e-2e3f4g5h6i7j",
    "name": "Loja A",
    "domain": "loja-a.localhost",
    "logo": "https://exemplo.com/logo.png",
    "primaryColor": "#FF5722",
    "secondaryColor": "#FFC107",
    "isActive": true,
    "createdAt": "2025-11-10T12:00:00.000Z",
    "updatedAt": "2025-11-10T12:00:00.000Z"
  }
  ```
- **Códigos de Resposta**:
  - `200 OK`: Sucesso
  - `404 Not Found`: Cliente não encontrado para o domínio

### Produtos

#### Listar produtos com filtros
- **Método**: GET
- **Endpoint**: `/api/products`
- **Autenticação**: Não necessária
- **Descrição**: Lista produtos com opções de filtro.
- **Parâmetros de Query**:
  - `name`: Filtra produtos pelo nome
  - `category`: Filtra produtos pela categoria
  - `minPrice`: Preço mínimo
  - `maxPrice`: Preço máximo
  - `supplierId`: ID do fornecedor
  - `offset`: Número de resultados a pular (paginação)
  - `limit`: Número máximo de resultados a retornar (paginação)
- **Resposta de Sucesso**:
  ```json
  {
    "products": [
      {
        "id": "d1d7f0f2-5e7i-7f9h-1f1g-4g5h6i7j8k9l",
        "name": "Camisa Formal",
        "description": "Nova linha de camisas formais projetadas pensando em você",
        "price": "127.00",
        "image": "http://placeimg.com/640/480/business",
        "category": "Fantastic",
        "material": "Metal",
        "department": "Grocery",
        "externalId": "1",
        "supplierId": "e2e8g1g3-6f8j-8g0i-2g2h-5h6i7j8k9l0m",
        "createdAt": "2025-11-10T12:00:00.000Z",
        "updatedAt": "2025-11-10T12:00:00.000Z"
      },
      {
        "id": "f3f9h2h4-7g9k-9h1j-3h3i-6i7j8k9l0m1n",
        "name": "Handcrafted Frozen Sausages",
        "description": "Andy shoes are designed to keeping in mind durability as well as trends",
        "price": "723.00",
        "image": "http://placeimg.com/640/480/sports",
        "gallery": [
          "http://placeimg.com/640/480/sports",
          "http://placeimg.com/640/480/business",
          "http://placeimg.com/640/480/abstract",
          "http://placeimg.com/640/480/food"
        ],
        "hasDiscount": false,
        "discountValue": "0.05",
        "details": {
          "adjective": "Gorgeous",
          "material": "Concrete"
        },
        "externalId": "1",
        "supplierId": "g4g0i3i5-8h0l-0i2k-4i4j-7j8k9l0m1n2o",
        "createdAt": "2025-11-10T12:00:00.000Z",
        "updatedAt": "2025-11-10T12:00:00.000Z"
      }
    ],
    "total": 2
  }
  ```
- **Códigos de Resposta**:
  - `200 OK`: Sucesso
  - `400 Bad Request`: Parâmetros de filtro inválidos

#### Obter um produto pelo ID
- **Método**: GET
- **Endpoint**: `/api/products/:id`
- **Autenticação**: Não necessária
- **Descrição**: Retorna informações detalhadas de um produto específico.
- **Resposta de Sucesso**:
  ```json
  {
    "id": "d1d7f0f2-5e7i-7f9h-1f1g-4g5h6i7j8k9l",
    "name": "Camisa Formal",
    "description": "Nova linha de camisas formais projetadas pensando em você",
    "price": "127.00",
    "image": "http://placeimg.com/640/480/business",
    "category": "Fantastic",
    "material": "Metal",
    "department": "Grocery",
    "externalId": "1",
    "supplier": {
      "id": "e2e8g1g3-6f8j-8g0i-2g2h-5h6i7j8k9l0m",
      "name": "Fornecedor Brasileiro",
      "type": "brazilian"
    },
    "createdAt": "2025-11-10T12:00:00.000Z",
    "updatedAt": "2025-11-10T12:00:00.000Z"
  }
  ```
- **Códigos de Resposta**:
  - `200 OK`: Sucesso
  - `404 Not Found`: Produto não encontrado

#### Sincronizar produtos dos fornecedores
- **Método**: POST
- **Endpoint**: `/api/products/sync`
- **Autenticação**: JWT
- **Descrição**: Sincroniza produtos de todos os fornecedores ativos.
- **Códigos de Resposta**:
  - `200 OK`: Sucesso
  - `401 Unauthorized`: Token inválido

### Fornecedores

#### Criar um novo fornecedor
- **Método**: POST
- **Endpoint**: `/api/suppliers`
- **Autenticação**: JWT
- **Descrição**: Cria um novo fornecedor no sistema.
- **Corpo da Requisição**:
  ```json
  {
    "name": "Fornecedor Brasileiro",
    "type": "brazilian",
    "apiUrl": "http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/brazilian_provider"
  }
  ```
- **Resposta de Sucesso**:
  ```json
  {
    "id": "e2e8g1g3-6f8j-8g0i-2g2h-5h6i7j8k9l0m",
    "name": "Fornecedor Brasileiro",
    "type": "brazilian",
    "apiUrl": "http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/brazilian_provider",
    "isActive": true,
    "createdAt": "2025-11-10T12:00:00.000Z",
    "updatedAt": "2025-11-10T12:00:00.000Z"
  }
  ```
- **Códigos de Resposta**:
  - `201 Created`: Fornecedor criado com sucesso
  - `400 Bad Request`: Dados inválidos
  - `401 Unauthorized`: Token inválido
  - `409 Conflict`: Nome já em uso

#### Listar todos os fornecedores
- **Método**: GET
- **Endpoint**: `/api/suppliers`
- **Autenticação**: JWT
- **Descrição**: Lista todos os fornecedores cadastrados.
- **Resposta de Sucesso**:
  ```json
  [
    {
      "id": "e2e8g1g3-6f8j-8g0i-2g2h-5h6i7j8k9l0m",
      "name": "Fornecedor Brasileiro",
      "type": "brazilian",
      "apiUrl": "http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/brazilian_provider",
      "isActive": true,
      "createdAt": "2025-11-10T12:00:00.000Z",
      "updatedAt": "2025-11-10T12:00:00.000Z"
    },
    {
      "id": "g4g0i3i5-8h0l-0i2k-4i4j-7j8k9l0m1n2o",
      "name": "Fornecedor Europeu",
      "type": "european",
      "apiUrl": "http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/european_provider",
      "isActive": true,
      "createdAt": "2025-11-10T12:00:00.000Z",
      "updatedAt": "2025-11-10T12:00:00.000Z"
    }
  ]
  ```
- **Códigos de Resposta**:
  - `200 OK`: Sucesso
  - `401 Unauthorized`: Token inválido

#### Obter produtos de um fornecedor
- **Método**: GET
- **Endpoint**: `/api/suppliers/:id/products`
- **Autenticação**: JWT
- **Descrição**: Busca produtos diretamente da API do fornecedor.
- **Códigos de Resposta**:
  - `200 OK`: Sucesso
  - `401 Unauthorized`: Token inválido
  - `404 Not Found`: Fornecedor não encontrado
