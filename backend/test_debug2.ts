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

async function runDebug() {
  const testEmail = `test_debug_${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  console.log('1. Registering test user...');
  const registerRes = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Debug User', email: testEmail, password: testPassword }),
  });

  if (registerRes.status !== 201) {
    console.error('Failed to register:', registerRes.data);
    return;
  }

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
  console.log('Profile:', profileId);

  // Create assignment with XSS in title
  const xssTitle = '<script>alert("XSS")</script>';
  const assignmentRes = await makeRequest('/assignments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: xssTitle,
      subject: 'Test',
      level: 'school',
      handwritingProfileId: profileId,
      paperStyle: 'ruled',
      pageSize: 'A4',
      questions: [{ id: 'q1', text: 'What is 2+2?' }],
      settings: {},
    }),
  });

  if (assignmentRes.status !== 201) {
    console.error('Failed to create assignment:', assignmentRes.data);
    return;
  }

  const assignmentId = assignmentRes.data.assignment.id;
  console.log('Assignment:', assignmentId);

  // Get preview
  const previewRes = await makeRequest(`/assignments/${assignmentId}/preview`, {
    headers: authHeaders,
  });

  console.log('Preview status:', previewRes.status);
  const html = typeof previewRes.data === 'string' ? previewRes.data : '';
  console.log('HTML length:', html.length);
  
  // Find the actual title content in the HTML - look for the h1 tag
  const h1Start = html.indexOf('<h1 class="assignment-title">');
  if (h1Start >= 0) {
    const h1End = html.indexOf('</h1>', h1Start);
    if (h1End >= 0) {
      const titleContent = html.substring(h1Start, h1End + 5);
      console.log('Title HTML:', titleContent);
    }
  }
  
  // Also search for the payload
  const scriptPos = html.indexOf('<script>');
  if (scriptPos >= 0) {
    console.log('Script found at:', scriptPos);
    console.log('Context:', html.substring(Math.max(0, scriptPos - 50), scriptPos + 50));
  }
  
  // Clean up
  await makeRequest(`/assignments/${assignmentId}`, { method: 'DELETE', headers: authHeaders });
}

runDebug().catch(console.error);
