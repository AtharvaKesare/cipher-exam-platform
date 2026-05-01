
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');

// Setup schema
db.exec(`
CREATE TABLE employees (id INT, name TEXT, salary INT, department TEXT);
INSERT INTO employees VALUES (1, 'John', 50000, 'HR');
INSERT INTO employees VALUES (2, 'Alice', 70000, 'IT');
INSERT INTO employees VALUES (3, 'Bob', 60000, 'Finance');
INSERT INTO employees VALUES (4, 'Eve', 80000, 'IT');
CREATE TABLE products (id INT, name TEXT, category TEXT, price REAL, stock INT);
INSERT INTO products VALUES (1, 'Laptop',    'Electronics', 999.99,  50);
INSERT INTO products VALUES (2, 'Mouse',     'Electronics', 29.99,  200);
INSERT INTO products VALUES (3, 'Desk',      'Furniture',   249.99,  30);
INSERT INTO products VALUES (4, 'Chair',     'Furniture',   199.99,  45);
INSERT INTO products VALUES (5, 'Notebook',  'Stationery',  4.99,   500);
CREATE TABLE orders (id INT, product_id INT, quantity INT, order_date TEXT);
INSERT INTO orders VALUES (1, 1, 2, '2024-01-10');
INSERT INTO orders VALUES (2, 2, 5, '2024-01-11');
INSERT INTO orders VALUES (3, 3, 1, '2024-01-12');
INSERT INTO orders VALUES (4, 1, 1, '2024-01-15');
INSERT INTO orders VALUES (5, 5, 10, '2024-01-16');
`);

try {
  const userSQL = `select *
from Employees
where salary > 50000`;

  // Detect if it's a SELECT query
  const trimmed = userSQL.trim().toUpperCase();
  const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');

  if (isSelect) {
    const stmt = db.prepare(userSQL);
    const rows = stmt.all();
    if (rows.length === 0) {
      console.log('(no rows returned)');
    } else {
      rows.forEach(row => {
        const vals = Object.values(row).map(v => (v === null ? 'NULL' : String(v)));
        console.log(vals.join('\t'));
      });
    }
  } else {
    db.exec(userSQL);
    console.log('Query executed successfully.');
  }
} catch (err) {
  process.stderr.write('SQL Error: ' + err.message + '\n');
  process.exit(1);
}
