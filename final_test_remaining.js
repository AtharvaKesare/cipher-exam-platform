const BASE='http://localhost:5000/api';
async function req(m,p,b,t){
  const o={method:m,headers:{'Content-Type':'application/json'}};
  if(t)o.headers.Authorization='Bearer '+t;
  if(b)o.body=JSON.stringify(b);
  const r=await fetch(BASE+p,o);
  let d;try{d=await r.json()}catch{d=null};
  return{status:r.status,data:d,ok:r.ok}
}

async function test() {
  const ts=Date.now();
  // Register + upgrade teacher
  const r1=await req('POST','/auth/register',{name:'t'+ts,email:'t'+ts+'@t.com',password:'p123456'});
  const tok=r1.data?.token;
  await req('POST','/auth/upgrade-to-teacher',{inviteCode:'CYBER-TEACH-2026',subjectSpecialty:'Python'},tok);
  const l=await req('POST','/auth/login',{email:'t'+ts+'@t.com',password:'p123456'});
  const tt=l.data?.token;

  // Create exam
  const now=new Date();
  const s=new Date(now.getTime()-30*60000);
  const e=new Date(now.getTime()+120*60000);
  const ce=await req('POST','/exams',{title:'FinalTest',subject:'Python',startTime:s.toISOString(),endTime:e.toISOString(),duration:60,warningLimit:3},tt);
  const eid=ce.data?._id;
  const jc=ce.data?.joinCode;
  const aq=await req('POST','/exams/'+eid+'/questions',{title:'Q',description:'test',difficulty:'easy',expectedOutput:'Hello, World!\n',points:10},tt);
  const qid=aq.data?._id;

  // Register student
  const r2=await req('POST','/auth/register',{name:'s'+ts,email:'s'+ts+'@t.com',password:'p123456'});
  const st=r2.data?.token;
  const sid=r2.data?._id;

  // Student flow
  await req('POST','/exams/join',{joinCode:jc},st);
  await req('POST','/student-exams/'+eid+'/start',{},st);
  await req('POST','/code/run',{code:'print("Hello, World!")',language:'python',examId:eid,questionId:qid},st);
  await req('POST','/student-exams/'+eid+'/submit',{reason:'normal',finalCode:'print("Hello, World!")',questionId:qid,language:'python'},st);

  console.log('\n--- Remaining Tests ---');

  const t1=await req('GET','/dashboard/teacher',null,tt);
  console.log('✅ Teacher stats:', t1.ok?'PASS':'FAIL', JSON.stringify(t1.data));

  const t2=await req('GET','/dashboard/students',null,tt);
  console.log(t2.ok?'✅':'❌', 'Teacher students:', t2.ok?'PASS':'FAIL', 'Count:', t2.data?.length);

  const t3=await req('GET','/dashboard/student',null,st);
  console.log(t3.ok?'✅':'❌', 'Student stats:', t3.ok?'PASS':'FAIL');

  const t4=await req('GET','/exams/'+eid+'/students/'+sid+'/submissions',null,tt);
  console.log(t4.ok?'✅':'❌', 'Get submissions:', t4.ok?'PASS':'FAIL', 'Count:', t4.data?.submissions?.length);

  const t5=await req('POST','/exams/'+eid+'/students/'+sid+'/score',{score:90},tt);
  console.log(t5.ok?'✅':'❌', 'Assign score:', t5.ok?'PASS':'FAIL', 'Score:', t5.data?.session?.score);

  const t6=await req('POST','/exams/'+eid+'/students/'+sid+'/score',{score:150},tt);
  console.log(t6.status===400?'✅':'❌', 'Invalid score rejected:', t6.status===400?'PASS':'FAIL', 'Status:', t6.status);

  const t7=await req('PUT','/exams/'+eid+'/extend',{additionalMinutes:15},tt);
  console.log(t7.ok?'✅':'❌', 'Extend exam:', t7.ok?'PASS':'FAIL', t7.data?.message);

  const t8=await req('POST','/exams/'+eid+'/generate-code',{},tt);
  console.log(t8.ok?'✅':'❌', 'Regen join code:', t8.ok?'PASS':'FAIL', 'New:', t8.data?.joinCode);

  const t9=await req('POST','/student-exams/'+eid+'/start',{},st);
  console.log(t9.status===409?'✅':'❌', 'Re-start blocked (409):', t9.status===409?'PASS':'FAIL', 'Status:', t9.status);

  const t10=await req('GET','/exams/000000000000000000000000',null,tt);
  console.log(t10.status===404?'✅':'⚠️', 'Non-existent exam 404:', t10.status===404?'PASS':'WARN', 'Got:', t10.status);

  const t11=await req('GET','/admin/users',null,st);
  console.log(t11.status===403?'✅':'❌', 'Student admin blocked:', t11.status===403?'PASS':'FAIL');

  const t12=await req('GET','/admin/users',null,tt);
  console.log(t12.status===403?'✅':'❌', 'Teacher admin blocked:', t12.status===403?'PASS':'FAIL');

  const dupe=await req('POST','/auth/register',{name:'D',email:'s'+ts+'@t.com',password:'p123456'});
  console.log(dupe.status===400?'✅':'❌', 'Dupe email rejected:', dupe.status===400?'PASS':'FAIL');

  // Test SQL separately
  const sqlRun=await req('POST','/code/run',{code:'SELECT name, salary FROM employees;',language:'sql',examId:eid,questionId:qid},st);
  console.log(sqlRun.ok?'✅':'❌', 'SQL execution:', sqlRun.ok?'PASS':'FAIL', 'Output:', sqlRun.data?.result?.output?.substring(0,60));

  // Test runtime error
  const pyErr=await req('POST','/code/run',{code:'print(1/0)',language:'python',examId:eid,questionId:qid},st);
  console.log(pyErr.data?.result?.resultType==='runtime_error'?'✅':'❌', 'Runtime error handled:', pyErr.data?.result?.resultType==='runtime_error'?'PASS':'FAIL', 'Type:', pyErr.data?.result?.resultType);

  // Cleanup
  await req('DELETE','/exams/'+eid,null,tt);
  console.log('\n🧹 Test data cleaned up.');
  console.log('\n✅ All remaining tests complete!');
}

test().catch(e=>console.error('ERROR:', e.message));
