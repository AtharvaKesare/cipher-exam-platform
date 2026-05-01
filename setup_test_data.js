import http from 'http';

const BASE_HOST = 'localhost';
const BASE_PORT = 5000;

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const options = { hostname: BASE_HOST, port: BASE_PORT, path, method, headers };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 400, status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ ok: false, status: res.statusCode, data: { raw: data } }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log('=== SETTING UP TEST DATA ===\n');

  // 1. Teacher login
  console.log('1. Teacher login...');
  const { data: tData } = await api('POST', '/api/auth/login', { email: 'testteacher@exam.com', password: 'Test1234!' });
  const tToken = tData.token;
  console.log(`   Role: ${tData.role} | Token: ${tToken ? 'OK' : 'FAILED'}`);

  // 2. Create exam
  console.log('\n2. Creating exam...');
  const now = new Date();
  const { ok: eOk, data: examData } = await api('POST', '/api/exams', {
    title: 'QA Test Exam',
    subject: 'JavaScript',
    startTime: new Date(now - 5 * 60000).toISOString(),
    endTime: new Date(now.getTime() + 3 * 60 * 60000).toISOString(),
    duration: 60,
    warningLimit: 3
  }, tToken);
  if (!eOk) { console.error('   FAILED:', JSON.stringify(examData)); process.exit(1); }
  const examId = examData._id;
  const joinCode = examData.joinCode;
  console.log(`   ✅ Exam ID: ${examId}`);
  console.log(`   ✅ Join Code: ${joinCode}`);

  // 3. Add question
  console.log('\n3. Adding question...');
  const { ok: qOk, data: qData } = await api('POST', `/api/exams/${examId}/questions`, {
    title: 'Hello World',
    description: 'Write JavaScript that prints "Hello World" to the console. Use console.log("Hello World")',
    difficulty: 'easy',
    allowedLanguages: ['javascript'],
    expectedOutput: 'Hello World',
    points: 10
  }, tToken);
  console.log(qOk ? `   ✅ Question ID: ${qData._id}` : `   ❌ FAILED: ${JSON.stringify(qData)}`);

  // 4. Student login
  console.log('\n4. Student login...');
  const { data: sData } = await api('POST', '/api/auth/login', { email: 'teststudent@exam.com', password: 'Test1234!' });
  const sToken = sData.token;
  console.log(`   Role: ${sData.role} | Token: ${sToken ? 'OK' : 'FAILED'}`);

  // 5. Student joins exam
  console.log(`\n5. Student joins exam with code: ${joinCode}`);
  const { ok: jOk, data: joinData } = await api('POST', '/api/exams/join', { joinCode }, sToken);
  console.log(jOk ? `   ✅ ${joinData.message}` : `   ❌ FAILED: ${JSON.stringify(joinData)}`);

  // 6. Simulate a proctor warning via socket (just test the endpoint)
  console.log('\n6. Testing proctor log via API...');
  const { data: startData } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
  console.log(`   Session status: ${startData.session?.status}`);

  console.log('\n\n=== ✅ SETUP COMPLETE ===');
  console.log(`Exam ID:    ${examId}`);
  console.log(`Join Code:  ${joinCode}`);
  console.log(`\nStudent: teststudent@exam.com / Test1234!`);
  console.log(`Teacher: testteacher@exam.com / Test1234!`);
  console.log(`\nExam URL: http://localhost:3000/exam/${examId}`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
