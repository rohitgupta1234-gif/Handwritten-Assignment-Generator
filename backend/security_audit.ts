import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:5000/api';

async function makeRequest(endpoint: string, options: any = {}) {
  const { headers: optionHeaders, ...restOptions } = options;
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...optionHeaders,
    },
    ...restOptions,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data, headers: response.headers.raw() };
}

async function makeFormRequest(endpoint: string, formData: FormData, headers: any = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: headers,
    body: formData,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data, headers: response.headers.raw() };
}

async function runAudit() {
  console.log('=== SECURITY AUDIT ===\n');

  // Register test user
  const testEmail = `audit_${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  const registerRes = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Audit User', email: testEmail, password: testPassword }),
  });
  const { accessToken } = registerRes.data;
  const cookieHeader = registerRes.headers['set-cookie']?.[0]?.split(';')[0] || '';
  const authHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Cookie': `refreshToken=${cookieHeader}`,
  };

  console.log('1. AUTHENTICATION & AUTHORIZATION TESTS\n');

  // Test 1: Access without token
  console.log('1.1 Access without token:');
  const noAuthRes = await makeRequest('/assignments');
  console.log(`   Status: ${noAuthRes.status} (expected 401)`);

  // Test 2: Access with invalid token
  console.log('\n1.2 Access with invalid token:');
  const invalidAuthRes = await makeRequest('/assignments', {
    headers: { 'Authorization': 'Bearer invalid_token' }
  });
  console.log(`   Status: ${invalidAuthRes.status} (expected 401)`);

  // Test 3: Access another user's data
  console.log('\n1.3 Access another user\'s assignment (IDOR):');
  const otherEmail = `other_${Date.now()}@example.com`;
  const otherReg = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Other User', email: otherEmail, password: 'TestPass123!' }),
  });
  const { accessToken: otherToken } = otherReg.data;
  const otherCookie = otherReg.headers['set-cookie']?.[0]?.split(';')[0] || '';
  const otherHeaders = {
    'Authorization': `Bearer ${otherToken}`,
    'Cookie': `refreshToken=${otherCookie}`,
  };

  // Create assignment as user 1
  const formData = new FormData();
  formData.append('name', 'Test Profile');
  formData.append('image', fs.createReadStream('test_handwriting.png'), {
    filename: 'test.png',
    contentType: 'image/png',
  });
  const profileRes = await makeFormRequest('/handwriting/profiles', formData, authHeaders);
  const profileId = profileRes.data.profile.id;

  const assignRes = await makeRequest('/assignments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'User 1 Assignment',
      subject: 'Test',
      level: 'school',
      handwritingProfileId: profileId,
      paperStyle: 'ruled',
      pageSize: 'A4',
      questions: [{ id: 'q1', text: 'Q1' }],
      settings: {},
    }),
  });
  const assignmentId = assignRes.data.assignment.id;

  // Try to access as user 2
  const idorRes = await makeRequest(`/assignments/${assignmentId}`, {
    headers: otherHeaders,
  });
  console.log(`   Status: ${idorRes.status} (expected 404)`);

  console.log('\n2. INPUT VALIDATION TESTS\n');

  // Test SQL injection in various fields
  const sqlPayloads = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "admin'--",
    "' UNION SELECT * FROM users --",
  ];

  console.log('2.1 SQL Injection in title:');
  for (const payload of sqlPayloads) {
    const res = await makeRequest('/assignments', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: payload,
        subject: 'Test',
        level: 'school',
        handwritingProfileId: profileId,
        paperStyle: 'ruled',
        pageSize: 'A4',
        questions: [{ id: 'q1', text: 'Q1' }],
        settings: {},
      }),
    });
    console.log(`   Payload: ${payload.substring(0, 30)}... Status: ${res.status}`);
    if (res.status === 500) {
      console.log(`   ERROR: ${JSON.stringify(res.data)}`);
    }
    if (res.status === 201) {
      await makeRequest(`/assignments/${res.data.assignment.id}`, { method: 'DELETE', headers: authHeaders });
    }
  }

  console.log('\n3. FILE UPLOAD TESTS\n');

  // Test 3.1: Upload non-image file
  console.log('3.1 Upload .exe file:');
  const exeForm = new FormData();
  exeForm.append('name', 'Test');
  exeForm.append('image', Buffer.from('MZ'), { filename: 'test.exe', contentType: 'application/x-msdownload' });
  const exeRes = await makeFormRequest('/handwriting/profiles', exeForm, authHeaders);
  console.log(`   Status: ${exeRes.status} (expected 400/415)`);

  // Test 3.2: Upload oversized file
  console.log('\n3.2 Upload oversized file (10MB):');
  const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'x');
  const largeForm = new FormData();
  largeForm.append('name', 'Test');
  largeForm.append('image', largeBuffer, { filename: 'large.png', contentType: 'image/png' });
  const largeRes = await makeFormRequest('/handwriting/profiles', largeForm, authHeaders);
  console.log(`   Status: ${largeRes.status} (expected 413/400)`);

  // Test 3.3: Upload SVG with script
  console.log('\n3.3 Upload SVG with script:');
  const svgContent = '<svg onload=alert("XSS") xmlns="http://www.w3.org/2000/svg"></svg>';
  const svgForm = new FormData();
  svgForm.append('name', 'Test');
  svgForm.append('image', Buffer.from(svgContent), { filename: 'test.svg', contentType: 'image/svg+xml' });
  const svgRes = await makeFormRequest('/handwriting/profiles', svgForm, authHeaders);
  console.log(`   Status: ${svgRes.status}`);

  console.log('\n4. RATE LIMITING TESTS\n');

  // Test rate limiting on auth endpoints
  console.log('4.1 Rapid registration attempts:');
  for (let i = 0; i < 5; i++) {
    const r = await makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: `rate${i}@example.com`, password: 'TestPass123!' }),
    });
    console.log(`   Attempt ${i+1}: ${r.status}`);
  }

  console.log('\n5. SECURITY HEADERS TEST\n');

  // Check security headers on preview endpoint
  const previewRes = await makeRequest(`/assignments/${assignmentId}/preview`, {
    headers: authHeaders,
  });
  console.log('5.1 Preview endpoint headers:');
  console.log(`   CSP: ${previewRes.headers['content-security-policy']?.[0] || 'MISSING'}`);
  console.log(`   X-Content-Type-Options: ${previewRes.headers['x-content-type-options']?.[0] || 'MISSING'}`);
  console.log(`   X-Frame-Options: ${previewRes.headers['x-frame-options']?.[0] || 'MISSING'}`);
  console.log(`   Content-Type: ${previewRes.headers['content-type']?.[0] || 'MISSING'}`);

  console.log('\n6. PASSWORD SECURITY\n');

  // Check if password is hashed (can't directly test, but check registration doesn't return password)
  const regCheck = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test', email: `passcheck_${Date.now()}@example.com`, password: 'TestPass123!' }),
  });
  console.log('6.1 Password not in response:', !JSON.stringify(regCheck.data).includes('TestPass123!'));

  // Cleanup
  await makeRequest(`/assignments/${assignmentId}`, { method: 'DELETE', headers: authHeaders });

  console.log('\n=== AUDIT COMPLETE ===');
}

runAudit().catch(console.error);