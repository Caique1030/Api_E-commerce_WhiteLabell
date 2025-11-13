-- ===================================================
-- Banco de dados: whitelabel_system (PostgreSQL)
-- Script limpo e consistente
-- ===================================================

-- OBS: se preferir criar o banco manualmente no psql:
-- CREATE DATABASE whitelabel_system;
-- \c whitelabel_system;

-- Habilita extensão para geração de UUIDs (se ainda não habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função genérica para atualizar updated_at antes de UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ===================================================
-- TABELA: clients
-- ===================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    logo VARCHAR(500),
    primary_color VARCHAR(50),
    secondary_color VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_domain ON clients(domain);

DROP TRIGGER IF EXISTS trg_clients_set_updated_at ON clients;
CREATE TRIGGER trg_clients_set_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ===================================================
-- TABELA: suppliers
-- ===================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(100),
    api_url VARCHAR(500), -- opcional (nullable)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_suppliers_set_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_set_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ===================================================
-- TABELA: products
-- ===================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    image VARCHAR(500),
    gallery TEXT[],
    category VARCHAR(255),
    material VARCHAR(255),
    department VARCHAR(255),
    discount_value VARCHAR(50),
    has_discount BOOLEAN DEFAULT FALSE,
    details JSONB,
    external_id VARCHAR(255),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_products_set_updated_at ON products;
CREATE TRIGGER trg_products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ===================================================
-- TABELA: users
-- ===================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(100) DEFAULT 'user',
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ===================================================
-- TABELA: orders
-- ===================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_orders_set_updated_at ON orders;
CREATE TRIGGER trg_orders_set_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ===================================================
-- TABELA: order_items
-- ===================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount_applied NUMERIC(10,2) DEFAULT 0.00,
    subtotal NUMERIC(12,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount_applied) STORED,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- índice para consultas frequentes por order_id
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);


-- ===================================================
-- TABELA: activity_logs
-- ===================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);


-- ===================================================
-- DADOS DE TESTE (inserts organizados)
-- ===================================================
BEGIN;

-- Inserção de clientes de exemplo (só insere se não existir)
INSERT INTO clients (name, domain, logo, primary_color, secondary_color)
SELECT 'Cliente Exemplo', 'exemplo.com', 'https://example.com/logo.png', '#123456', '#abcdef'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE domain = 'exemplo.com');

-- Fornecedor de teste
INSERT INTO suppliers (name, type, api_url)
SELECT 'Fornecedor ABC', 'interno', 'https://api.fornecedorabc.com'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Fornecedor ABC');

-- Produtos de teste — utiliza supplier existente
WITH supplier_row AS (
    SELECT id FROM suppliers WHERE name = 'Fornecedor ABC' LIMIT 1
)
INSERT INTO products (name, description, price, category, supplier_id)
SELECT p.name, p.description, p.price, p.category, s.id
FROM (VALUES
    ('Camisa Polo','Camisa de algodão',79.90,'Roupas'),
    ('Calça Jeans','Calça jeans azul',129.90,'Roupas')
) AS p(name, description, price, category)
CROSS JOIN supplier_row s
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = p.name);

-- Usuário de teste (senha já hasheada bcrypt como exemplo)
INSERT INTO users (email, name, password, role, client_id)
SELECT 'teste@exemplo.com', 'Usuário Teste',
       '$2b$10$K/MNFlWdMz/fdw3btcAzYubroZAqSQHK8hXl1MGUa.1UMf/DF.AZm',
       'admin',
       c.id
FROM (SELECT id FROM clients WHERE domain = 'exemplo.com' LIMIT 1) c
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'teste@exemplo.com');

-- Pedido de exemplo com itens (somente se não existir)
WITH cli AS (SELECT id FROM clients WHERE domain = 'exemplo.com' LIMIT 1),
     usr AS (SELECT id FROM users WHERE email = 'teste@exemplo.com' LIMIT 1),
     order_exists AS (SELECT 1 FROM orders WHERE client_id = (SELECT id FROM cli) LIMIT 1)
INSERT INTO orders (client_id, user_id, total_amount, status, payment_method)
SELECT (SELECT id FROM cli), (SELECT id FROM usr), 209.80, 'completed', 'credit_card'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE client_id = (SELECT id FROM cli) AND status = 'completed');

-- Para inserir os order_items corretamente, buscar order e produtos criados acima
-- Inserção segura apenas se o pedido e os produtos existirem e não houver itens associados
WITH o AS (SELECT id FROM orders WHERE client_id = (SELECT id FROM clients WHERE domain = 'exemplo.com') LIMIT 1),
     p1 AS (SELECT id FROM products WHERE name = 'Camisa Polo' LIMIT 1),
     p2 AS (SELECT id FROM products WHERE name = 'Calça Jeans' LIMIT 1)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT o.id, p1.id, 1, 79.90 FROM o, p1
WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = o.id AND product_id = p1.id)
UNION ALL
SELECT o.id, p2.id, 1, 129.90 FROM o, p2
WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = o.id AND product_id = p2.id);

COMMIT;

-- ===================================================
-- INSERÇÃO DE CLIENTES WHITELABEL ESPECÍFICOS
-- ===================================================

INSERT INTO clients (name, domain, primary_color, secondary_color)
VALUES 
    ('Localhost Client', 'localhost:3000', '#2ecc71', '#27ae60'),
    ('Devnology', 'devnology.com:3000', '#2ecc71', '#27ae60'),
    ('IN8', 'in8.com:3000', '#8e44ad', '#9b59b6')
ON CONFLICT (domain) DO UPDATE 
SET 
    name = EXCLUDED.name,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    updated_at = NOW();

-- ===================================================
-- INSERÇÃO DOS FORNECEDORES ESPECÍFICOS DO PROJETO
-- ===================================================

INSERT INTO suppliers (name, type, api_url, is_active)
VALUES
    ('Fornecedor Brasileiro', 'brazilian', 'http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/brazilian_provider', true),
    ('Fornecedor Europeu', 'european', 'http://616d6bdb6dacbb001794ca17.mockapi.io/devnology/european_provider', true)
ON CONFLICT (name) DO UPDATE
SET
    type = EXCLUDED.type,
    api_url = EXCLUDED.api_url,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ===================================================
-- BOAS PRÁTICAS / NOTAS
-- ===================================================
-- 1) Não alterei `users.client_id` para NOT NULL no script porque isso exige que todos os usuários
--    existentes já apontem para algum client. Se desejar forçar NOT NULL, certifique-se de atualizar
--    todos os registros antes e então executar:
--       ALTER TABLE users ALTER COLUMN client_id SET NOT NULL;
--
-- 2) Removi selects e updates soltos que estavam no script original (ex.: SELECT * FROM users WHERE email IS NULL;)
--    — se quiser que eu reintroduza checagens/relatórios de consistência, digo como quer que eles rodem e eu adiciono.
--
-- 3) A coluna api_url em suppliers ficou nullable (aceita NULL). Se quiser torná-la obrigatória:
--       ALTER TABLE suppliers ALTER COLUMN api_url SET NOT NULL;
--
-- 4) Se preferir que updated_at seja atualizado também em INSERT (para padronizar timezone),
--    podemos adicionar uma trigger AFTER INSERT para ajustar, ou confiar no DEFAULT NOW() atual.
--
-- 5) Considere criar roles/permissions e GRANT/REVOKE conforme ambiente (dev/prod).
--
-- 6) Em ambientes com alta carga, avaliar particionamento/índices adicionais (ex.: índices em orders(status, created_at), products(category), etc).

-- ===================================================
-- Fim do script
-- ===================================================
