
from flask import Flask, render_template, request, redirect, session, jsonify
import psycopg2
import os

app = Flask(__name__)
app.secret_key = 'secret123'

def create_connection():
    return psycopg2.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        user=os.environ.get('DB_USER', 'root'),
        password=os.environ.get('DB_PASSWORD', 'root'),
        dbname=os.environ.get('DB_NAME', 'swiggy'),
        port=os.environ.get('DB_PORT', '5432')
    )


@app.route('/')
def home():

    if 'user_id' not in session:
        return redirect('/login')

    connection = create_connection()
    cursor = connection.cursor()

    query = '''
    SELECT items.item_id,
           items.item_name,
           items.price,
           categories.category_name
    FROM items
    JOIN categories
    ON items.category_id = categories.category_id
    '''

    cursor.execute(query)

    items = cursor.fetchall()

    cursor.close()
    connection.close()

    return render_template(
        'index.html',
        items=items,
        user_name=session['user_name']
    )


@app.route('/signup', methods=['GET', 'POST'])
def signup():

    if request.method == 'POST':

        user_name = request.form['user_name']
        email = request.form['email']
        password = request.form['password']

        connection = create_connection()
        cursor = connection.cursor()

        query = '''
        INSERT INTO users (user_name, email, password)
        VALUES (%s, %s, %s)
        '''

        cursor.execute(query, (user_name, email, password))

        connection.commit()

        cursor.close()
        connection.close()

        return redirect('/login')

    return render_template('signup.html')


@app.route('/login', methods=['GET', 'POST'])
def login():

    if request.method == 'POST':

        email = request.form['email']
        password = request.form['password']

        connection = create_connection()
        cursor = connection.cursor()

        query = '''
        SELECT * FROM users
        WHERE email = %s AND password = %s
        '''

        cursor.execute(query, (email, password))

        user = cursor.fetchone()

        cursor.close()
        connection.close()

        if user:

            session['user_id'] = user[0]
            session['user_name'] = user[1]

            return redirect('/')

        else:
            return 'Invalid Login'

    return render_template('login.html')


@app.route('/logout')
def logout():

    session.clear()

    return redirect('/login')


@app.route('/place_order', methods=['POST'])
def place_order():

    try:

        order_data = request.get_json()

        cart = order_data['cart']
        address = order_data['address']
        payment_method = order_data['payment_method']

        connection = create_connection()
        cursor = connection.cursor()

        user_id = session['user_id']

        total_amount = 0

        for item in cart:
            total_amount += item['price'] * item['quantity']

        order_query = '''
        INSERT INTO orders
        (user_id, total_amount, payment_method, payment_status, delivery_address)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING order_id
        '''

        cursor.execute(
            order_query,
            (
                user_id,
                total_amount,
                payment_method,
                'Paid',
                address
            )
        )

        order_id = cursor.fetchone()[0]

        for item in cart:

            cursor.execute(
                "SELECT item_id FROM items WHERE item_name = %s",
                (item['name'],)
            )

            result = cursor.fetchone()

            if result:

                item_id = result[0]

                item_total = item['price'] * item['quantity']

                item_query = '''
                INSERT INTO order_items
                (order_id, item_id, quantity, item_total)
                VALUES (%s, %s, %s, %s)
                '''

                cursor.execute(
                    item_query,
                    (
                        order_id,
                        item_id,
                        item['quantity'],
                        item_total
                    )
                )

        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({"message": "Order placed successfully"})

    except Exception as e:
        return jsonify({"error": str(e)})


@app.route('/orders')
def orders():

    if 'user_id' not in session:
        return redirect('/login')

    connection = create_connection()
    cursor = connection.cursor()

    query = '''
    SELECT orders.order_id,
           orders.total_amount,
           orders.payment_method,
           orders.payment_status,
           orders.delivery_address,
           orders.order_date
    FROM orders
    WHERE user_id = %s
    ORDER BY order_id DESC
    '''

    cursor.execute(query, (session['user_id'],))

    orders = cursor.fetchall()

    cursor.close()
    connection.close()

    return render_template(
        'orders.html',
        orders=orders
    )

@app.route('/analytics')
def analytics():

    connection = create_connection()
    cursor = connection.cursor()

    analytics_queries = [

        {
            "title": "1. Total Revenue from All Orders",
            "sql": """
SELECT SUM(total_amount) AS total_revenue
FROM orders;
"""
        },

        {
            "title": "2. Revenue by Item",
            "sql": """
SELECT i.item_name,
       SUM(oi.item_total) AS total_revenue
FROM order_items oi
JOIN items i
ON oi.item_id = i.item_id
GROUP BY i.item_name
ORDER BY total_revenue DESC;
"""
        },

        {
            "title": "3. Revenue by Payment Method",
            "sql": """
SELECT payment_method,
       SUM(total_amount) AS total_revenue
FROM orders
GROUP BY payment_method;
"""
        },

        {
            "title": "4. Total Revenue by Date",
            "sql": """
SELECT CAST(order_date AS DATE) AS order_day,
       SUM(total_amount) AS total_revenue
FROM orders
GROUP BY CAST(order_date AS DATE)
ORDER BY order_day;
"""
        },

        {
            "title": "5. Total Orders and Revenue by User",
            "sql": """
SELECT u.user_name,
       u.email,
       COUNT(o.order_id) AS total_orders,
       SUM(o.total_amount) AS total_revenue
FROM users u
JOIN orders o
ON u.user_id = o.user_id
GROUP BY u.user_id
ORDER BY total_revenue DESC;
"""
        },

        {
            "title": "6. Items Ordered by Category",
            "sql": """
SELECT c.category_name,
       i.item_name,
       SUM(oi.quantity) AS total_quantity_ordered
FROM order_items oi
JOIN items i
ON oi.item_id = i.item_id
JOIN categories c
ON i.category_id = c.category_id
GROUP BY c.category_name, i.item_name
ORDER BY total_quantity_ordered DESC;
"""
        },

        {
            "title": "7. Orders by Payment Status",
            "sql": """
SELECT payment_status,
       COUNT(order_id) AS total_orders
FROM orders
GROUP BY payment_status;
"""
        },

        {
            "title": "8. Users with Most Orders",
            "sql": """
SELECT u.user_name,
       COUNT(o.order_id) AS total_orders
FROM users u
JOIN orders o
ON u.user_id = o.user_id
GROUP BY u.user_id
ORDER BY total_orders DESC
LIMIT 5;
"""
        },

        {
            "title": "9. Revenue by Category",
            "sql": """
SELECT c.category_name,
       SUM(oi.item_total) AS total_revenue
FROM order_items oi
JOIN items i
ON oi.item_id = i.item_id
JOIN categories c
ON i.category_id = c.category_id
GROUP BY c.category_name;
"""
        },

        {
            "title": "10. Items Purchased in Specific Order",
            "sql": """
SELECT oi.order_id,
       i.item_name,
       oi.quantity,
       oi.item_total
FROM order_items oi
JOIN items i
ON oi.item_id = i.item_id
WHERE oi.order_id = 1;
"""
        },

        {
            "title": "11. Customer Details with Orders",
            "sql": """
SELECT u.user_name,
       u.email,
       o.order_id,
       o.delivery_address,
       o.total_amount,
       o.payment_method
FROM users u
JOIN orders o
ON u.user_id = o.user_id;
"""
        },

        {
            "title": "12. Revenue by Customer",
            "sql": """
SELECT u.user_name,
       u.email,
       SUM(o.total_amount) AS total_revenue
FROM users u
JOIN orders o
ON u.user_id = o.user_id
GROUP BY u.user_id
ORDER BY total_revenue DESC;
"""
        }

    ]

    final_queries = []

    for q in analytics_queries:

        cursor.execute(q["sql"])

        results = cursor.fetchall()

        columns = [desc[0] for desc in cursor.description]

        final_queries.append({
            "title": q["title"],
            "sql": q["sql"],
            "results": results,
            "columns": columns
        })

    cursor.close()

    return render_template(
        'analytics.html',
        queries=final_queries
    )

@app.route('/run_custom_query', methods=['POST'])
def run_custom_query():

    data = request.get_json()

    query = data.get('query')

    try:

        connection = create_connection()
        cursor = connection.cursor()

        # EXECUTE QUERY
        cursor.execute(query)

        # FOR SELECT QUERIES
        if query.strip().lower().startswith("select"):

            results = cursor.fetchall()

            columns = [
                desc[0]
                for desc in cursor.description
            ]

            response = {
                "columns": columns,
                "results": results
            }

        else:

            # FOR INSERT / UPDATE / DELETE
            connection.commit()

            response = {
                "columns": ["Status"],
                "results": [["Query Executed Successfully"]]
            }

        cursor.close()
        connection.close()

        return jsonify(response)

    except Exception as e:

        return jsonify({
            "error": str(e)
        })
@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

if __name__ == '__main__':
    app.run(debug=True)
