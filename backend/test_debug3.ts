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

async function testPayload(payload: string, name: string) {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  const registerRes = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test', email: testEmail, password: testPassword }),
  });
  const { accessToken } = registerRes.data;
  const cookieHeader = registerRes.headers['set-cookie']?.[0]?.split(';')[0] || '';
  const authHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Cookie': `refreshToken=${cookieHeader}`,
  };

  const formData = new FormData();
  formData.append('name', 'Test Profile');
  formData.append('image', fs.createReadStream('test_handwriting.png'), {
    filename: 'test.png',
    contentType: 'image/png',
  });
  const profileRes = await makeFormRequest('/handwriting/profiles', formData, authHeaders);
  const profileId = profileRes.data.profile.id;

  const assignmentRes = await makeRequest('/assignments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: payload,
      subject: 'Test',
      level: 'school',
      handwritingProfileId: profileId,
      paperStyle: 'ruled',
      pageSize: 'A4',
      questions: [{ id: 'q1', text: 'What is 2+2?' }],
      settings: {},
    }),
  });

  const assignmentId = assignmentRes.data.assignment.id;
  const previewRes = await makeRequest(`/assignments/${assignmentId}/preview`, {
    headers: authHeaders,
  });

  const html = typeof previewRes.data === 'string' ? previewRes.data : '';
  
  // Find title
  const h1Start = html.indexOf('<h1 class="assignment-title">');
  if (h1Start >= 0) {
    const h1End = html.indexOf('</h1>', h1Start);
    if (h1End >= 0) {
      const titleContent = html.substring(h1Start, h1End + 5);
      console.log(`${name}: ${titleContent}`);
    }
  }
  
  await makeRequest(`/assignments/${assignmentId}`, { method: 'DELETE', headers: authHeaders });
}

async function runTests() {
  const payloads = [
    { payload: '<script>alert("XSS")</script>', name: 'script' },
    { payload: '<img src=x onerror=alert("XSS")>', name: 'img-onerror' },
    { payload: '<svg onload=alert("XSS")>', name: 'svg-onload' },
    { payload: '<iframe src="javascript:alert(\'XSS\')"></iframe>', name: 'iframe' },
    { payload: '<body onload=alert("XSS")>', name: 'body-onload' },
  ];

  for (const p of payloads) {
    await testPayload(p.payload, p.name);
  }
}

runTests().catch(console.error);
