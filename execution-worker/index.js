import 'dotenv/config';
import { spawn, exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs/promises';
import { Worker } from 'bullmq';

const execPromise = util.promisify(exec);

// Ensure we have a temp directory for code files
const TEMP_DIR = path.join(process.cwd(), 'temp_code');

const setup = async () => {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (err) {
    console.error('Could not create temp dir', err);
  }
};

const getDockerImage = (lang) => {
  const images = {
    'python': 'python:3.9-slim',
    'javascript': 'node:18-alpine',
    'cpp': 'gcc:latest',
    'java': 'openjdk:17-slim',
    'sql': 'alpine:latest'
  };
  return images[lang] || 'node:18-alpine';
};

const executeCode = async (code, language) => {
  let img = getDockerImage(language);
  let runCmd;
  let finalCode = code;

  if (language === 'python') {
    runCmd = `python -c "${code.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  } else if (language === 'javascript') {
    runCmd = `node -e "${code.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  } else if (language === 'sql') {
    const schema = `
CREATE TABLE employees (id INT, name TEXT, salary INT);
INSERT INTO employees VALUES (1, 'Alice', 80000);
INSERT INTO employees VALUES (2, 'Bob', 60000);
INSERT INTO employees VALUES (3, 'Charlie', 75000);
.headers on
.mode column
`;
    finalCode = schema + '\n' + code;
    // For SQL, we pass it via stdin
    runCmd = `sh -c "apk add --no-cache sqlite > /dev/null && sqlite3 :memory:"`;
  } else {
    throw new Error(`Language ${language} not fully supported in local config yet`);
  }

  let resultOutput = '';
  let resultError = '';
  let resultType = 'passed';
  
  try {
    if (language === 'sql') {
      // Create a promise wrapper around spawn to pipe stdin natively to the docker process
      await new Promise((resolve, reject) => {
        const dockerProcess = spawn('docker', ['run', '-i', '--rm', '--net', 'none', '--memory', '256m', '--cpus', '1.0', img, 'sh', '-c', 'apk add --no-cache sqlite > /dev/null && sqlite3 :memory:']);
        
        let isDone = false;
        
        const timeout = setTimeout(() => {
          if (!isDone) {
            dockerProcess.kill();
            reject(new Error('timeout'));
          }
        }, 3000);

        dockerProcess.stdout.on('data', (data) => {
          resultOutput += data.toString();
        });

        dockerProcess.stderr.on('data', (data) => {
          resultError += data.toString();
        });

        dockerProcess.on('close', (code) => {
          isDone = true;
          clearTimeout(timeout);
          if (code !== 0 && !resultError) {
             resultError = `Process exited with code ${code}`;
          }
          resolve();
        });

        dockerProcess.on('error', (err) => {
          isDone = true;
          clearTimeout(timeout);
          reject(err);
        });

        // Write SQL to stdin and close it so execution starts
        dockerProcess.stdin.write(finalCode);
        dockerProcess.stdin.end();
      });
    } else {
      const dockerCmd = `docker run --rm --net none --memory 256m --cpus 1.0 ${img} ${runCmd}`;
      // Timeout in child_process restricts execution time to 3 seconds roughly.
      const { stdout, stderr } = await execPromise(dockerCmd, { timeout: 3000 });
      resultOutput = stdout;
      resultError = stderr;
    }
  } catch (err) {
    resultOutput = err.stdout || resultOutput;
    resultError = err.stderr || err.message || resultError;
    resultType = (err.message === 'timeout' || err.killed) ? 'timeout' : 'error';
  }
  
  return { output: resultOutput, error: resultError, result: resultType };
};

setup().then(() => {
  console.log('Worker ready, awaiting jobs...');
  const worker = new Worker('code-execution', async job => {
    console.log(`Processing job ${job.id}`);
    const { code, language, examId, questionId, studentId } = job.data;
    const result = await executeCode(code, language);
    
    // In a real app, update MongoDB with result
    console.log(`Job ${job.id} completed. Output:`, result.output);
    return result;
  }, {
    connection: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_HOST?.includes('upstash.io') ? {} : undefined
    }
  });

  worker.on('completed', job => {
    console.log(`${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    console.log(`${job.id} has failed with ${err.message}`);
  });
});
