/**
 * CIPHER PLATFORM - FINAL COMPREHENSIVE TEST v2
 * Tests all critical features with proper teacher upgrade flow
 */

const BASE = 'http://localhost:5000/api';
let results = [];
let teacherToken = null;
let studentToken = null;
let examId = null;
let joinCode = null;
let questionId = null;

function log(test, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  results.push({ test, status, detail });
  console.log(`${icon} [${status}] ${test}${detail ? ' — ' + detail : ''}`);
}

async function req(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data, ok: res.ok };
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 CIPHER PLATFORM — FINAL PRE-DEMO TEST SUITE v2');
  console.log('📅 Date: ' + new Date().toLocaleString());
  console.log('='.repeat(70) + '\n');

  // ═══════════════════════════════════════════════════════════════
  // 1. SERVER HEALTH
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 1. SERVER HEALTH ---');
  
  try {
    const r = await fetch('http://localhost:5000/');
    const txt = await r.text();
    log('Backend API running', txt.includes('running') ? 'PASS' : 'FAIL', `"${txt.trim()}"`);
  } catch (e) { log('Backend API running', 'FAIL', e.message); }

  try {
    const r = await fetch('http://localhost:3000/', { redirect: 'follow' });
    log('Frontend server running', r.status === 200 ? 'PASS' : 'FAIL', `Status: ${r.status}`);
  } catch (e) { log('Frontend server running', 'FAIL', e.message); }

  // ═══════════════════════════════════════════════════════════════
  // 2. AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 2. AUTHENTICATION ---');

  // Test validation
  const regEmpty = await req('POST', '/auth/register', {});
  log('Empty registration rejected', regEmpty.status >= 400 ? 'PASS' : 'FAIL', `Status: ${regEmpty.status}`);

  const loginBad = await req('POST', '/auth/login', { email: 'nonexistent@xyz.com', password: 'wrong' });
  log('Invalid login rejected', loginBad.status === 401 ? 'PASS' : 'FAIL', `Status: ${loginBad.status}`);

  // Register & upgrade to teacher (using the actual upgrade flow)
  const ts = Date.now();
  const teacherEmail = `teacher_${ts}@cipher.test`;
  const regTeacher = await req('POST', '/auth/register', {
    name: 'Demo Teacher', email: teacherEmail, password: 'TestPass123!'
  });
  log('Register account', [200, 201].includes(regTeacher.status) ? 'PASS' : 'FAIL', `Status: ${regTeacher.status}`);

  let tempToken = regTeacher.data?.token;
  if (tempToken) {
    // Upgrade to teacher
    const upgrade = await req('POST', '/auth/upgrade-to-teacher', {
      inviteCode: 'CYBER-TEACH-2026', subjectSpecialty: 'Python'
    }, tempToken);
    log('Upgrade to teacher', upgrade.ok ? 'PASS' : 'FAIL', `Status: ${upgrade.status}, Message: ${JSON.stringify(upgrade.data?.message || upgrade.data)?.substring(0, 100)}`);

    // Re-login to get fresh token with teacher role
    const loginTeacher = await req('POST', '/auth/login', { email: teacherEmail, password: 'TestPass123!' });
    teacherToken = loginTeacher.data?.token;
    log('Teacher login with role', teacherToken ? 'PASS' : 'FAIL', `Role: ${loginTeacher.data?.role}`);

    // Verify role is teacher
    const me = await req('GET', '/auth/me', null, teacherToken);
    log('Verify teacher role (GET /me)', me.data?.role === 'teacher' ? 'PASS' : 'FAIL', `Role: ${me.data?.role}`);
  }

  // Invalid upgrade code test
  const badUpgrade = await req('POST', '/auth/upgrade-to-teacher', {
    inviteCode: 'WRONG-CODE', subjectSpecialty: 'Python'
  }, tempToken);
  log('Invalid invite code rejected', badUpgrade.status === 401 ? 'PASS' : 'FAIL', `Status: ${badUpgrade.status}`);

  // Register student
  const studentEmail = `student_${ts}@cipher.test`;
  const regStudent = await req('POST', '/auth/register', {
    name: 'Demo Student', email: studentEmail, password: 'TestPass123!'
  });
  studentToken = regStudent.data?.token;
  log('Register student', studentToken ? 'PASS' : 'FAIL', `Status: ${regStudent.status}, Role: ${regStudent.data?.role}`);

  // Auth security tests
  const noAuth = await req('GET', '/exams');
  log('Protected route without token = 401', noAuth.status === 401 ? 'PASS' : 'FAIL', `Status: ${noAuth.status}`);

  const badAuth = await req('GET', '/exams', null, 'invalid_token');
  log('Invalid token = 401', badAuth.status === 401 ? 'PASS' : 'FAIL', `Status: ${badAuth.status}`);

  // ═══════════════════════════════════════════════════════════════
  // 3. EXAM CREATION (Teacher)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 3. EXAM CREATION (Teacher) ---');

  if (teacherToken) {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 60000);
    const end = new Date(now.getTime() + 120 * 60000);

    const createExam = await req('POST', '/exams', {
      title: 'Final Demo Test Exam', subject: 'Python',
      startTime: start.toISOString(), endTime: end.toISOString(),
      duration: 60, warningLimit: 3
    }, teacherToken);

    if (createExam.data?._id) {
      examId = createExam.data._id;
      joinCode = createExam.data.joinCode;
      log('Create exam', 'PASS', `ID: ${examId}, Join: ${joinCode}`);
    } else {
      log('Create exam', 'FAIL', `Status: ${createExam.status}, Body: ${JSON.stringify(createExam.data)}`);
    }

    // Add question
    if (examId) {
      const addQ = await req('POST', `/exams/${examId}/questions`, {
        title: 'Hello World',
        description: 'Write a Python program that prints "Hello, World!"',
        difficulty: 'easy', expectedOutput: 'Hello, World!\n', points: 10
      }, teacherToken);
      questionId = addQ.data?._id;
      log('Add question', questionId ? 'PASS' : 'FAIL', `Q-ID: ${questionId}`);
      
      // Get exam details 
      const examDetail = await req('GET', `/exams/${examId}`, null, teacherToken);
      log('Get exam details', examDetail.ok ? 'PASS' : 'FAIL', `Questions: ${examDetail.data?.questions?.length}`);

      // Get exam students (should be empty)
      const examStudents = await req('GET', `/exams/${examId}/students`, null, teacherToken);
      log('Get exam students', examStudents.ok ? 'PASS' : 'FAIL', `Count: ${Array.isArray(examStudents.data) ? examStudents.data.length : 'N/A'}`);

      // Get exam logs
      const examLogs = await req('GET', `/exams/${examId}/logs`, null, teacherToken);
      log('Get exam logs', examLogs.ok ? 'PASS' : 'FAIL', `Count: ${Array.isArray(examLogs.data) ? examLogs.data.length : 'N/A'}`);
    }

    // Test student can't create exam
    const studentCreate = await req('POST', '/exams', { title: 'Hack', subject: 'Python', startTime: new Date().toISOString(), endTime: new Date().toISOString(), duration: 10 }, studentToken);
    log('Student blocked from creating exam', studentCreate.status === 403 ? 'PASS' : 'FAIL', `Status: ${studentCreate.status}`);

    // Get teacher exams list
    const getExams = await req('GET', '/exams', null, teacherToken);
    log('Get teacher exams list', getExams.ok ? 'PASS' : 'FAIL', `Count: ${Array.isArray(getExams.data) ? getExams.data.length : 'N/A'}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. STUDENT EXAM FLOW
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 4. STUDENT EXAM FLOW ---');

  if (studentToken && joinCode) {
    const joinResult = await req('POST', '/exams/join', { joinCode }, studentToken);
    log('Student joins exam', joinResult.ok ? 'PASS' : 'FAIL', `Status: ${joinResult.status}, ExamID: ${joinResult.data?.examId}`);

    // Double join should fail gracefully
    const doubleJoin = await req('POST', '/exams/join', { joinCode }, studentToken);
    log('Double-join returns "already enrolled"', doubleJoin.status === 400 ? 'PASS' : 'WARN', `Status: ${doubleJoin.status}, Msg: ${doubleJoin.data?.message}`);

    // Start exam session
    if (examId) {
      const startSession = await req('POST', `/student-exams/${examId}/start`, {}, studentToken);
      log('Start exam session', startSession.ok ? 'PASS' : 'FAIL', `Status: ${startSession.status}, Session: ${startSession.data?.session?._id || 'N/A'}`);

      // Verify enroll status
      const enrollStatus = await req('GET', `/exams/${examId}/enroll-status`, null, studentToken);
      log('Enroll status check', enrollStatus.data?.isEnrolled ? 'PASS' : 'FAIL', `Enrolled: ${enrollStatus.data?.isEnrolled}`);
    }

    // Invalid join code
    const badJoin = await req('POST', '/exams/join', { joinCode: 'INVALID' }, studentToken);
    log('Invalid join code rejected', badJoin.status === 404 ? 'PASS' : 'FAIL', `Status: ${badJoin.status}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. CODE EXECUTION
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 5. CODE EXECUTION ---');

  if (studentToken && examId && questionId) {
    // Python execution
    const pyRun = await req('POST', '/code/run', {
      code: 'print("Hello, World!")', language: 'python', examId, questionId
    }, studentToken);
    log('Python code execution', pyRun.ok ? 'PASS' : 'FAIL', `Output: "${pyRun.data?.result?.output?.trim()}", Passed: ${pyRun.data?.result?.passed}`);

    // Verify expected output matching
    const passedPy = pyRun.data?.result?.passed;
    log('Python expected output match', passedPy === true ? 'PASS' : 'FAIL', `Expected match: ${passedPy}`);

    // Wrong output
    const pyWrong = await req('POST', '/code/run', {
      code: 'print("Wrong!")', language: 'python', examId, questionId
    }, studentToken);
    log('Wrong output correctly fails', pyWrong.data?.result?.passed === false ? 'PASS' : 'FAIL', `Passed: ${pyWrong.data?.result?.passed}`);

    // JavaScript execution  
    const jsRun = await req('POST', '/code/run', {
      code: 'console.log("Hello from JS!")', language: 'javascript', examId, questionId
    }, studentToken);
    log('JavaScript code execution', jsRun.ok && jsRun.data?.result?.output ? 'PASS' : 'FAIL', `Output: "${jsRun.data?.result?.output?.trim()}"`);

    // SQL execution
    const sqlRun = await req('POST', '/code/run', {
      code: 'SELECT name, salary FROM employees WHERE salary > 50000;', language: 'sql', examId, questionId
    }, studentToken);
    log('SQL code execution', sqlRun.ok ? 'PASS' : 'FAIL', `Output: "${sqlRun.data?.result?.output?.trim()?.substring(0, 100)}"`);

    // Runtime error handling
    const pyError = await req('POST', '/code/run', {
      code: 'print(1/0)', language: 'python', examId, questionId
    }, studentToken);
    log('Runtime error handled', pyError.ok && pyError.data?.result?.resultType === 'runtime_error' ? 'PASS' : 'FAIL', `Type: ${pyError.data?.result?.resultType}`);

    // Syntax error handling
    const pySyntax = await req('POST', '/code/run', {
      code: 'def foo(\n  pass', language: 'python', examId, questionId
    }, studentToken);
    log('Syntax error handled', pySyntax.ok && ['runtime_error', 'error'].includes(pySyntax.data?.result?.resultType) ? 'PASS' : 'WARN', `Type: ${pySyntax.data?.result?.resultType}`);

    // Empty code blocked
    const emptyCode = await req('POST', '/code/run', { code: '', language: 'python', examId, questionId }, studentToken);
    log('Empty code blocked (400)', emptyCode.status === 400 ? 'PASS' : 'FAIL', `Status: ${emptyCode.status}`);

    // Whitespace-only code
    const wsCode = await req('POST', '/code/run', { code: '   \n  \n  ', language: 'python', examId, questionId }, studentToken);
    log('Whitespace-only code blocked', wsCode.status === 400 ? 'PASS' : 'WARN', `Status: ${wsCode.status}`);

    // No auth blocked
    const noAuthRun = await req('POST', '/code/run', { code: 'print("test")', language: 'python' });
    log('Code execution without auth = 401', noAuthRun.status === 401 ? 'PASS' : 'FAIL', `Status: ${noAuthRun.status}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. EXAM SUBMISSION
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 6. EXAM SUBMISSION ---');

  if (studentToken && examId && questionId) {
    const submit = await req('POST', `/student-exams/${examId}/submit`, {
      reason: 'normal',
      finalCode: 'print("Hello, World!")',
      questionId, language: 'python',
      allCode: { [`${questionId}_python`]: 'print("Hello, World!")' }
    }, studentToken);
    log('Submit exam', submit.ok ? 'PASS' : 'FAIL', `Status: ${submit.status}, FinalStatus: ${submit.data?.status}`);

    // Verify session status updated
    const myResults = await req('GET', `/exams/${examId}/my-results`, null, studentToken);
    log('Get my results', myResults.ok ? 'PASS' : 'FAIL', `Status: ${myResults.data?.session?.status}, Score: ${myResults.data?.session?.score}`);

    // Re-start should fail (exam already submitted)
    const reStart = await req('POST', `/student-exams/${examId}/start`, {}, studentToken);
    log('Re-start submitted exam blocked (409)', reStart.status === 409 ? 'PASS' : 'WARN', `Status: ${reStart.status}, Msg: ${reStart.data?.message}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. TEACHER GRADING & REVIEW
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 7. TEACHER GRADING & REVIEW ---');

  if (teacherToken && examId && regStudent.data?._id) {
    const studentId = regStudent.data._id;

    const submissions = await req('GET', `/exams/${examId}/students/${studentId}/submissions`, null, teacherToken);
    log('Get student submissions', submissions.ok ? 'PASS' : 'FAIL', `Count: ${submissions.data?.submissions?.length}`);

    const scoreResult = await req('POST', `/exams/${examId}/students/${studentId}/score`, { score: 85 }, teacherToken);
    log('Assign score to student', scoreResult.ok ? 'PASS' : 'FAIL', `Score: ${scoreResult.data?.session?.score}`);

    // Invalid score
    const badScore = await req('POST', `/exams/${examId}/students/${studentId}/score`, { score: 150 }, teacherToken);
    log('Invalid score (>100) rejected', badScore.status === 400 ? 'PASS' : 'FAIL', `Status: ${badScore.status}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. DASHBOARD & STATS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 8. DASHBOARD & STATS ---');

  if (teacherToken) {
    const tStats = await req('GET', '/dashboard/teacher', null, teacherToken);
    log('Teacher dashboard stats', tStats.ok ? 'PASS' : 'FAIL', `Active: ${tStats.data?.activeExams}, Students: ${tStats.data?.totalStudents}, Flags: ${tStats.data?.flagsRaised}`);

    const tStudents = await req('GET', '/dashboard/students', null, teacherToken);
    log('Teacher students list', tStudents.ok ? 'PASS' : 'FAIL', `Count: ${Array.isArray(tStudents.data) ? tStudents.data.length : 'N/A'}`);
  }

  if (studentToken) {
    const sStats = await req('GET', '/dashboard/student', null, studentToken);
    log('Student dashboard stats', sStats.ok ? 'PASS' : 'FAIL', `Results: ${sStats.data?.recentResults?.length}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. ADMIN ROUTES
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 9. ADMIN ACCESS ---');

  const adminNoAuth = await req('GET', '/admin/users', null, studentToken);
  log('Student can\'t access admin', adminNoAuth.status === 403 ? 'PASS' : 'FAIL', `Status: ${adminNoAuth.status}`);

  const teacherAdminBlock = await req('GET', '/admin/users', null, teacherToken);
  log('Teacher can\'t access admin', teacherAdminBlock.status === 403 ? 'PASS' : 'FAIL', `Status: ${teacherAdminBlock.status}`);

  // ═══════════════════════════════════════════════════════════════
  // 10. EDGE CASES & SECURITY
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 10. EDGE CASES & SECURITY ---');

  const invalidExam = await req('GET', '/exams/000000000000000000000000', null, teacherToken);
  log('Non-existent exam ID = 404', invalidExam.status === 404 ? 'PASS' : 'WARN', `Status: ${invalidExam.status}`);

  const malformedId = await req('GET', '/exams/not-a-valid-id', null, teacherToken);
  log('Malformed ObjectId handled', malformedId.status >= 400 ? 'PASS' : 'FAIL', `Status: ${malformedId.status}`);

  const sqli = await req('POST', '/auth/login', { email: "admin'; DROP TABLE users; --", password: "test" });
  log('NoSQL injection attempt safe', sqli.status === 401 ? 'PASS' : 'WARN', `Status: ${sqli.status}`);

  // Duplicate email registration
  const dupeReg = await req('POST', '/auth/register', { name: 'Dupe', email: studentEmail, password: 'TestPass123!' });
  log('Duplicate email rejected', dupeReg.status === 400 ? 'PASS' : 'FAIL', `Status: ${dupeReg.status}`);

  // Rate limiting present
  try {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' })
    });
    const rl = r.headers.get('ratelimit-remaining');
    log('Rate limiting active', rl !== null ? 'PASS' : 'WARN', `Remaining: ${rl}`);
  } catch(e) { log('Rate limiting', 'WARN', e.message); }

  // ═══════════════════════════════════════════════════════════════
  // 11. EXAM MANAGEMENT (Extend, Delete)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 11. EXAM MANAGEMENT ---');

  if (teacherToken && examId) {
    const extend = await req('PUT', `/exams/${examId}/extend`, { additionalMinutes: 15 }, teacherToken);
    log('Extend exam time', extend.ok ? 'PASS' : 'FAIL', `Message: ${extend.data?.message}`);

    // Regenerate join code
    const regen = await req('POST', `/exams/${examId}/generate-code`, {}, teacherToken);
    log('Regenerate join code', regen.ok ? 'PASS' : 'FAIL', `New code: ${regen.data?.joinCode}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 12. FRONTEND PAGES
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 12. FRONTEND PAGES ---');

  const pages = [
    ['Landing page (/)', '/'],
    ['Login page (/login)', '/login'],
    ['Register page (/register)', '/register'],
    ['Student dashboard', '/dashboard/student'],
    ['Teacher dashboard', '/dashboard/teacher'],
    ['Teacher create exam', '/dashboard/teacher/create'],
    ['Admin dashboard', '/dashboard/admin'],
  ];

  for (const [name, path] of pages) {
    try {
      const r = await fetch(`http://localhost:3000${path}`, { redirect: 'follow' });
      log(name, r.status === 200 ? 'PASS' : 'WARN', `HTTP ${r.status}`);
    } catch (e) { log(name, 'FAIL', e.message); }
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP: Delete test exam
  // ═══════════════════════════════════════════════════════════════
  if (teacherToken && examId) {
    await req('DELETE', `/exams/${examId}`, null, teacherToken);
    console.log('\n🧹 Test exam cleaned up.');
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  
  console.log(`\n  ✅ PASSED:   ${passed}/${total}`);
  console.log(`  ⚠️  WARNINGS: ${warned}/${total}`);
  console.log(`  ❌ FAILED:   ${failed}/${total}`);
  console.log(`  📈 SCORE:    ${Math.round((passed/total)*100)}%`);

  if (failed > 0) {
    console.log('\n🔴 FAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`   ❌ ${r.test}: ${r.detail}`));
  }
  if (warned > 0) {
    console.log('\n🟡 WARNINGS:');
    results.filter(r => r.status === 'WARN').forEach(r => console.log(`   ⚠️  ${r.test}: ${r.detail}`));
  }

  console.log('\n' + '='.repeat(70));
  if (failed === 0) console.log('🎉 ALL CRITICAL TESTS PASSED — Ready for demo!');
  else console.log('⚠️  Some tests failed. Review before demo.');
  console.log('='.repeat(70) + '\n');
}

runTests().catch(err => { console.error('FATAL:', err); process.exit(1); });
