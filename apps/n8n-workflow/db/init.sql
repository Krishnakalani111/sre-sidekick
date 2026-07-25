-- Small, realistic sample dataset so the NL -> SQL workflow has a real
-- schema to introspect and real rows to query. Loaded automatically by
-- the postgres container on first start (docker-entrypoint-initdb.d).

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  country TEXT NOT NULL,
  signed_up_at DATE NOT NULL
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_cents INTEGER NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  ordered_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL
);

INSERT INTO customers (name, email, country, signed_up_at) VALUES
  ('Asha Verma',      'asha@example.com',   'India',       '2025-01-14'),
  ('Liam O''Connor',  'liam@example.com',   'Ireland',     '2025-02-02'),
  ('Mei Tanaka',      'mei@example.com',    'Japan',       '2025-02-20'),
  ('Carlos Diaz',     'carlos@example.com', 'Mexico',      '2025-03-05'),
  ('Sara Kim',        'sara@example.com',   'South Korea', '2025-03-22');

INSERT INTO products (name, category, price_cents) VALUES
  ('Wireless Mouse',              'Electronics', 1999),
  ('Mechanical Keyboard',         'Electronics', 7999),
  ('Standing Desk',               'Furniture',   34999),
  ('Desk Lamp',                   'Furniture',   2499),
  ('Noise Cancelling Headphones', 'Electronics', 15999);

INSERT INTO orders (customer_id, ordered_at, status) VALUES
  (1, '2025-04-01 10:00', 'completed'),
  (1, '2025-05-11 09:30', 'completed'),
  (2, '2025-04-15 14:20', 'completed'),
  (3, '2025-04-18 08:05', 'cancelled'),
  (4, '2025-05-02 17:45', 'completed'),
  (5, '2025-05-20 12:10', 'refunded'),
  (2, '2025-06-01 11:00', 'completed');

INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES
  (1, 1, 2, 1999),
  (1, 2, 1, 7999),
  (2, 5, 1, 15999),
  (3, 3, 1, 34999),
  (3, 4, 2, 2499),
  (4, 2, 1, 7999),
  (5, 5, 2, 15999),
  (6, 3, 1, 34999),
  (7, 1, 3, 1999);
