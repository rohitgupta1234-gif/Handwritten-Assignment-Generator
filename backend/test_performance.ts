import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:5000/api';

interface PerfResult {
  name: string;
  duration: number;
  unit: string;
  status?: number;
}

const results: PerfResult[] = [];

async function makeRequest(endpoint: string, options: any = {}) {
  const { headers: optionHeaders, ...restOptions } = options;
  const start = Date.now();
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...optionHeaders,
    },
    ...restOptions,
  });
  const duration = Date.now() - start;

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data, duration };
}

async function makeFormRequest(endpoint: string, formData: FormData, headers: any = {}) {
  const start = Date.now();
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: headers,
    body: formData,
  });
  const duration = Date.now() - start;

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data, duration };
}

async function runPerfTests() {
  console.log('=== PERFORMANCE BENCHMARKING ===\n');

  // 1. Register a test user
  const testEmail = `perf_${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  const registerRes = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Perf Test User', email: testEmail, password: testPassword }),
  });
  results.push({ name: 'User Registration', duration: registerRes.duration, unit: 'ms', status: registerRes.status });
  console.log(`User Registration: ${registerRes.duration}ms (${registerRes.status})`);

  const { accessToken } = registerRes.data;
  const cookieHeader = registerRes.headers?.['set-cookie']?.[0] || '';
  const refreshTokenMatch = cookieHeader.match(/refreshToken=([^;]+)/);
  const refreshToken = refreshTokenMatch ? refreshTokenMatch[1] : '';

  const authHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Cookie': `refreshToken=${refreshToken}`,
  };

  // 2. Login (test existing user)
  const loginRes = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  results.push({ name: 'User Login', duration: loginRes.duration, unit: 'ms', status: loginRes.status });
  console.log(`User Login: ${loginRes.duration}ms (${loginRes.status})`);

  // 3. Get current user
  const meRes = await makeRequest('/auth/me', { headers: authHeaders });
  results.push({ name: 'Get Current User', duration: meRes.duration, unit: 'ms', status: meRes.status });
  console.log(`Get Current User: ${meRes.duration}ms (${meRes.status})`);

  // 4. Create assignment (without handwriting profile for speed)
  const assignmentRes = await makeRequest('/assignments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Performance Test Assignment',
      subject: 'Mathematics',
      level: 'high-school',
      paperStyle: 'ruled',
      pageSize: 'A4',
      questions: [
        { id: 'q1', text: 'What is 2+2?' },
        { id: 'q2', text: 'Solve for x: 2x + 5 = 15' },
        { id: 'q3', text: 'Find the derivative of x^2' },
        { id: 'q4', text: 'Integrate sin(x) from 0 to pi' },
        { id: 'q5', text: 'What is the limit of 1/x as x approaches infinity?' }
      ],
      settings: {},
    }),
  });
  results.push({ name: 'Create Assignment (5 questions)', duration: assignmentRes.duration, unit: 'ms', status: assignmentRes.status });
  console.log(`Create Assignment (5 questions): ${assignmentRes.duration}ms (${assignmentRes.status})`);

  const assignmentId = assignmentRes.data?.assignment?.id;

  // 5. Assignment Preview
  if (assignmentId) {
    const previewRes = await makeRequest(`/assignments/${assignmentId}/preview`, { headers: authHeaders });
    results.push({ name: 'Assignment Preview', duration: previewRes.duration, unit: 'ms', status: previewRes.status });
    console.log(`Assignment Preview: ${previewRes.duration}ms (${previewRes.status})`);
  }

  // 6. List Assignments (DB query)
  const listAssignmentsRes = await makeRequest('/assignments', { headers: authHeaders });
  results.push({ name: 'List Assignments (DB query)', duration: listAssignmentsRes.duration, unit: 'ms', status: listAssignmentsRes.status });
  console.log(`List Assignments (DB query): ${listAssignmentsRes.duration}ms (${listAssignmentsRes.status})`);

  // 7. List Handwriting Profiles (DB query)
  const listProfilesRes = await makeRequest('/handwriting/profiles', { headers: authHeaders });
  results.push({ name: 'List Profiles (DB query)', duration: listProfilesRes.duration, unit: 'ms', status: listProfilesRes.status });
  console.log(`List Profiles (DB query): ${listProfilesRes.duration}ms (${listProfilesRes.status})`);

  // 8. Health check
  const healthRes = await makeRequest('/health');
  results.push({ name: 'Health Check', duration: healthRes.duration, unit: 'ms', status: healthRes.status });
  console.log(`Health Check: ${healthRes.duration}ms (${healthRes.status})`);

  // 9. OCR Test (with simple image)
  const ocrForm = new FormData();
  ocrForm.append('image', fs.createReadStream('../test_handwriting.png'), {
    filename: 'ocr.png',
    contentType: 'image/png',
  });
  const ocrRes = await makeFormRequest('/ai/ocr', ocrForm, authHeaders);
  results.push({ name: 'OCR Processing', duration: ocrRes.duration, unit: 'ms', status: ocrRes.status });
  console.log(`OCR Processing: ${ocrRes.duration}ms (${ocrRes.status})`);

  // Summary
  console.log('\n=== PERFORMANCE SUMMARY ===');
  results.forEach(r => {
    console.log(`${r.name}: ${r.duration}${r.unit} (status: ${r.status})`);
  });

  // Calculate averages
  const avg = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`\nAverage: ${avg.toFixed(2)}ms`);

  // Save results to file
  fs.writeFileSync('performance_results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to performance_results.json');
}

runPerfTests().catch(console.error);