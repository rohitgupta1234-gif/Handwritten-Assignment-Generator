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

async function test() {
  const testEmail = `csp_${Date.now()}@example.com`;
  const registerRes = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test', email: testEmail, password: 'TestPass123!' }),
  });
  console.log('Register:', registerRes.status, registerRes.data);
  const { accessToken } = registerRes.data;
  const cookieHeader = registerRes.headers['set-cookie']?.[0]?.split(';')[0] || '';
  const authHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Cookie': `refreshToken=${cookieHeader}`,
  };

  const formData = new FormData();
  formData.append('name', 'Test');
  formData.append('image', fs.createReadStream('test_handwriting.png'), {
    filename: 'test.png',
    contentType: 'image/png',
  });
  const profileRes = await makeFormRequest('/handwriting/profiles', formData, authHeaders);
  console.log('Profile:', profileRes.status, profileRes.data);
  const profileId = profileRes.data?.profile?.id;

  if (!profileId) {
    console.log('Failed to create profile');
    return;
  }

  const assignRes = await makeRequest('/assignments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Test',
      subject: 'Test',
      level: 'school',
      handwritingProfileId: profileId,
      paperStyle: 'ruled',
      pageSize: 'A4',
      questions: [{ id: 'q1', text: 'Q1' }],
      settings: {},
    }),
  });
  console.log('Assignment:', assignRes.status, assignRes.data);
  const assignmentId = assignRes.data?.assignment?.id;

  if (!assignmentId) {
    console.log('Failed to create assignment');
    return;
  }

  // Test preview headers
  const previewRes = await makeRequest(`/assignments/${assignmentId}/preview`, {
    headers: authHeaders,
  });
  console.log('Preview Status:', previewRes.status);
  console.log('CSP:', previewRes.headers['content-security-policy']?.[0] || 'MISSING');
  console.log('X-Content-Type-Options:', previewRes.headers['x-content-type-options']?.[0] || 'MISSING');
  console.log('X-Frame-Options:', previewRes.headers['x-frame-options']?.[0] || 'MISSING');
  console.log('Content-Type:', previewRes.headers['content-type']?.[0] || 'MISSING');

  await makeRequest(`/assignments/${assignmentId}`, { method: 'DELETE', headers: authHeaders });
}

test().catch(console.error);
