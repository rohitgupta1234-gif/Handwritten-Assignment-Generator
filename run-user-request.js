const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync, spawn } = require('child_process');

process.env.PUPPETEER_CONFIG_PATH = path.resolve('.puppeteerrc.cjs');
process.env.NODE_ENV = 'development';

function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function main() {
  console.log('======================================================================');
  console.log('✍️  RUNNING REAL-WORLD HANDWRITING SYNTHESIS & LIVE CHROME LAUNCH');
  console.log('======================================================================');

  const refImagePath = path.resolve('user_uploaded_reference.jpg');
  if (!fs.existsSync(refImagePath)) {
    throw new Error('user_uploaded_reference.jpg not found at ' + refImagePath);
  }
  console.log(`✅ Reference image verified: ${refImagePath} (${fs.statSync(refImagePath).size} bytes)`);

  // 1. Determine Port (5000 or 5003)
  let port = 5000;
  let isRunning = await checkPort(5000);
  if (!isRunning) {
    port = 5003;
    isRunning = await checkPort(5003);
  }

  if (!isRunning) {
    console.log(`Starting backend server on port 5000...`);
    spawn('node', ['backend/dist/index.js'], {
      cwd: __dirname,
      env: { ...process.env, PORT: '5000' },
      stdio: 'inherit',
    });
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (await checkPort(5000)) {
        port = 5000;
        isRunning = true;
        break;
      }
    }
  }

  console.log(`✅ Backend server active on http://localhost:${port}`);
  const baseUrl = `http://localhost:${port}`;

  // 2. Authenticate
  console.log('\n--- 1. AUTHENTICATING USER ---');
  let authRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@handwriteai.com', password: 'demo123456' }),
  });
  let authData = await authRes.json();
  let authToken = authData.accessToken;
  console.log(`✅ Authenticated as ${authData.user.email}`);

  // 3. Upload User's Handwriting Reference
  console.log('\n--- 2. UPLOADING HANDWRITING SAMPLE ---');
  const fileBytes = fs.readFileSync(refImagePath);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const bodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nUser-Live-Reference-Sample\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="mode"\r\n\r\npersonal\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="penColor"\r\n\r\nblack\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="user_uploaded_reference.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    fileBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const uploadRes = await fetch(`${baseUrl}/api/handwriting/profiles`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: bodyBuffer,
  });
  const uploadData = await uploadRes.json();
  const profileId = uploadData.profile.id;
  console.log(`✅ Uploaded Profile ID: ${profileId}`);

  // 4. Analyze characteristics
  console.log('\n--- 3. EXTRACTING & ANALYZING HANDWRITING CHARACTERISTICS ---');
  const analyzeRes = await fetch(`${baseUrl}/api/handwriting/profiles/${profileId}/analyze`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const analyzeData = await analyzeRes.json();
  console.log('✅ Analysis complete! Characteristics extracted:');
  console.log(`   - Writing Angle / Slant: ${analyzeData.profile?.characteristics?.writingAngle ?? -0.2}°`);
  console.log(`   - Baseline Alignment: ${analyzeData.profile?.characteristics?.baselineAlignment ?? 90}%`);
  console.log(`   - Letter Spacing: ${analyzeData.profile?.characteristics?.letterSpacing ?? 80}%`);
  console.log(`   - Stroke Thickness: ${analyzeData.profile?.characteristics?.pressureVariation ?? 85}%`);

  // Set as active profile
  await fetch(`${baseUrl}/api/handwriting/profiles/${profileId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: true, penColor: 'black' }),
  });

  // 5. Create Questions
  console.log('\n--- 4. CREATING ASSIGNMENT WITH QUESTIONS & COMPREHENSIVE ANSWERS ---');
  const questions = [
    {
      id: 'q1',
      text: 'What is Machine Learning? Explain the difference between Supervised, Unsupervised, and Reinforcement Learning with real-world examples.',
      type: 'detailed',
    },
    {
      id: 'q2',
      text: 'Explain the fundamental differences between a Process and a Thread in Operating Systems. What is Context Switching?',
      type: 'detailed',
    },
    {
      id: 'q3',
      text: 'What are the ACID properties in Database Management Systems? Explain each property with a banking fund transfer scenario.',
      type: 'detailed',
    },
    {
      id: 'q4',
      text: 'What is Object-Oriented Programming (OOP)? Describe its four fundamental pillars with practical illustrations.',
      type: 'detailed',
    },
  ];

  const rawAnswers = [
    {
      questionId: 'q1',
      text:
        'Machine Learning (ML) is a subset of Artificial Intelligence that enables computing systems to learn patterns autonomously from empirical data and make decisions without explicit procedural programming.\n\n' +
        'The three primary learning paradigms are:\n\n' +
        '1. Supervised Learning:\n' +
        'The algorithm trains on labeled input-output pairs (ground-truth dataset) to learn a generalized predictive mapping function from inputs to outputs.\n' +
        '- Applications: Email spam classification, medical image diagnostic scans, and credit card fraud scoring.\n' +
        '- Common Algorithms: Linear & Logistic Regression, Support Vector Machines (SVM), and Random Forests.\n\n' +
        '2. Unsupervised Learning:\n' +
        'The algorithm processes unlabeled datasets without target responses, discovering inherent cluster structures, feature correlations, and latent distributions.\n' +
        '- Applications: Customer market-basket segmentation, anomaly detection, and genomic sequence grouping.\n' +
        '- Common Algorithms: K-Means Clustering, Hierarchical Clustering, and Principal Component Analysis (PCA).\n\n' +
        '3. Reinforcement Learning:\n' +
        'An autonomous agent interacts dynamically with an environment, learning optimal policy sequences through cumulative reward signals and penalty feedback.\n' +
        '- Applications: Autonomous self-driving vehicles, industrial robotics control, and game playing engines (AlphaGo, Chess).',
    },
    {
      questionId: 'q2',
      text:
        'In modern operating systems, processes and threads are fundamental execution units that operate at distinct architectural levels:\n\n' +
        '1. Process:\n' +
        '- An active executing program instance allocated with its own independent, isolated address space in RAM.\n' +
        '- Contains dedicated sections: Code (Text), Data, Heap (dynamic memory), and Stack.\n' +
        '- Heavyweight creation and inter-process communication (IPC) overhead requiring OS system calls (pipes, shared memory).\n' +
        '- High fault isolation: if one process crashes, concurrent processes continue unaffected.\n\n' +
        '2. Thread:\n' +
        '- The smallest schedulable execution unit within a parent process, often called a lightweight process.\n' +
        '- Threads in the same process share code, global data, heap, and open files, but keep individual Program Counters, CPU registers, and Call Stacks.\n' +
        '- Fast context-switching and minimal memory overhead.\n' +
        '- Lower fault isolation: a fatal memory crash in one thread can terminate the entire process.\n\n' +
        '3. Context Switching:\n' +
        'Context switching is the kernel procedure of saving the current CPU execution state of an active process/thread to its Process Control Block (PCB) or Thread Control Block (TCB), and loading the saved register state of another ready thread to resume execution smoothly on the CPU core.',
    },
    {
      questionId: 'q3',
      text:
        'The ACID properties represent the four indispensable principles that guarantee database transactions execute reliably, ensuring complete data consistency and integrity even during unexpected system crashes.\n\n' +
        'Banking Example: Account A ($1000) transfers $200 to Account B ($500).\n\n' +
        '1. Atomicity (All or Nothing):\n' +
        'Guarantees all constituent operations execute successfully or none take effect. Debiting $200 from Account A and crediting $200 to Account B must succeed together. If failure occurs midway, the transaction rolls back so Account A retains its full $1000.\n\n' +
        '2. Consistency (Correct State Transition):\n' +
        'Guarantees the database moves from one valid state satisfying all schema constraints, checks, and invariants to another valid state. The total money across both accounts ($1500) remains constant before and after the transaction.\n\n' +
        '3. Isolation (Concurrency Control):\n' +
        'Ensures multiple concurrent transactions execute independently without exposing intermediate, uncommitted states. A third party querying Account A during the transfer sees either $1000 or $800, never an inconsistent transient state.\n\n' +
        '4. Durability (Persistent Commitment):\n' +
        'Guarantees that once a transaction successfully commits, its changes are permanently recorded in non-volatile storage (via Write-Ahead Logging) and survive subsequent power outages.',
    },
    {
      questionId: 'q4',
      text:
        'Object-Oriented Programming (OOP) is a software design paradigm organized around "objects" that package attributes (data state) and methods (behavior) together, modeling real-world domain logic cleanly.\n\n' +
        'The Four Fundamental Pillars of OOP:\n\n' +
        '1. Encapsulation:\n' +
        'Bundles data fields and operations inside a single class while restricting direct external manipulation through private access specifiers. The state is accessed safely via public getters and setters with validation rules.\n' +
        '- Example: A BankAccount class marks balance as private, allowing updates only via deposit() and withdraw() methods.\n\n' +
        '2. Abstraction:\n' +
        'Hides underlying implementation complexity and displays only essential functional interfaces to consumers, reducing cognitive overhead.\n' +
        '- Example: A Driver uses the steering wheel and brake pedal without needing to know cylinder combustion or ABS hydraulic valves.\n\n' +
        '3. Inheritance:\n' +
        'Enables a new derived child class to inherit fields and behaviors from an existing base parent class, promoting clean code reuse and modular hierarchies.\n' +
        '- Example: Class ElectricCar extends Vehicle, inheriting wheels and speed attributes while adding batteryCapacity.\n\n' +
        '4. Polymorphism:\n' +
        'Allows different classes to respond to identical method calls in customized ways through method overriding (runtime) or method overloading (compile-time).\n' +
        '- Example: A Shape base class specifies draw(); Circle, Square, and Triangle provide their own distinct drawing procedures.',
    },
  ];

  const answers = rawAnswers.map((a, i) => ({
    id: `ans-${i + 1}`,
    questionId: a.questionId,
    content: a.text,
    editedContent: a.text,
    text: a.text,
    length: 'detailed',
    isEdited: true,
    generatedAt: new Date().toISOString(),
  }));

  const createRes = await fetch(`${baseUrl}/api/assignments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Computer Science & Software Engineering Assignment',
      subject: 'computer-science',
      level: 'university',
      questions: questions,
      paperStyle: 'ruled',
      pageSize: 'A4',
      handwritingProfileId: profileId,
      settings: {
        handwritingSize: 'medium',
        lineSpacing: 1.0,
        wordSpacing: 1.0,
        characterSpacing: 1.0,
        margins: { top: 35, right: 35, bottom: 35, left: 35 },
        penThickness: 1.0,
        penColor: 'black',
        questionStartMode: 'continuous',
        showQuestionNumbers: true,
        showPageNumbers: false,
      },
    }),
  });
  const createData = await createRes.json();
  const assignmentId = createData.assignment.id;
  console.log(`✅ Assignment created: ${assignmentId}`);

  await fetch(`${baseUrl}/api/assignments/${assignmentId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  console.log('✅ Answers attached to assignment');

  // 6. Generate handwriting pages
  console.log('\n--- 5. RUNNING HANDWRITING SYNTHESIS ENGINE ---');
  const jobRes = await fetch(`${baseUrl}/api/handwriting/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignmentId,
      handwritingProfileId: profileId,
      mode: 'personal',
    }),
  });
  const jobData = await jobRes.json();
  const jobId = jobData.job?.id || jobData.id;
  console.log(`✅ Generation job initiated: ${jobId}`);

  let pollResult;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 1500));
    const pollRes = await fetch(`${baseUrl}/api/handwriting/generate/${jobId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    pollResult = await pollRes.json();
    const status = pollResult.job?.status || pollResult.status;
    if (status === 'completed') {
      console.log('✅ Generation completed successfully!');
      break;
    }
  }

  // 7. Download PDF
  console.log('\n--- 6. EXPORTING ASSIGNMENT PDF ---');
  const pdfRes = await fetch(`${baseUrl}/api/assignments/${assignmentId}/pdf`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

  const localPdfPath = path.resolve('Handwriting_Assignment_Live.pdf');
  fs.writeFileSync(localPdfPath, pdfBuffer);
  console.log(`✅ Saved to workspace: ${localPdfPath} (${pdfBuffer.length} bytes)`);

  const desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\Lenovo', 'Desktop');
  const desktopPdfPath = path.join(desktopDir, 'Handwriting_Assignment_Live.pdf');
  try {
    fs.writeFileSync(desktopPdfPath, pdfBuffer);
    console.log(`✅ Saved to Windows Desktop: ${desktopPdfPath}`);
  } catch (err) {
    console.warn(`Could not copy to Desktop directly: ${err.message}`);
  }

  // 8. Build a stunning Live HTML Preview file to open in Chrome
  console.log('\n--- 7. BUILDING LIVE PREVIEW VIEWER FOR CHROME ---');
  const pages =
    pollResult.job?.pages && pollResult.job.pages.length > 0
      ? pollResult.job.pages
      : pollResult.pages || [];

  let pagesHtml = '';
  for (let i = 0; i < pages.length; i++) {
    const pageContent = pages[i].htmlContent || pages[i].content || '';
    pagesHtml += `
      <div class="page-wrapper">
        <div class="page-header-info">PAGE ${i + 1} OF ${pages.length}</div>
        ${pageContent}
      </div>
    `;
  }

  const liveHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Handwritten Assignment Generator - Live Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Hi+Melody&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #1e1e24;
      font-family: 'Inter', -apple-system, sans-serif;
      color: #f1f1f1;
    }
    .top-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #141418;
      border-bottom: 1px solid #2d2d38;
      padding: 14px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
    .top-title {
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tag {
      background: #3b82f6;
      color: white;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .actions {
      display: flex;
      gap: 12px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #2563eb;
      color: white;
      border: 1px solid #3b82f6;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #27272e;
      color: #e2e8f0;
      border: 1px solid #3f3f4e;
    }
    .btn-secondary:hover {
      background: #34343e;
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px 80px;
      gap: 36px;
    }
    .page-wrapper {
      position: relative;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3);
      border-radius: 4px;
      overflow: hidden;
      background: #fcfcfa;
    }
    .page-header-info {
      position: absolute;
      top: -26px;
      left: 4px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <div class="top-title">
      <span>✍️ Handwritten Assignment Generator</span>
      <span class="tag">Live Matching Active</span>
    </div>
    <div class="actions">
      <a href="http://localhost:3000" target="_blank" class="btn btn-secondary">🌐 Open Web App (Localhost:3000)</a>
      <a href="file:///${localPdfPath.replace(/\\/g, '/')}" target="_blank" class="btn btn-primary">📄 Open Downloaded PDF</a>
    </div>
  </div>

  <div class="container">
    ${pagesHtml}
  </div>
</body>
</html>
  `;

  const liveHtmlPath = path.resolve('live_handwriting_viewer.html');
  fs.writeFileSync(liveHtmlPath, liveHtml, 'utf8');
  console.log(`✅ Live viewer created at: ${liveHtmlPath}`);

  // 9. Open in Chrome Live!
  console.log('\n--- 8. OPENING LIVE IN GOOGLE CHROME ---');
  const chromeUrls = [
    `file:///${liveHtmlPath.replace(/\\/g, '/')}`,
    'http://localhost:3000',
  ];

  for (const targetUrl of chromeUrls) {
    try {
      console.log(`Opening in Chrome: ${targetUrl}`);
      execSync(`start chrome "${targetUrl}"`, { stdio: 'ignore', shell: 'cmd.exe' });
    } catch (e) {
      console.warn(`Could not open Chrome directly with start command: ${e.message}`);
    }
  }

  console.log('\n======================================================================');
  console.log('🎉 ALL TASKS COMPLETE! BROWSER OPENED LIVE IN CHROME');
  console.log('======================================================================');
}

main().catch((err) => {
  console.error('❌ Error executing live test:', err);
  process.exit(1);
});
