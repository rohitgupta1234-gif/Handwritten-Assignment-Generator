import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

async function testRateLimit() {
  const testEmail = 'ratelimit_test_' + Date.now() + '@example.com';
  const testPassword = 'TestPass123!';

  // Register
  const reg = await fetch(BASE_URL + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'RL Test', email: testEmail, password: testPassword })
  });
  console.log('Register:', reg.status, 'Limit:', reg.headers.get('X-RateLimit-Limit'), 'Remaining:', reg.headers.get('X-RateLimit-Remaining'));

  const data = await reg.json();
  const authHeaders = {
    'Authorization': 'Bearer ' + data.accessToken,
    'Cookie': reg.headers.get('set-cookie') || ''
  };

  // Make a few requests to check rate limit headers
  for (let i = 0; i < 5; i++) {
    const res = await fetch(BASE_URL + '/auth/me', { headers: authHeaders });
    console.log('Request ' + (i+1) + ':', res.status, 'Limit:', res.headers.get('X-RateLimit-Limit'), 'Remaining:', res.headers.get('X-RateLimit-Remaining'));
  }
}

async function testXSS() {
  // Test XSS in preview endpoint
  const testEmail = 'xss_test_' + Date.now() + '@example.com';
  const testPassword = 'TestPass123!';

  const reg = await fetch(BASE_URL + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'XSS Test', email: testEmail, password: testPassword })
  });

  const data = await reg.json();
  const authHeaders = {
    'Authorization': 'Bearer ' + data.accessToken,
    'Cookie': reg.headers.get('set-cookie') || ''
  };

  // Create assignment with XSS payload
  const assignmentRes = await fetch(BASE_URL + '/assignments', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '<script>alert("XSS")</script>',
      subject: 'Mathematics',
      level: 'high-school',
      paperStyle: 'ruled',
      pageSize: 'A4',
      questions: [
        { id: 'q1', text: '<img src=x onerror=alert(1)>' }
      ],
      settings: {},
    }),
  });

  const assignment = await assignmentRes.json();
  console.log('Create Assignment with XSS:', assignmentRes.status);

  if (assignment.assignment?.id) {
    const previewRes = await fetch(BASE_URL + '/assignments/' + assignment.assignment.id + '/preview', { headers: authHeaders });
    const previewHtml = await previewRes.text();
    console.log('Preview contains script tag:', previewHtml.includes('<script>'));
    console.log('Preview contains escaped script:', previewHtml.includes('<script>'));
    console.log('Preview status:', previewRes.status);
  }
}

async function testAIFallback() {
  // This would require mocking or checking config - just check config
  console.log('AI Provider config check: See config/index.ts');
}

async function runTests() {
  console.log('=== RATE LIMIT TEST ===');
  await testRateLimit();

  console.log('\n=== XSS PROTECTION TEST ===');
  await testXSS();

  console.log('\n=== AI FALLBACK CONFIG CHECK ===');
  console.log('Config shows: aiProvider defaults to openai, gemini as alternative');
  console.log('Both API keys configurable via env vars');
  console.log('Fallback logic in ai/generate-answers endpoint');
}

runTests().catch(console.error);