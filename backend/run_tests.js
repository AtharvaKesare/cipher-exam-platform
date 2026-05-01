/**
 * ============================================================
 * PROCTORED EXAM PLATFORM — COMPREHENSIVE SIMULATION TEST
 * ============================================================
 * Simulates: tab_switch, face_missing, multiple_faces,
 *   identity_mismatch, fullscreen_exit, window_blur, copy_paste
 * Tests: violation logging, DB persistence, session termination,
 *   code execution, teacher monitoring, results page
 * ============================================================
 */
import http from 'http';
import { io } from 'socket.io-client';

const BASE = { host: 'localhost', port: 5000 };
let pass = 0, fail = 0;
const results = [];

// ── HTTP helper ──────────────────────────────────────────────
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
        catch { resolve({ ok: false, status: res.statusCode, data: { raw: raw.substring(0, 200) } }); }
      });
    });
    req.on('error', e => resolve({ ok: false, status: 0, data: { error: e.message } }));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function assert(name, condition, detail = '') {
  const icon = condition ? '  ✅' : '  ❌';
  console.log(`${icon} ${name}${detail ? '  →  ' + detail : ''}`);
  results.push({ name, ok: !!condition, detail });
  if (condition) pass++; else fail++;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

// ── Socket helpers ───────────────────────────────────────────
function connectSocket() {
  return new Promise(resolve => {
    const s = io('http://localhost:5000', { transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', () => resolve(null));
    setTimeout(() => resolve(null), 5000);
  });
}

function emitWarning(socket, examId, studentId, eventType) {
  return new Promise(resolve => {
    socket.emit('proctor_warning', { examId, studentId, eventType, timestamp: new Date() });
    setTimeout(resolve, 1000); // wait for DB write
  });
}

// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  PROCTORED EXAM PLATFORM — SIMULATION TEST SUITE    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ──────────────────────────────────────────────────────────
  console.log('━━━  SETUP: Accounts & Exam  ━━━\n');

  // Teacher login
  const { data: tData } = await api('POST', '/api/auth/login', {
    email: 'testteacher@exam.com', password: 'Test1234!'
  });
  const tToken = tData.token;
  assert('Teacher login', !!tToken, `role=${tData.role}`);

  // Student login (use freshstudent if teststudent role is wrong)
  const { data: rawSData } = await api('POST', '/api/auth/login', {
    email: 'teststudent@exam.com', password: 'Test1234!'
  });
  let sToken, studentId;
  if (rawSData.role === 'student') {
    sToken = rawSData.token; studentId = rawSData._id;
    assert('Student login (existing)', !!sToken, `id=${studentId}`);
  } else {
    // Register fresh student as fallback
    await api('POST', '/api/auth/register', {
      name: 'Proctor Test Student', email: 'proctortest2026@exam.com', password: 'Test1234!'
    });
    const { data: fsData } = await api('POST', '/api/auth/login', {
      email: 'proctortest2026@exam.com', password: 'Test1234!'
    });
    sToken = fsData.token; studentId = fsData._id;
    assert('Student login (fresh account)', !!sToken, `role=${fsData.role}`);
  }

  // Create exam
  const now = new Date();
  const { data: examData } = await api('POST', '/api/exams', {
    title: 'SIMULATION TEST EXAM',
    subject: 'JavaScript',
    startTime: new Date(now - 60000).toISOString(),
    endTime: new Date(now.getTime() + 7200000).toISOString(),
    duration: 60,
    warningLimit: 10  // high limit so violations don't auto-terminate
  }, tToken);
  const examId = examData._id;
  const joinCode = examData.joinCode;
  assert('Exam created', !!examId, `id=${examId}, code=${joinCode}`);

  // Add question
  const { data: qData } = await api('POST', `/api/exams/${examId}/questions`, {
    title: 'Sum Function', description: 'Print the sum of 2 and 3',
    difficulty: 'easy', allowedLanguages: ['javascript'],
    expectedOutput: '5', points: 10
  }, tToken);
  const questionId = qData._id;
  assert('Question added', !!questionId, `id=${questionId}`);

  // Enroll student
  const { ok: joinOk, data: joinData } = await api('POST', '/api/exams/join', { joinCode }, sToken);
  assert('Student enrolled', joinOk || joinData.message?.includes('already'), joinData.message || 'ok');

  // Start exam session
  const { ok: startOk, data: startData } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
  assert('Exam session started (in_progress)', startOk && startData.session?.status === 'in_progress',
    `status=${startData.session?.status}`);

  // ──────────────────────────────────────────────────────────
  console.log('\n━━━  PHASE 1: Socket Connection  ━━━\n');

  const socket = await connectSocket();
  assert('Socket.io connected to backend', !!socket, socket ? `socketId=${socket.id}` : 'CONNECTION FAILED');

  if (!socket) {
    console.log('\n  ⚠️  Cannot proceed with violation tests — socket failed\n');
  } else {
    // Teacher joins monitor room
    socket.emit('join_monitor', examId);
    await wait(300);

    // Capture real-time teacher events
    const teacherReceived = [];
    socket.on('student_warning', data => teacherReceived.push(data));

    // ──────────────────────────────────────────────────────
    console.log('\n━━━  PHASE 2: Tab Switch Simulation  ━━━\n');
    await emitWarning(socket, examId, studentId, 'tab_switch');
    const { data: s1 } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
    assert('tab_switch → session.warnings incremented',
      (s1.session?.warnings ?? 0) >= 1,
      `warnings=${s1.session?.warnings}`);
    assert('tab_switch → violationHistory entry saved',
      s1.session?.violationHistory?.some(v => v.type === 'tab_switch'),
      `history=${JSON.stringify(s1.session?.violationHistory?.map(v => v.type))}`);

    // ──────────────────────────────────────────────────────
    console.log('\n━━━  PHASE 3: No Face Detected  ━━━\n');
    await emitWarning(socket, examId, studentId, 'face_missing');
    const { data: s2 } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
    assert('face_missing → violationHistory saved',
      s2.session?.violationHistory?.some(v => v.type === 'face_missing'),
      `count=${s2.session?.violationHistory?.length}`);

    // ──────────────────────────────────────────────────────
    console.log('\n━━━  PHASE 4: Multiple Faces Detected  ━━━\n');
    await emitWarning(socket, examId, studentId, 'multiple_faces');
    const { data: s3 } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
    assert('multiple_faces → violationHistory saved',
      s3.session?.violationHistory?.some(v => v.type === 'multiple_faces'),
      `count=${s3.session?.violationHistory?.length}`);

    // ──────────────────────────────────────────────────────
    console.log('\n━━━  PHASE 5: Identity Mismatch  ━━━\n');
    await emitWarning(socket, examId, studentId, 'identity_mismatch');
    const { data: s4 } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
    assert('identity_mismatch → violationHistory saved',
      s4.session?.violationHistory?.some(v => v.type === 'identity_mismatch'),
      `count=${s4.session?.violationHistory?.length}`);

    // ──────────────────────────────────────────────────────
    console.log('\n━━━  PHASE 6: Fullscreen Exit & Window Blur  ━━━\n');
    await emitWarning(socket, examId, studentId, 'fullscreen_exit');
    await emitWarning(socket, examId, studentId, 'window_blur');
    const { data: s5 } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
    assert('fullscreen_exit → violationHistory saved',
      s5.session?.violationHistory?.some(v => v.type === 'fullscreen_exit'),
      `count=${s5.session?.violationHistory?.length}`);
    assert('window_blur → violationHistory saved',
      s5.session?.violationHistory?.some(v => v.type === 'window_blur'),
      `count=${s5.session?.violationHistory?.length}`);

    // ──────────────────────────────────────────────────────
    console.log('\n━━━  PHASE 7: Copy-Paste & Real-time Teacher Alert  ━━━\n');
    await emitWarning(socket, examId, studentId, 'copy_paste');
    await wait(500);
    assert('Teacher socket received real-time student_warning event',
      teacherReceived.length > 0,
      `received ${teacherReceived.length} events: [${teacherReceived.map(w => w.eventType).join(', ')}]`);

    // ──────────────────────────────────────────────────────
    console.log('\n━━━  PHASE 8: Violation History Summary  ━━━\n');
    const { data: sAll } = await api('POST', `/api/student/exam/${examId}/start`, {}, sToken);
    const hist = sAll.session?.violationHistory || [];
    const types = [...new Set(hist.map(v => v.type))];
    assert('All 7 violation types stored in session',
      types.length >= 7,
      `types: [${types.join(', ')}]`);
    assert('session.warnings field equals violationHistory.length',
      sAll.session?.warnings === hist.length,
      `warnings=${sAll.session?.warnings} vs history=${hist.length}`);

    socket.disconnect();
  }

  // ──────────────────────────────────────────────────────────
  console.log('\n━━━  PHASE 9: DB — ProctorLog Collection  ━━━\n');

  const { ok: logOk, data: logData } = await api('GET', `/api/exams/${examId}/logs`, null, tToken);
  assert('Teacher fetches ProctorLogs', logOk && Array.isArray(logData), `count=${logData?.length}`);

  const logTypes = [...new Set(logData?.map(l => l.eventType) || [])];
  const allExpected = ['tab_switch','face_missing','multiple_faces','identity_mismatch','fullscreen_exit','window_blur','copy_paste'];
  for (const t of allExpected) {
    assert(`ProctorLog DB has "${t}" record`, logTypes.includes(t));
  }
  assert('ProctorLog has studentId populated (name)',
    logData?.[0]?.studentId?.name !== undefined,
    `name="${logData?.[0]?.studentId?.name}"`);

  // Student cannot read logs
  const { ok: stuLogFail } = await api('GET', `/api/exams/${examId}/logs`, null, sToken);
  assert('Student cannot GET proctor logs (403)', !stuLogFail);

  // ──────────────────────────────────────────────────────────
  console.log('\n━━━  PHASE 10: Code Execution  ━━━\n');

  const run = (code, lang = 'javascript') => api('POST', '/api/code/run', {
    code, language: lang, examId, questionId
  }, sToken);

  const { data: r1 } = await run('console.log(2 + 3)');
  assert('Correct JS answer → passed=true', r1.result?.passed === true,
    `output="${r1.result?.output?.trim()}"`);
  assert('Output exactly matches expectedOutput "5"', r1.result?.output?.trim() === '5');

  const { data: r2 } = await run('console.log("wrong")');
  assert('Wrong answer → passed=false', r2.result?.passed === false,
    `output="${r2.result?.output?.trim()}"`);

  const { data: r3 } = await run('const x = <<<BROKEN>>>');
  assert('Syntax error → resultType is runtime/system error',
    ['runtime_error','system_error'].includes(r3.result?.resultType),
    `resultType=${r3.result?.resultType}`);
  assert('Syntax error → passed=false', r3.result?.passed === false);

  const { ok: emptyFail } = await run('');
  assert('Empty code → rejected (400)', !emptyFail);

  const { data: pyR } = await api('POST', '/api/code/run', {
    code: 'print("hello python")', language: 'python'
  }, sToken);
  assert('Python execution works', pyR.state === 'completed',
    `output="${pyR.result?.output?.trim()}"`);

  // ──────────────────────────────────────────────────────────
  console.log('\n━━━  PHASE 11: Session Termination Logic  ━━━\n');

  // Create termination test exam
  const { data: termExam } = await api('POST', '/api/exams', {
    title: 'TERMINATION TEST',
    subject: 'Python',
    startTime: new Date(now - 60000).toISOString(),
    endTime: new Date(now.getTime() + 7200000).toISOString(),
    duration: 10, warningLimit: 2
  }, tToken);
  assert('Termination exam created', !!termExam._id);

  await api('POST', '/api/exams/join', { joinCode: termExam.joinCode }, sToken);
  await api('POST', `/api/student/exam/${termExam._id}/start`, {}, sToken);

  // Submit with reason=violation → should be 'terminated'
  const { ok: tOk, data: tData2 } = await api('POST', `/api/student/exam/${termExam._id}/submit`,
    { reason: 'violation' }, sToken);
  assert('Violation submit accepted (2xx)', tOk, `status=${tData2.status}`);
  assert('Session status = "terminated"', tData2.status === 'terminated', `status=${tData2.status}`);
  assert('Termination has endTime', !!tData2.endTime);
  assert('Termination has score', typeof tData2.score === 'number', `score=${tData2.score}%`);

  // Can't restart terminated session
  const { ok: reOk, data: reData } = await api('POST', `/api/student/exam/${termExam._id}/start`, {}, sToken);
  assert('Cannot restart terminated session',
    !reOk || reData.session?.status === 'terminated',
    `response=${JSON.stringify(reData).substring(0,80)}`);

  // Normal submit → 'submitted'
  const { data: normSub } = await api('POST', `/api/student/exam/${examId}/submit`, {}, sToken);
  assert('Normal submit → status=submitted', normSub.status === 'submitted', `status=${normSub.status}`);

  // ──────────────────────────────────────────────────────────
  console.log('\n━━━  PHASE 12: Results Page Data  ━━━\n');

  const { ok: rOk, data: rData } = await api('GET', `/api/exams/${examId}/my-results`, null, sToken);
  assert('Results endpoint returns 200', rOk, `status=${rData.message || 'ok'}`);
  assert('Results.session.status = submitted', rData.session?.status === 'submitted',
    `status=${rData.session?.status}`);
  assert('Results has submissions array', Array.isArray(rData.submissions),
    `count=${rData.submissions?.length}`);
  assert('Results has exam title', rData.exam?.title === 'SIMULATION TEST EXAM',
    `title="${rData.exam?.title}"`);
  assert('Results has numeric score', typeof rData.session?.score === 'number',
    `score=${rData.session?.score}%`);

  const { ok: trOk, data: trData } = await api('GET', `/api/exams/${termExam._id}/my-results`, null, sToken);
  assert('Terminated exam results accessible', trOk);
  assert('Terminated results.session.status = terminated',
    trData.session?.status === 'terminated', `status=${trData.session?.status}`);

  // ──────────────────────────────────────────────────────────
  console.log('\n━━━  PHASE 13: Teacher Monitoring Dashboard  ━━━\n');

  const { ok: mOk, data: mData } = await api('GET', `/api/exams/${examId}/students`, null, tToken);
  assert('Teacher sees student list', mOk && Array.isArray(mData), `count=${mData?.length}`);

  const stu = mData?.find(s => s._id === studentId || s.email?.includes('test'));
  assert('Target student appears in monitoring', !!stu, `email=${stu?.email}`);
  assert('Student status visible', typeof stu?.status === 'string', `status=${stu?.status}`);
  assert('Student score visible to teacher', typeof stu?.score === 'number', `score=${stu?.score}%`);
  assert('Student warnings count visible', typeof stu?.warnings === 'number', `warnings=${stu?.warnings}`);

  // ──────────────────────────────────────────────────────────
  // FINAL SUMMARY
  const total = pass + fail;
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${pass}/${total} passed  (${fail} failed)` + ' '.repeat(Math.max(0, 38 - String(pass).length - String(total).length - String(fail).length)) + '║');
  console.log('╚══════════════════════════════════════════════════════╝');

  if (fail > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.ok).forEach(r =>
      console.log(`   • ${r.name}${r.detail ? ' → ' + r.detail : ''}`)
    );
  } else {
    console.log('\n🎉 ALL TESTS PASSED!');
  }

  console.log(`\nExam ID:   ${examId}`);
  console.log(`Join Code: ${joinCode}\n`);

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('\n💥 FATAL:', e.message); process.exit(1); });
