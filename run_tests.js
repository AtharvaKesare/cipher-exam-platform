/**
 * ============================================================
 * PROCTORED EXAM PLATFORM — COMPREHENSIVE SIMULATION TEST
 * ============================================================
 * Tests:
 *   1. Auth (login, roles, invalid)
 *   2. Tab-switch violation simulation (via socket)
 *   3. No-face / multiple-face violation simulation (via socket)
 *   4. Identity mismatch simulation (via socket)
 *   5. Violation logging & DB persistence
 *   6. Session warning counter updates
 *   7. Session termination logic
 *   8. Code execution (pass / fail / syntax err / edge cases)
 *   9. Proctor log retrieval (teacher)
 *   10. Full session lifecycle
 * ============================================================
 */

import http from 'http';
import { io } from 'socket.io-client';

// ── helpers ──────────────────────────────────────────────────
const BASE = { host: 'localhost', port: 5000 };
let pass = 0, fail = 0;
const results = [];

function api(method, path, body, token) {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request({ ...BASE, path, method, headers }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 400, status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ ok: false, status: res.statusCode, data: { raw: raw.substring(0, 120) } }); }
      });
    });
    req.on('error', e => resolve({ ok: false, status: 0, data: { error: e.message } }));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function assert(name, condition, detail = '') {
  const icon = condition ? '  ✅' : '  ❌';
  const line = `${icon} ${name}${detail ? '  →  ' + detail : ''}`;
  console.log(line);
  results.push({ name, ok: condition, detail });
  if (condition) pass++; else fail++;
}

// Wait helper
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ── socket helper ─────────────────────────────────────────────
function connectSocket() {
  return new Promise((resolve) => {
    const socket = io('http://localhost:5000', { transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', () => resolve(null));
    setTimeout(() => resolve(null), 5000);
  });
}

function emitWarning(socket, examId, studentId, eventType) {
  return new Promise((resolve) => {
    socket.emit('proctor_warning', { examId, studentId, eventType, timestamp: new Date() });
    setTimeout(resolve, 800); // wait for DB write
  });
}

// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  PROCTORED EXAM PLATFORM — SIMULATION TEST SUITE    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── 1. Setup: Login & Create Exam ─────────────────────────
  console.log('━━━  SETUP: Accounts & Exam  ━━━\n');

  const { data: tData } = await api('POST', '/api/auth/login', { email: 'testteacher@exam.com', password: 'Test1234!' });
  const tToken = tData.token;
  assert('Teacher login', !!tToken, `role=${tData.role}`);

  const { data: sData } = await api('POST', '/api/auth/login', { email: 'teststudent@exam.com', password: 'Test1234!' });
  const sToken = sData.token;
  const studentId = sData._id;
  assert('Student login', !!sToken, `id=${studentId}`);

  // Create fresh exam
  const now = new Date();
  const { data: examData } = await api('POST', '/api/exams', {
    title: 'SIMULATION TEST EXAM',
    subject: 'JavaScript',
    startTime: new Date(now - 60000).toISOString(),
    endTime: new Date(now.getTime() + 7200000).toISOString(),
    duration: 60,
    warningLimit: 5  // higher limit so we can test multiple violations
  }, tToken);
  const examId = examData._id;
  const joinCode = examData.joinCode;
  assert('Exam created', !!examId, `id=${examId}, code=${joinCode}`);

  // Add question
  const { data: qData } = await api('POST', `/api/exams/${examId}/questions`, {
    title: 'Sum Function',
    description: 'Print the sum of 2 and 3',
    difficulty: 'easy',
    allowedLanguages: ['javascript'],
    expectedOutput: '5',
    points: 10
  }, tToken);
  const questionId = qData._id;
  assert('Question added', !!questionId, `id=${questionId}`);

  // Enroll student
  const { ok: joinOk, data: joinData } = await api('POST', '/api/exams/join', { joinCode }, sToken);
  assert('Student enrolled', joinOk || joinData.message?.includes('already'), joinData.message);

  // Start exam session
  const { ok: startOk, data: startData } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
  assert('Session started', startOk && startData.session?.status === 'in_progress', `status=${startData.session?.status}`);

  // ── 2. Socket Connection Test ──────────────────────────────
  console.log('\n━━━  PHASE 1: Socket Connection  ━━━\n');

  const socket = await connectSocket();
  assert('Socket.io connection established', !!socket, socket ? `id=${socket.id}` : 'FAILED');

  if (!socket) {
    console.log('\n⚠️  Socket connection failed — violation simulation tests skipped\n');
  } else {

    // Join the monitor room (as teacher would)
    socket.emit('join_monitor', examId);
    await wait(300);

    // Set up listener to catch real-time events
    const receivedWarnings = [];
    socket.on('student_warning', (data) => receivedWarnings.push(data));

    // ── 3. TAB SWITCH SIMULATION ────────────────────────────
    console.log('\n━━━  PHASE 2: Tab Switch Violation  ━━━\n');

    await emitWarning(socket, examId, studentId, 'tab_switch');
    await wait(500);

    // Verify via session
    const { data: sess1 } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
    assert('Tab switch warning recorded in session', 
      sess1.session?.warnings >= 1 || sess1.session?.violationHistory?.some(v => v.type === 'tab_switch'),
      `warnings=${sess1.session?.warnings}, history=${sess1.session?.violationHistory?.length}`
    );

    // ── 4. NO FACE SIMULATION ────────────────────────────────
    console.log('\n━━━  PHASE 3: No Face Detected  ━━━\n');

    await emitWarning(socket, examId, studentId, 'face_missing');
    await wait(500);

    const { data: sess2 } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
    assert('face_missing violation logged', 
      sess2.session?.violationHistory?.some(v => v.type === 'face_missing'),
      `history count=${sess2.session?.violationHistory?.length}`
    );

    // ── 5. MULTIPLE FACES SIMULATION ─────────────────────────
    console.log('\n━━━  PHASE 4: Multiple Faces Detected  ━━━\n');

    await emitWarning(socket, examId, studentId, 'multiple_faces');
    await wait(500);

    const { data: sess3 } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
    assert('multiple_faces violation logged', 
      sess3.session?.violationHistory?.some(v => v.type === 'multiple_faces'),
      `history count=${sess3.session?.violationHistory?.length}`
    );

    // ── 6. IDENTITY MISMATCH SIMULATION ──────────────────────
    console.log('\n━━━  PHASE 5: Identity Mismatch  ━━━\n');

    await emitWarning(socket, examId, studentId, 'identity_mismatch');
    await wait(500);

    const { data: sess4 } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
    assert('identity_mismatch violation logged', 
      sess4.session?.violationHistory?.some(v => v.type === 'identity_mismatch'),
      `history count=${sess4.session?.violationHistory?.length}`
    );

    // ── 7. FULLSCREEN EXIT SIMULATION ────────────────────────
    console.log('\n━━━  PHASE 6: Fullscreen Exit & Window Blur  ━━━\n');

    await emitWarning(socket, examId, studentId, 'fullscreen_exit');
    await emitWarning(socket, examId, studentId, 'window_blur');
    await wait(600);

    const { data: sess5 } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
    assert('fullscreen_exit violation logged', 
      sess5.session?.violationHistory?.some(v => v.type === 'fullscreen_exit'),
      `history count=${sess5.session?.violationHistory?.length}`
    );
    assert('window_blur violation logged', 
      sess5.session?.violationHistory?.some(v => v.type === 'window_blur'),
      `history count=${sess5.session?.violationHistory?.length}`
    );

    // ── 8. REAL-TIME TEACHER NOTIFICATION ────────────────────
    console.log('\n━━━  PHASE 7: Real-time Teacher Notification  ━━━\n');

    // Emit one more and check if teacher socket received it
    await emitWarning(socket, examId, studentId, 'copy_paste');
    await wait(400);
    assert('Teacher socket received real-time warning', 
      receivedWarnings.length > 0, 
      `received ${receivedWarnings.length} events: ${receivedWarnings.map(w => w.eventType).join(', ')}`
    );

    // ── 9. ALL VIOLATION TYPES SUMMARY ───────────────────────
    console.log('\n━━━  PHASE 8: Violation History Summary  ━━━\n');

    const { data: sessAll } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
    const history = sessAll.session?.violationHistory || [];
    const types = [...new Set(history.map(v => v.type))];
    
    assert('All violation types stored in session', types.length >= 6, `types: ${types.join(', ')}`);
    assert('Warning counter matches violation count', sessAll.session?.warnings === history.length,
      `warnings field=${sessAll.session?.warnings}, history count=${history.length}`
    );

    socket.disconnect();
  }

  // ── 10. PROCTOR LOGS (DB) VERIFICATION ───────────────────
  console.log('\n━━━  PHASE 9: Proctor Logs Database Verification  ━━━\n');

  const { ok: logOk, data: logData } = await api('GET', `/api/exams/${examId}/logs`, null, tToken);
  assert('Teacher can fetch proctor logs', logOk && Array.isArray(logData), `count=${logData?.length}`);
  
  const logTypes = [...new Set(logData?.map(l => l.eventType) || [])];
  assert('tab_switch in ProctorLog', logTypes.includes('tab_switch'));
  assert('face_missing in ProctorLog', logTypes.includes('face_missing'));
  assert('multiple_faces in ProctorLog', logTypes.includes('multiple_faces'));
  assert('identity_mismatch in ProctorLog', logTypes.includes('identity_mismatch'));
  assert('fullscreen_exit in ProctorLog', logTypes.includes('fullscreen_exit'));
  assert('window_blur in ProctorLog', logTypes.includes('window_blur'));
  assert('copy_paste in ProctorLog', logTypes.includes('copy_paste'));
  assert('Logs has student info populated', logData?.[0]?.studentId?.name !== undefined, 
    `name=${logData?.[0]?.studentId?.name}`
  );

  // Student cannot access logs
  const { ok: stuLogOk } = await api('GET', `/api/exams/${examId}/logs`, null, sToken);
  assert('Student CANNOT access proctor logs (403)', !stuLogOk);

  // ── 11. CODE EXECUTION TESTS ─────────────────────────────
  console.log('\n━━━  PHASE 10: Code Execution  ━━━\n');

  const runCode = (code, lang = 'javascript') => api('POST', '/api/code/run', {
    code, language: lang, examId, questionId
  }, sToken);

  // Correct answer
  const { data: r1 } = await runCode('console.log(2 + 3)');
  assert('Correct answer → passed=true', r1.result?.passed === true, `output="${r1.result?.output?.trim()}"`);
  assert('Output matches expectedOutput "5"', r1.result?.output?.trim() === '5');

  // Wrong answer
  const { data: r2 } = await runCode('console.log("hello")');
  assert('Wrong answer → passed=false', r2.result?.passed === false, `output="${r2.result?.output?.trim()}"`);

  // Syntax error
  const { data: r3 } = await runCode('const x = <<<invalid>>>');
  assert('Syntax error → runtime_error', ['runtime_error', 'system_error'].includes(r3.result?.resultType),
    `resultType=${r3.result?.resultType}`
  );
  assert('Syntax error → passed=false', r3.result?.passed === false);

  // Empty code
  const { ok: emptyOk } = await runCode('');
  assert('Empty code → 400 rejected', !emptyOk);

  // Python execution
  const { data: pyR } = await api('POST', '/api/code/run', { code: 'print("hello from python")', language: 'python' }, sToken);
  assert('Python execution works', pyR.state === 'completed', `output="${pyR.result?.output?.trim()}"`);

  // ── 12. SESSION TERMINATION LOGIC ─────────────────────────
  console.log('\n━━━  PHASE 11: Session Termination Logic  ━━━\n');

  // Create a SEPARATE exam specifically for termination test (warningLimit=2)
  const { data: termExam } = await api('POST', '/api/exams', {
    title: 'TERMINATION TEST EXAM',
    subject: 'Python',
    startTime: new Date(now - 60000).toISOString(),
    endTime: new Date(now.getTime() + 7200000).toISOString(),
    duration: 10,
    warningLimit: 2  // low limit for testing
  }, tToken);
  assert('Termination test exam created', !!termExam._id);

  await api('POST', '/api/exams/join', { joinCode: termExam.joinCode }, sToken);
  await api('POST', `/api/student/exam/${termExam._id}/start`, {}, sToken);

  // Submit with violation (reason='violation' → status='terminated')
  const { ok: termOk, data: termData } = await api('POST', `/api/student/exam/${termExam._id}/submit`,
    { reason: 'violation' }, sToken
  );
  assert('Violation submit accepted', termOk, `status=${termData.status}`);
  assert('Violated session marked as TERMINATED', termData.status === 'terminated', `status=${termData.status}`);
  assert('Terminated session has endTime', !!termData.endTime);
  assert('Terminated session has score', typeof termData.score === 'number', `score=${termData.score}%`);

  // Cannot restart terminated session
  const { ok: restartOk, data: restartData } = await api('POST', `/api/student/exam/${termExam._id}/start`, {}, sToken);
  assert('Cannot restart terminated session', 
    !restartOk || restartData.session?.status === 'terminated',
    `status=${restartData.session?.status || restartData.message}`
  );

  // Normal submit → status='submitted'  
  const { data: normSub } = await api('POST', `/api/student/exam/${examId}/submit`, {}, sToken);
  assert('Normal submit → status=submitted', normSub.status === 'submitted', `status=${normSub.status}`);

  // ── 13. RESULTS PAGE VERIFICATION ─────────────────────────
  console.log('\n━━━  PHASE 12: Results Page Data  ━━━\n');

  const { ok: resOk, data: resData } = await api('GET', `/api/exams/${examId}/my-results`, null, sToken);
  assert('Results endpoint accessible', resOk, `status=${resData.message || 'ok'}`);
  assert('Results has session', resData.session?.status === 'submitted', `status=${resData.session?.status}`);
  assert('Results has submissions array', Array.isArray(resData.submissions), `count=${resData.submissions?.length}`);
  assert('Results has exam info', resData.exam?.title === 'SIMULATION TEST EXAM', `title=${resData.exam?.title}`);
  assert('Score is calculated %', typeof resData.session?.score === 'number', `score=${resData.session?.score}%`);
  
  // Check termination results too
  const { ok: termResOk, data: termResData } = await api('GET', `/api/exams/${termExam._id}/my-results`, null, sToken);
  assert('Terminated exam results accessible', termResOk);
  assert('Terminated results shows terminated status', termResData.session?.status === 'terminated',
    `status=${termResData.session?.status}`
  );

  // ── 14. TEACHER MONITOR VIEW ──────────────────────────────
  console.log('\n━━━  PHASE 13: Teacher Monitoring  ━━━\n');

  const { ok: monOk, data: monData } = await api('GET', `/api/exams/${examId}/students`, null, tToken);
  assert('Teacher sees student list', monOk && Array.isArray(monData), `students=${monData?.length}`);
  
  const stuEntry = monData?.find(s => s.email === 'teststudent@exam.com');
  assert('Student visible to teacher', !!stuEntry, `found=${!!stuEntry}`);
  assert('Student status=submitted visible', stuEntry?.status === 'submitted', `status=${stuEntry?.status}`);
  assert('Student score visible', typeof stuEntry?.score === 'number', `score=${stuEntry?.score}%`);
  assert('Student warnings count visible', typeof stuEntry?.warnings === 'number', `warnings=${stuEntry?.warnings}`);
  assert('Violation history visible to teacher', Array.isArray(stuEntry?.violationHistory),
    `violations=${stuEntry?.violationHistory?.length}`
  );

  // ── FINAL REPORT ─────────────────────────────────────────
  const total = pass + fail;
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  TEST RESULTS: ${String(pass).padEnd(2)}/${total} passed                              ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  console.log('PASSED:', pass, '  FAILED:', fail);

  if (fail > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`   • ${r.name}${r.detail ? ' → ' + r.detail : ''}`);
    });
  } else {
    console.log('\n🎉 ALL TESTS PASSED!');
  }

  console.log(`\nExam ID: ${examId}`);
  console.log(`Join Code: ${joinCode}`);
  console.log('Student: teststudent@exam.com / Test1234!');
  console.log('Teacher: testteacher@exam.com / Test1234!\n');

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('\n💥 FATAL:', e.message, e.stack); process.exit(1); });
