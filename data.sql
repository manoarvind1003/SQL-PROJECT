CREATE DATABASE swiggy;

USE swiggy;

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    user_name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(100)
);

CREATE TABLE categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100)
);

CREATE TABLE restaurants (
    restaurant_id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_name VARCHAR(100),
    location VARCHAR(100),
    rating DECIMAL(2,1)
);

CREATE TABLE items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    item_name VARCHAR(100),
    price INT,
    category_id INT,
    restaurant_id INT,

    FOREIGN KEY (category_id)
    REFERENCES categories(category_id),

    FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(restaurant_id)
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    restaurant_id INT,
    total_amount INT,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50),
    delivery_address VARCHAR(255),
    order_status VARCHAR(50),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
    REFERENCES users(user_id),

    FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(restaurant_id)
);

CREATE TABLE order_items (
    order_item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT,
    item_id INT,
    quantity INT,
    item_total INT,

    FOREIGN KEY (order_id)
    REFERENCES orders(order_id),

    FOREIGN KEY (item_id)
    REFERENCES items(item_id)
);

INSERT INTO categories (category_name)
VALUES
('South Indian'),
('North Indian'),
('Fast Food');

INSERT INTO restaurants (restaurant_name, location, rating)
VALUES
('A2B', 'Chennai', 4.5),
('Burger King', 'Coimbatore', 4.2),
('Dominos', 'Trichy', 4.4);

INSERT INTO items (item_name, price, category_id, restaurant_id)
VALUES
('Biriyani', 150, 2, 1),
('Paneer Butter Masala', 120, 2, 1),
('Pizza', 250, 3, 3),
('Burger', 100, 3, 2),
('Dosa', 80, 1, 1);