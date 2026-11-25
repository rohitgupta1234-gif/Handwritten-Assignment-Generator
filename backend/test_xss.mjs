import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:5000/api';

// XSS test payloads
const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  '<body onload=alert("XSS")>',
];

// Create a minimal 1x1 PNG file for testing
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_BUFFER = Buffer.from(PNG_BASE64, 'base64');
const TEST_IMAGE_PATH = 'C:/Users/Lenovo/handwritten-assignment-generator/backend/test_image.png';

fs.writeFileSync(TEST_IMAGE_PATH, PNG_BUFFER);

async function makeRequest(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
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

async function makeFormRequest(endpoint, formData, headers = {}) {
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

async function runTests() {
  console.log('=== XSS Security Testing ===\n');

  // 1. Register a test user
  const testEmail = `test_xss_${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  console.log('1. Registering test user...');
  const registerRes = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'XSS Test User', email: testEmail, password: testPassword }),
  });

  if (registerRes.status !== 201) {
    console.error('Failed to register user:', registerRes.data);
    return;
  }

  const { accessToken, user } = registerRes.data;
  console.log('   User registered:', user.id);

  const cookieHeader = registerRes.headers['set-cookie']?.[0]?.split(';')[0] || '';
  const authHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Cookie': `refreshToken=${cookieHeader}`,
  };

  // 2. Create handwriting profile with image upload
  console.log('\n2. Creating handwriting profile...');
  const formData = new FormData();
  formData.append('name', 'Test Profile');
  formData.append('image', fs.createReadStream(TEST_IMAGE_PATH), {
    filename: 'test.png',
    contentType: 'image/png',
  });

  const profileRes = await makeFormRequest('/handwriting/profiles', formData, authHeaders);

  if (profileRes.status !== 201) {
    console.error('Failed to create profile:', profileRes.data);
    return;
  }

  const profileId = profileRes.data.profile.id;
  console.log('   Profile created:', profileId);
  console.log('   Profile status:', profileRes.data.profile.status);
  console.log('   Profile isActive:', profileRes.data.profile.isActive);

  // Analyze the handwriting profile
  console.log('\n3. Analyzing handwriting profile...');
  const analyzeRes = await makeRequest(`/handwriting/profiles/${profileId}/analyze`, {
    method: 'POST',
    headers: authHeaders,
  });
  console.log('   Analyze status:', analyzeRes.status);
  if (analyzeRes.status !== 200) {
    console.log('   Analyze error:', analyzeRes.data);
  } else {
    console.log('   Profile analyzed successfully');
    console.log('   Profile status:', analyzeRes.data.profile?.status);
  }

  // Wait a moment for any async processing
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 4. Test basic assignment creation first
  console.log('\n3. Testing basic assignment creation...');
  const basicAssignmentRes = await makeRequest('/assignments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Test Assignment',
      subject: 'Test',
      level: 'school',
      handwritingProfileId: profileId,
      paperStyle: 'ruled',
      pageSize: 'A4',
      questions: [{ id: 'q1', text: 'What is 2+2?' }],
      settings: {},
    }),
  });

  console.log('   Status:', basicAssignmentRes.status);
  console.log('   Data:', JSON.stringify(basicAssignmentRes.data).substring(0, 200));

  if (basicAssignmentRes.status === 201) {
    const assignmentId = basicAssignmentRes.data.id;

    // Test preview
    const previewRes = await makeRequest(`/assignments/${assignmentId}/preview`, {
      headers: authHeaders,
    });

    console.log('   Preview status:', previewRes.status);
    const html = typeof previewRes.data === 'string' ? previewRes.data : '';
    console.log('   Preview HTML length:', html.length);
    console.log('   Preview contains title:', html.includes('Test Assignment'));

    // Clean up
    await makeRequest(`/assignments/${assignmentId}`, { method: 'DELETE', headers: authHeaders });
  }

  // 4. Test XSS in assignment title
  console.log('\n4. Testing XSS in assignment title...');
  for (const payload of XSS_PAYLOADS) {
    const body = {
      title: payload,
      subject: 'Test',
      level: 'school',
      handwritingProfileId: profileId,
      paperStyle: 'ruled',
      pageSize: 'A4',
      questions: [{ id: 'q1', text: 'What is 2+2?' }],
      settings: {},
    };
    console.log('   Sending body:', JSON.stringify(body));
    const assignmentRes = await makeRequest('/assignments', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    });

    console.log(`   Payload: ${payload.substring(0, 40)}...`);
    console.log(`   Status: ${assignmentRes.status}`);
    if (assignmentRes.status !== 201) {
      console.log(`   Error:`, assignmentRes.data);
    }

    if (assignmentRes.status === 201) {
      const assignmentId = assignmentRes.data.id;

      // Test preview
      const previewRes = await makeRequest(`/assignments/${assignmentId}/preview`, {
        headers: authHeaders,
      });

      const html = typeof previewRes.data === 'string' ? previewRes.data : '';
      const hasScript = html.includes('<script>') || html.includes('onerror=') || html.includes('onload=');
      const hasPayload = html.includes(payload);

      console.log(`   Preview - Script tags in output: ${hasScript}, Raw payload in output: ${hasPayload}`);

      // Clean up
      await makeRequest(`/assignments/${assignmentId}`, { method: 'DELETE', headers: authHeaders });
    }
  }

  // Clean up test image
  fs.unlinkSync(TEST_IMAGE_PATH);

  console.log('\n=== XSS Testing Complete ===');
}

runTests().catch(console.error);