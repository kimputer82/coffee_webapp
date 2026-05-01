-- Drop tables if they exist
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS options;
DROP TABLE IF EXISTS menus;

-- Menus table
CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    image VARCHAR(255),
    stock_quantity INTEGER DEFAULT 0
);

-- Options table
CREATE TABLE options (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price INTEGER DEFAULT 0,
    menu_id INTEGER REFERENCES menus(id) ON DELETE CASCADE
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT '주문 접수', -- '주문 접수', '제조 중', '제조 완료'
    total_amount INTEGER NOT NULL
);

-- Order Items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_id INTEGER REFERENCES menus(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    amount INTEGER NOT NULL,
    options JSONB -- Array of {id, name, price}
);

-- Insert initial data
INSERT INTO menus (name, description, price, image, stock_quantity) VALUES
('아메리카노(ICE)', '에스프레소에 차가운 물을 더해 깔끔하게 마시는 커피.', 4000, 'https://images.pexels.com/photos/1191639/pexels-photo-1191639.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&fit=crop', 10),
('아메리카노(HOT)', '따뜻한 물과 에스프레소의 조화, 기본에 충실한 한 잔.', 4000, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&fit=crop', 10),
('카페라떼', '부드러운 스팀 밀크와 에스프레소의 밸런스.', 5000, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=640&q=80', 10);

-- Options for each menu
INSERT INTO options (name, price, menu_id)
SELECT '샷 추가', 500, id FROM menus;

INSERT INTO options (name, price, menu_id)
SELECT '시럽 추가', 0, id FROM menus;
