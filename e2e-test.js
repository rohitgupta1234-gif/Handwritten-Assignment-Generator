const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';
const REFERENCE_IMAGE = 'C:\\Users\\Lenovo\\Desktop\\handwritting6.jpg';

const testResults = {
  timestamp: new Date().toISOString(),
  steps: {},
  performance: {},
  screenshots: [],
  errors: []
};

async function takeScreenshot(page, name) {
  const screenshotDir = path.join(__dirname, 'test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  const screenshotPath = path.join(screenshotDir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  testResults.screenshots.push({ name, path: screenshotPath });
  return screenshotPath;
}

async function measureTime(label, fn) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  testResults.performance[label] = `${duration}ms`;
  return result;
}

async function apiCall(method, endpoint, data, token, retries = 3) {
  const isGetOrDelete = method.toLowerCase() === 'get' || method.toLowerCase() === 'delete';
  const config = {
    method,
    url: `${BACKEND_URL}${endpoint}`,
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    timeout: 30000
  };
  if (!isGetOrDelete) {
    config.headers['Content-Type'] = 'application/json';
    config.data = data;
  }
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.log(`  API Error: ${method} ${endpoint} - Status: ${error.response.status}, Data:`, JSON.stringify(error.response.data).substring(0, 500));
    } else {
      console.log(`  API Error: ${method} ${endpoint} - ${error.message}`);
    }
    if (retries > 0 && error.response && error.response.status === 500) {
      console.log(`  Retrying ${method} ${endpoint} after 500 error (${retries} retries left)...`);
      await new Promise(r => setTimeout(r, 2000));
      return apiCall(method, endpoint, data, token, retries - 1);
    }
    throw error;
  }
}

async function runTests() {
  const browser = await chromium.launch({ headless: false, slowMo: 100, timeout: 120000 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: 'test-screenshots/videos' }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  // Enable console logging
  page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.message}`));

  let authToken = null;

  try {
    // ============ STEP 1: AUTHENTICATION ============
    console.log('\n=== STEP 1: AUTHENTICATION ===');
    testResults.steps.authentication = {};

    // Login with demo user via API
    await measureTime('demo-login-api', async () => {
      const result = await apiCall('post', '/api/auth/login', {
        email: 'demo@handwriteai.com',
        password: 'demo123456'
      });
      authToken = result.accessToken;
    });
    testResults.steps.authentication.demoLoginApi = { success: true };

    // Login via UI
    await measureTime('demo-login-ui', async () => {
      await page.goto(`${FRONTEND_URL}/login`);
      await takeScreenshot(page, '01-login-page');

      await page.fill('input[name="email"]', 'demo@handwriteai.com');
      await page.fill('input[name="password"]', 'demo123456');
      await page.click('button[type="submit"]');
      await page.waitForURL(`${FRONTEND_URL}/dashboard`, { timeout: 15000 });
      await takeScreenshot(page, '02-after-demo-login');
    });
    testResults.steps.authentication.demoLoginUi = { success: true };

    // Verify dashboard loaded
    await measureTime('dashboard-load', async () => {
      await page.waitForSelector('text=Dashboard', { timeout: 5000 });
      await takeScreenshot(page, '03-dashboard-loaded');
    });
    testResults.steps.authentication.dashboardLoad = { success: true };

    // Refresh browser and verify auth persists
    await measureTime('refresh-page', async () => {
      await page.reload();
      await page.waitForSelector('text=Dashboard', { timeout: 10000 });
      await takeScreenshot(page, '04-after-refresh');
    });
    testResults.steps.authentication.refreshPersist = { success: true };

    // Logout via API
    await measureTime('logout', async () => {
      await apiCall('post', '/api/auth/logout', {}, authToken);
      await page.goto(`${FRONTEND_URL}/login`);
      await takeScreenshot(page, '05-after-logout');
    });
    testResults.steps.authentication.logout = { success: true };

    // Relogin via UI
    await measureTime('relogin', async () => {
      await page.fill('input[name="email"]', 'demo@handwriteai.com');
      await page.fill('input[name="password"]', 'demo123456');
      await page.click('button[type="submit"]');
      await page.waitForURL(`${FRONTEND_URL}/dashboard`, { timeout: 10000 });
      await takeScreenshot(page, '06-after-relogin');
    });
    testResults.steps.authentication.relogin = { success: true };

    // ============ STEP 2: ASSIGNMENT CREATION (via API) ============
    console.log('\n=== STEP 2: ASSIGNMENT CREATION ===');
    testResults.steps.assignment = {};

    const handwritingProfileId = '4ebe4936-4530-416e-9e6d-ef5056612e72';
    let assignmentId = null;

    await measureTime('create-assignment-api', async () => {
      const result = await apiCall('post', '/api/assignments', {
        title: 'E2E Test Assignment - Quantum Physics',
        subject: 'Physics',
        level: 'university',
        questions: [
          { id: 'q1', text: 'What is quantum mechanics?', type: 'essay', subject: 'Physics', order: 0, estimatedLength: 500 },
          { id: 'q2', text: 'Explain wave-particle duality with equations.', type: 'detailed', subject: 'Physics', order: 1, estimatedLength: 300 },
          { id: 'q3', text: 'What is the Schrödinger equation?', type: 'short', subject: 'Physics', order: 2, estimatedLength: 150 }
        ],
        handwritingProfileId,
        paperStyle: 'ruled',
        pageSize: 'A4'
      }, authToken);
      assignmentId = result.assignment.id;
      console.log('Created assignment:', assignmentId);
    });
    testResults.steps.assignment.create = { success: true, assignmentId };

    // ============ STEP 3: AI ANSWER GENERATION ============
    console.log('\n=== STEP 3: AI ANSWER GENERATION ===');
    testResults.steps.aiGeneration = {};

    await measureTime('generate-answers', async () => {
      const result = await apiCall('post', `/api/assignments/${assignmentId}/generate`, {}, authToken);
      console.log('Generated answers:', result.answers.length);
      testResults.steps.aiGeneration.answersCount = result.answers.length;
    });
    testResults.steps.aiGeneration.generate = { success: true };

    // ============ STEP 4: HANDWRITING GENERATION - PERSONAL MODE ============
    console.log('\n=== STEP 4: HANDWRITING GENERATION - PERSONAL MODE ===');
    testResults.steps.handwritingPersonal = {};

    let personalJobId = null;

    await measureTime('handwriting-personal-generate', async () => {
      const result = await apiCall('post', '/api/handwriting/generate', {
        assignmentId,
        handwritingProfileId,
        mode: 'personal',
        realisticOptions: {},
        forgeOptions: {}
      }, authToken);
      personalJobId = result.job.id;
      console.log('Personal mode job:', personalJobId);
    });
    testResults.steps.handwritingPersonal.generate = { success: true, jobId: personalJobId };

    // Poll for completion - wait a bit for background job to start
    await new Promise(r => setTimeout(r, 5000));
    await measureTime('handwriting-personal-poll', async () => {
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max
      while (attempts < maxAttempts) {
        const result = await apiCall('get', `/api/handwriting/generate/${personalJobId}`, null, authToken);
        if (result.job.status === 'completed') {
          console.log('Personal mode completed, pages:', result.job.totalPages);
          testResults.steps.handwritingPersonal.totalPages = result.job.totalPages;
          testResults.steps.handwritingPersonal.pagesData = result.job.pagesData;
          testResults.steps.handwritingPersonal.forgeMetadata = result.job.forgeMetadata;
          break;
        } else if (result.job.status === 'failed') {
          throw new Error(`Personal mode generation failed: ${result.job.errorMessage}`);
        }
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
      }
      if (attempts >= maxAttempts) {
        throw new Error('Personal mode generation timeout');
      }
    });
    testResults.steps.handwritingPersonal.poll = { success: true };

    // Navigate to preview page and take screenshot
    await measureTime('handwriting-personal-preview', async () => {
      await page.goto(`${FRONTEND_URL}/assignments/${assignmentId}/preview`);
      await page.waitForTimeout(3000); // Wait for rendering
      await takeScreenshot(page, '08-handwriting-personal-preview');
    });
    testResults.steps.handwritingPersonal.preview = { success: true };

    // ============ STEP 5: HANDWRITING GENERATION - REALISTIC MODE ============
    console.log('\n=== STEP 5: HANDWRITING GENERATION - REALISTIC MODE ===');
    testResults.steps.handwritingRealistic = {};

    let realisticJobId = null;

    await measureTime('handwriting-realistic-generate', async () => {
      const result = await apiCall('post', '/api/handwriting/generate', {
        assignmentId,
        handwritingProfileId,
        mode: 'realistic',
        realisticOptions: {
          style: 'casual',
          variationLevel: 'medium',
          penColor: 'blue'
        },
        forgeOptions: {}
      }, authToken);
      realisticJobId = result.job.id;
      console.log('Realistic mode job:', realisticJobId);
    });
    testResults.steps.handwritingRealistic.generate = { success: true, jobId: realisticJobId };

    // Poll for completion
    await measureTime('handwriting-realistic-poll', async () => {
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max
      while (attempts < maxAttempts) {
        const result = await apiCall('get', `/api/handwriting/generate/${realisticJobId}`, null, authToken);
        if (result.job.status === 'completed') {
          console.log('Realistic mode completed, pages:', result.job.totalPages);
          testResults.steps.handwritingRealistic.totalPages = result.job.totalPages;
          testResults.steps.handwritingRealistic.pagesData = result.job.pagesData;
          testResults.steps.handwritingRealistic.forgeMetadata = result.job.forgeMetadata;
          break;
        } else if (result.job.status === 'failed') {
          console.log('Realistic mode failed (expected if Forge not running):', result.job.errorMessage);
          testResults.steps.handwritingRealistic.failed = true;
          testResults.steps.handwritingRealistic.errorMessage = result.job.errorMessage;
          break;
        }
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
      }
      if (attempts >= maxAttempts) {
        throw new Error('Realistic mode generation timeout');
      }
    });
    testResults.steps.handwritingRealistic.poll = { success: true };

    // Navigate to preview page for realistic mode
    await measureTime('handwriting-realistic-preview', async () => {
      // We need to update the assignment to use the realistic mode generation
      // For now, just check if there's a preview
      try {
        await page.goto(`${FRONTEND_URL}/assignments/${assignmentId}/preview?mode=realistic`);
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '09-handwriting-realistic-preview');
        testResults.steps.handwritingRealistic.preview = { success: true };
      } catch (e) {
        testResults.steps.handwritingRealistic.preview = { success: false, error: e.message };
      }
    });

    // ============ STEP 6: DOCUMENT EXPORT - PDF ============
    console.log('\n=== STEP 6: DOCUMENT EXPORT - PDF ===');
    testResults.steps.pdfExport = {};

    await measureTime('pdf-export', async () => {
      try {
        const response = await axios({
          method: 'get',
          url: `${BACKEND_URL}/api/assignments/${assignmentId}/pdf`,
          headers: { 'Authorization': `Bearer ${authToken}` },
          responseType: 'arraybuffer',
          timeout: 120000
        });
        const pdfBuffer = Buffer.from(response.data);
        const pdfPath = path.join(__dirname, 'test-screenshots', `e2e-test-${Date.now()}.pdf`);
        fs.writeFileSync(pdfPath, pdfBuffer);
        testResults.steps.pdfExport.filePath = pdfPath;
        testResults.steps.pdfExport.fileSize = pdfBuffer.length;
        console.log('PDF exported:', pdfPath, 'size:', pdfBuffer.length);
      } catch (e) {
        console.error('PDF export failed:', e.message);
        testResults.steps.pdfExport.error = e.message;
      }
    });
    testResults.steps.pdfExport.export = { success: !!testResults.steps.pdfExport.filePath };

    // ============ STEP 7: DOCUMENT EXPORT - DOCX ============
    console.log('\n=== STEP 7: DOCUMENT EXPORT - DOCX ===');
    testResults.steps.docxExport = {};

    await measureTime('docx-export', async () => {
      try {
        const response = await axios({
          method: 'get',
          url: `${BACKEND_URL}/api/assignments/${assignmentId}/docx`,
          headers: { 'Authorization': `Bearer ${authToken}` },
          responseType: 'arraybuffer',
          timeout: 120000
        });
        const docxBuffer = Buffer.from(response.data);
        const docxPath = path.join(__dirname, 'test-screenshots', `e2e-test-${Date.now()}.docx`);
        fs.writeFileSync(docxPath, docxBuffer);
        testResults.steps.docxExport.filePath = docxPath;
        testResults.steps.docxExport.fileSize = docxBuffer.length;
        console.log('DOCX exported:', docxPath, 'size:', docxBuffer.length);
      } catch (e) {
        console.error('DOCX export failed:', e.message);
        testResults.steps.docxExport.error = e.message;
      }
    });
    testResults.steps.docxExport.export = { success: !!testResults.steps.docxExport.filePath };

    // ============ STEP 8: SECURITY TESTING ============
    console.log('\n=== STEP 8: SECURITY TESTING ===');
    testResults.steps.security = {};

    // Test 1: SQL Injection in login
    await measureTime('security-sql-injection', async () => {
      try {
        await apiCall('post', '/api/auth/login', {
          email: "admin' OR '1'='1",
          password: "anything' OR '1'='1"
        });
        testResults.steps.security.sqlInjection = { blocked: false };
      } catch (e) {
        testResults.steps.security.sqlInjection = { blocked: true, status: e.response?.status };
      }
    });

    // Test 2: XSS in assignment title
    await measureTime('security-xss', async () => {
      try {
        await apiCall('post', '/api/assignments', {
          title: '<script>alert("xss")</script>',
          subject: 'Physics',
          level: 'university',
          questions: [{ id: 'q1', text: 'Test', type: 'short', subject: 'Physics', order: 0, estimatedLength: 100 }],
          handwritingProfileId
        }, authToken);
        testResults.steps.security.xss = { blocked: false };
      } catch (e) {
        testResults.steps.security.xss = { blocked: true, status: e.response?.status };
      }
    });

    // Test 3: Unauthorized access
    await measureTime('security-unauthorized', async () => {
      try {
        await apiCall('get', '/api/assignments', null, 'invalid-token');
        testResults.steps.security.unauthorized = { blocked: false };
      } catch (e) {
        testResults.steps.security.unauthorized = { blocked: true, status: e.response?.status };
      }
    });

    // Test 4: Rate limiting (make many requests)
    await measureTime('security-rate-limit', async () => {
      let blocked = false;
      for (let i = 0; i < 20; i++) {
        try {
          await apiCall('get', '/api/health');
        } catch (e) {
          if (e.response?.status === 429) {
            blocked = true;
            break;
          }
        }
      }
      testResults.steps.security.rateLimit = { blocked };
    });

    // Test 5: CSRF protection (check for CSRF tokens or SameSite cookies)
    await measureTime('security-csrf', async () => {
      // Check if cookies have SameSite attribute
      const cookies = await context.cookies();
      const refreshCookie = cookies.find(c => c.name === 'refreshToken');
      testResults.steps.security.csrf = {
        hasRefreshCookie: !!refreshCookie,
        sameSite: refreshCookie?.sameSite,
        httpOnly: refreshCookie?.httpOnly,
        secure: refreshCookie?.secure
      };
    });

    // ============ STEP 9: PERFORMANCE MEASUREMENT ============
    console.log('\n=== STEP 9: PERFORMANCE MEASUREMENT ===');
    testResults.steps.performance = {};

    // Measure API response times
    await measureTime('perf-api-login', async () => {
      const start = Date.now();
      await apiCall('post', '/api/auth/login', {
        email: 'demo@handwriteai.com',
        password: 'demo123456'
      });
      return Date.now() - start;
    });

    await measureTime('perf-api-assignments', async () => {
      const start = Date.now();
      await apiCall('get', '/api/assignments', null, authToken);
      return Date.now() - start;
    });

    await measureTime('perf-api-handwriting-profiles', async () => {
      const start = Date.now();
      await apiCall('get', '/api/handwriting/profiles', null, authToken);
      return Date.now() - start;
    });

    // ============ STEP 10: CLEANUP ============
    console.log('\n=== STEP 10: CLEANUP ===');
    testResults.steps.cleanup = {};

    await measureTime('cleanup-delete-assignment', async () => {
      await apiCall('delete', `/api/assignments/${assignmentId}`, null, authToken);
      console.log('Deleted test assignment');
    });
    testResults.steps.cleanup.deleteAssignment = { success: true };

    // Logout
    await measureTime('cleanup-logout', async () => {
      await apiCall('post', '/api/auth/logout', {}, authToken);
    });
    testResults.steps.cleanup.logout = { success: true };

  } catch (error) {
    console.error('Test error:', error.message);
    testResults.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    await takeScreenshot(page, 'error-state');
  } finally {
    await browser.close();

    // Save final report
    const reportPath = path.join(__dirname, 'final-e2e-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log('\n=== TEST COMPLETE ===');
    console.log('Report saved to:', reportPath);
    console.log('Screenshots:', testResults.screenshots.length);
    console.log('Errors:', testResults.errors.length);
  }
}

runTests().catch(console.error);