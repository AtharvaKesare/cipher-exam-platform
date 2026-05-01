import Question from '../models/Question.js';
import Submission from '../models/Submission.js';
import { exec } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '..', 'temp_code');

// Ensure temp dir exists
mkdir(TEMP_DIR, { recursive: true }).catch(() => {});

// ─── SQL Execution via Node 22's built-in node:sqlite ────────────────────────
// Writes a small ESM runner script and executes it with --experimental-sqlite
const executeSql = async (userQuery, id) => {
  // The schema provided to every SQL exam question
  const schema = `
CREATE TABLE employees (id INT, name TEXT, department TEXT, salary INT);
INSERT INTO employees VALUES (1, 'Amit',  'IT',      60000);
INSERT INTO employees VALUES (2, 'Priya', 'HR',      45000);
INSERT INTO employees VALUES (3, 'Rahul', 'IT',      70000);
INSERT INTO employees VALUES (4, 'Sneha', 'Finance', 40000);
INSERT INTO employees VALUES (5, 'Karan', 'HR',      55000);
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
`;

  const runnerCode = `
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');

// Setup schema
db.exec(\`${schema.replace(/`/g, '\\`')}\`);

try {
  const userSQL = \`${userQuery.replace(/`/g, '\\`')}\`;

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
        console.log(vals.join('\\t'));
      });
    }
  } else {
    db.exec(userSQL);
    console.log('Query executed successfully.');
  }
} catch (err) {
  process.stderr.write('SQL Error: ' + err.message + '\\n');
  process.exit(1);
}
`;

  const filePath = path.join(TEMP_DIR, `${id}_sql.mjs`);
  await writeFile(filePath, runnerCode, 'utf8');

  try {
    const { stdout, stderr } = await execAsync(
      `node --experimental-sqlite --no-warnings "${filePath}"`,
      { timeout: 5000, maxBuffer: 1024 * 512 }
    );
    return { output: stdout, error: stderr || null, resultType: 'success' };
  } catch (err) {
    if (err.killed) return { output: '', error: 'Time Limit Exceeded (5s)', resultType: 'timeout' };
    return {
      output: err.stdout || '',
      error: err.stderr || err.message,
      resultType: 'runtime_error'
    };
  } finally {
    unlink(filePath).catch(() => {});
  }
};

// ─── Local execution: JS, Python, SQL ────────────────────────────────────────
const executeLocally = async (code, language) => {
  const id = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    // ── JavaScript ──────────────────────────────────────────────────────────
    if (language === 'javascript') {
      const filePath = path.join(TEMP_DIR, `${id}.mjs`);
      await writeFile(filePath, code, 'utf8');
      try {
        const { stdout, stderr } = await execAsync(`node "${filePath}"`, {
          timeout: 5000,
          maxBuffer: 1024 * 512
        });
        return { output: stdout, error: stderr || null, resultType: 'success' };
      } catch (err) {
        if (err.killed || err.signal === 'SIGTERM') {
          return { output: '', error: 'Time Limit Exceeded (5s)', resultType: 'timeout' };
        }
        return { output: err.stdout || '', error: err.stderr || err.message, resultType: 'runtime_error' };
      } finally {
        unlink(filePath).catch(() => {});
      }
    }

    // ── Python ──────────────────────────────────────────────────────────────
    if (language === 'python') {
      const filePath = path.join(TEMP_DIR, `${id}.py`);
      await writeFile(filePath, code, 'utf8');
      const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      try {
        const { stdout, stderr } = await execAsync(`${pyCmd} "${filePath}"`, {
          timeout: 5000,
          maxBuffer: 1024 * 512
        });
        return { output: stdout, error: stderr || null, resultType: 'success' };
      } catch (err) {
        if (err.killed || err.signal === 'SIGTERM') {
          return { output: '', error: 'Time Limit Exceeded (5s)', resultType: 'timeout' };
        }
        return { output: err.stdout || '', error: err.stderr || err.message, resultType: 'runtime_error' };
      } finally {
        unlink(filePath).catch(() => {});
      }
    }

    // ── SQL (node:sqlite built-in, Node 22+) ────────────────────────────────
    if (language === 'sql') {
      return await executeSql(code, id);
    }

    return { output: '', error: `Language "${language}" is not supported.`, resultType: 'system_error' };

  } catch (err) {
    return { output: '', error: err.message, resultType: 'system_error' };
  }
};

// ─── Main route handler ───────────────────────────────────────────────────────
export const runCode = async (req, res) => {
  const { code, language, examId, questionId } = req.body;
  const studentId = req.user.id;

  if (!code || !code.trim()) {
    return res.status(400).json({ message: 'Code and language are required' });
  }
  if (!language) {
    return res.status(400).json({ message: 'Language is required' });
  }

  try {
    const executedResult = await executeLocally(code, language);
    let passed = undefined;
    let resultEnum = 'pending';
    let score = 0;

    if (questionId && questionId.match(/^[0-9a-fA-F]{24}$/)) {
      const question = await Question.findById(questionId);
      if (question) {
        if (question.expectedOutput && executedResult.resultType === 'success') {
          const normalize = (str) => str.split('\\n').map(l => l.trim()).filter(l => l.length > 0).join('\\n');
          passed = normalize(executedResult.output || '') === normalize(question.expectedOutput || '');
          resultEnum = passed ? 'passed' : 'failed';
          score = passed ? (question.points || 10) : 0;
        } else if (question.expectedOutput) {
          passed = false;
          resultEnum = 'failed';
          score = 0;
        } else if (executedResult.resultType === 'success') {
          passed = true;
          resultEnum = 'passed';
          score = question.points || 10;
        } else {
          passed = false;
          resultEnum = 'error';
          score = 0;
        }
      } else {
        passed = executedResult.resultType === 'success';
        resultEnum = passed ? 'passed' : 'error';
      }
    } else {
      resultEnum = executedResult.resultType === 'success' ? 'passed' : 'error';
    }

    if (examId && questionId) {
      await Submission.findOneAndUpdate(
        { studentId, examId, questionId },
        {
          code,
          language,
          result: resultEnum,
          output: executedResult.output || executedResult.error || '',
          score
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({
      state: 'completed',
      result: {
        output: executedResult.output,
        error: executedResult.error,
        resultType: executedResult.resultType,
        passed
      }
    });
  } catch (error) {
    console.error('Execution Error:', error);
    res.status(500).json({ message: 'Failed to execute code', error: error.message });
  }
};
