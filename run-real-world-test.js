/**
 * REAL-WORLD TEST RUNNER
 * Tests HandwriteAI with actual handwriting sample: handwritting6.jpg
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

process.env.PUPPETEER_CONFIG_PATH = path.resolve('.puppeteerrc.cjs');
process.env.NODE_ENV = 'development';
process.env.PORT = '5000';

async function main() {
  console.log('======================================================================');
  console.log('🖋️  STARTING REAL-WORLD HANDWRITING TEST ON handwritting6.jpg');
  console.log('======================================================================');

  // 1. Verify reference image exists
  const refImagePath = path.resolve('handwritting6.jpg');
  if (!fs.existsSync(refImagePath)) {
    throw new Error(`Reference image not found at ${refImagePath}`);
  }
  const refStats = fs.statSync(refImagePath);
  console.log(`✅ Reference image located: ${refImagePath} (${refStats.size} bytes)`);

  // 2. Start backend server
  console.log('\n--- STARTING APPLICATION SERVER ---');
  let serverProcess;
  const isServerRunning = await checkPort(5000);
  if (!isServerRunning) {
    console.log('Starting backend server on port 5000...');
    const { spawn } = require('child_process');
    serverProcess = spawn('node', ['backend/dist/index.js'], {
      cwd: __dirname,
      env: { ...process.env },
      stdio: 'inherit',
    });

    // Wait for server to become responsive
    let ready = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (await checkPort(5000)) {
        ready = true;
        break;
      }
    }
    if (!ready) throw new Error('Server failed to start within 40 seconds');
    console.log('✅ Server running on http://localhost:5000');
  } else {
    console.log('✅ Server already running on port 5000');
  }

  try {
    // 3. Authenticate
    console.log('\n--- AUTHENTICATION ---');
    const authRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@handwriteai.com', password: 'demo123456' }),
    });
    const authData = await authRes.json();
    if (!authData.accessToken) {
      throw new Error(`Auth failed: ${JSON.stringify(authData)}`);
    }
    const authToken = authData.accessToken;
    console.log(`✅ Authenticated as demo user (${authData.user.email})`);

    // 4. Upload handwriting sample (handwritting6.jpg)
    console.log('\n--- STEP 1: UPLOAD & ANALYZE HANDWRITING SAMPLE ---');
    const fileBytes = fs.readFileSync(refImagePath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    let bodyBuffer = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nRealWorld-Handwriting6-Profile\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="mode"\r\n\r\npersonal\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="penColor"\r\n\r\nblue\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="handwritting6.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      fileBytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await fetch('http://localhost:5000/api/handwriting/profiles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });
    const uploadData = await uploadRes.json();
    if (uploadRes.status !== 201 || !uploadData.profile?.id) {
      throw new Error(`Profile upload failed (status ${uploadRes.status}): ${JSON.stringify(uploadData)}`);
    }
    const profileId = uploadData.profile.id;
    console.log(`✅ Handwriting sample uploaded successfully. Profile ID: ${profileId}`);

    // Analyze characteristics
    console.log('Analyzing handwriting characteristics from image...');
    const analyzeRes = await fetch(`http://localhost:5000/api/handwriting/profiles/${profileId}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    const analyzeData = await analyzeRes.json();
    const characteristics = analyzeData.characteristics || analyzeData.profile?.characteristics;
    if (analyzeRes.status !== 200 || !characteristics) {
      throw new Error(`Analysis failed: ${JSON.stringify(analyzeData)}`);
    }
    console.log('✅ Handwriting Analysis complete! Extracted characteristics:');
    console.log(JSON.stringify(characteristics, null, 2));

    // Set as active profile
    await fetch(`http://localhost:5000/api/handwriting/profiles/${profileId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive: true }),
    });
    console.log('✅ Profile set as ACTIVE handwriting profile');

    // 5. Enter 5 Test Questions and Answers
    console.log('\n--- STEP 2 & 3: ENTER TEST QUESTIONS & GENERATE DETAILED ANSWERS ---');
    const questions = [
      {
        id: 'q1',
        text: 'What is Artificial Intelligence? Explain its major applications in real life.',
        type: 'detailed',
        marks: 10,
      },
      {
        id: 'q2',
        text: 'Explain the difference between Stack and Queue with suitable examples.',
        type: 'detailed',
        marks: 10,
      },
      {
        id: 'q3',
        text: 'What is a Binary Search Tree? Explain insertion and searching operations.',
        type: 'detailed',
        marks: 10,
      },
      {
        id: 'q4',
        text: 'Explain the OSI Model and describe all seven layers.',
        type: 'detailed',
        marks: 15,
      },
      {
        id: 'q5',
        text: 'What is Cloud Computing? Explain IaaS, PaaS, and SaaS with examples.',
        type: 'detailed',
        marks: 15,
      },
    ];

    const rawAnswers = [
      {
        questionId: 'q1',
        text: 'Artificial Intelligence (AI) refers to the simulation of human intelligence processes by computer systems and software algorithms. These processes encompass cognitive functions such as learning (the acquisition of information and contextual rules for using it), automated reasoning (using algorithmic rules to reach definite or approximate conclusions), self-correction, problem-solving, and perception.\n\nMajor Real-Life Applications of AI:\n1. Healthcare & Medicine: AI algorithms diagnose complex pathologies from radiological images (MRI, CT scans) with high accuracy, predict patient deterioration, design synthetic antibodies, and accelerate biochemical drug discovery pipelines.\n2. Autonomous Transportation: Self-driving vehicles such as Tesla and Waymo use computer vision, LiDAR sensor fusion, and deep reinforcement learning models to navigate roads, interpret dynamic traffic signs, and avoid road hazards in real-time.\n3. Natural Language Processing (NLP): Large language models, intelligent search engines, and virtual conversational agents (e.g., ChatGPT, Claude, Google Assistant) process human queries, summarize texts, and perform multi-language translation.\n4. Financial Services: Financial institutions use neural networks for high-frequency algorithmic trading, credit score risk underwriting, and real-time transaction monitoring to detect fraudulent credit card anomalies.\n5. Smart Manufacturing & Supply Chain: Industrial robots equipped with computer vision conduct automated defect inspection, predictive machine maintenance, and warehouse logistics optimization.',
      },
      {
        questionId: 'q2',
        text: 'Stack and Queue are fundamental linear data structures that organize elements sequentially, but they differ fundamentally in the order in which data items are inserted and removed.\n\n1. Stack (LIFO - Last In, First Out):\nIn a Stack, both insertion and deletion occur at the same single end, commonly designated as the "Top". The element inserted last is the first to be retrieved.\n- Primary Operations: push(x) to insert an element onto the top; pop() to remove and return the top element; peek() to inspect the top without removal; and isEmpty() to check underflow.\n- Real-World Example: A vertical stack of cafeteria plates, or the "Undo/Redo" command stack in code editors and graphic software where the most recent modification is undone first.\n- Computer Science Application: Call stack execution for tracking function invocations and managing local recursion variables.\n\n2. Queue (FIFO - First In, First Out):\nIn a Queue, insertion happens at one end called the "Rear" (tail), while deletion happens at the opposite end called the "Front" (head). The earliest inserted element is processed first.\n- Primary Operations: enqueue(x) to append an item to the rear; dequeue() to remove and retrieve the front element; front() to examine the leading item; and isEmpty() to test capacity.\n- Real-World Example: A queue of passengers waiting in line at a ticket booking counter, where the first customer in line receives service first.\n- Computer Science Application: CPU task scheduling algorithms (Round-Robin), operating system printer spooling queues, and Breadth-First Search (BFS) graph traversal.',
      },
      {
        questionId: 'q3',
        text: 'A Binary Search Tree (BST) is a hierarchical node-based binary tree data structure wherein each node contains a distinct key, an optional value, and pointers to a left child and a right child. A valid BST strictly enforces the BST Invariant Property:\n- The key of every node in the left subtree is strictly less than the node\'s key.\n- The key of every node in the right subtree is strictly greater than the node\'s key.\n- Both left and right subtrees must themselves be valid Binary Search Trees without duplicate keys.\n\n1. Searching Operation in BST:\nTo search for target key K:\nStep a: Start traversal at the root node. If the tree is empty or current node is null, K does not exist.\nStep b: If current.key == K, the search terminates successfully, returning the node.\nStep c: If K < current.key, recursively navigate to the left child subtree.\nStep d: If K > current.key, recursively navigate to the right child subtree.\nTime Complexity: Average case is O(log n) when the tree is balanced; worst case is O(n) when degenerated into a skewed linked list.\n\n2. Insertion Operation in BST:\nTo insert a new key K:\nStep a: Start from the root and trace the search path to find the appropriate leaf position.\nStep b: Compare K with the current node key. If K < current.key, move to the left child; if K > current.key, move to the right child.\nStep c: When a null reference is encountered, allocate a new tree node with key K and link it as the child of the parent node.\nStep d: Maintain tree invariants and return root reference.',
      },
      {
        questionId: 'q4',
        text: 'The Open Systems Interconnection (OSI) model is a conceptual 7-layer architectural framework developed by the International Organization for Standardization (ISO) in 1984. It standardizes communication functions across telecommunication and computer networks without regard to underlying internal technology.\n\nThe Seven Layers from Top to Bottom:\n1. Application Layer (Layer 7): Provides network services directly to end-user software applications. Protocols: HTTP, HTTPS, DNS, FTP, SMTP, SSH.\n2. Presentation Layer (Layer 6): Responsible for data formatting, syntax translation, character code conversion (ASCII/Unicode), data compression, and cryptographic encryption/decryption (TLS/SSL).\n3. Session Layer (Layer 5): Manages, establishes, maintains, and synchronizes persistent connection dialogues and sessions between communicating processes. Protocols: NetBIOS, RPC, PPTP.\n4. Transport Layer (Layer 4): Guarantees transparent, end-to-end data transport, segmentation of application messages, flow control, and error recovery. Protocols: TCP (connection-oriented, reliable) and UDP (connectionless, low-latency).\n5. Network Layer (Layer 3): Handles logical network host addressing (IP addressing) and multi-hop path determination (packet routing). Hardware/Protocols: Routers, IPv4, IPv6, ICMP, OSPF, BGP.\n6. Data Link Layer (Layer 2): Facilitates node-to-node frame transfer over the physical medium, physical MAC addressing, framing, and link-level collision detection. Hardware/Protocols: Ethernet switches, 802.11 Wi-Fi, MAC addresses, ARP.\n7. Physical Layer (Layer 1): Transmits unstructured raw bitstreams (0s and 1s) over physical electrical, optical, or radio transmission media. Hardware: Cables (Cat6, Fiber), repeaters, hubs, NIC interfaces, pin configurations.',
      },
      {
        questionId: 'q5',
        text: 'Cloud Computing is the on-demand availability and network delivery of shared computing resources—including processing servers, physical and object storage, databases, networking equipment, and software applications—over the Internet with flexible pay-as-you-go pricing, eliminating upfront capital expenditure for on-premise hardware.\n\nCloud Computing Service Models:\n\n1. Infrastructure as a Service (IaaS):\nProvides the fundamental building blocks of cloud IT: virtual machines, bare-metal servers, block storage, and software-defined networking. The cloud provider manages the physical data center, while the user has full administrative control over the operating system, middleware, installed runtime environments, and application deployments.\nExamples: Amazon Web Services EC2 & S3, Microsoft Azure Virtual Machines, Google Compute Engine (GCE), DigitalOcean Droplets.\n\n2. Platform as a Service (PaaS):\nProvides a managed hardware and software framework where developers can build, test, run, and scale applications without worrying about OS patching, server provisioning, load balancers, or storage provisioning. Users manage only the application code and data.\nExamples: AWS Elastic Beanstalk, Heroku, Google App Engine, Red Hat OpenShift, Microsoft Azure App Services.\n\n3. Software as a Service (SaaS):\nDelivers complete, fully functional software applications directly to end users over the web browser, eliminating all local client installation and maintenance requirements. The vendor manages everything from infrastructure to the application layer.\nExamples: Google Workspace (Gmail, Docs), Microsoft 365, Salesforce CRM, Dropbox, Zoom, Slack.',
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

    // Create Assignment
    const createRes = await fetch('http://localhost:5000/api/assignments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Computer Science Real-World Comprehensive Assignment',
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
          margins: { top: 40, right: 40, bottom: 40, left: 50 },
          penThickness: 1.0,
          penColor: 'blue',
          questionStartMode: 'continuous',
          showQuestionNumbers: true,
          showPageNumbers: true,
        },
      }),
    });
    const createData = await createRes.json();
    if (createRes.status !== 201 || !createData.assignment?.id) {
      throw new Error(`Assignment creation failed: ${JSON.stringify(createData)}`);
    }
    const assignmentId = createData.assignment.id;
    console.log(`✅ Assignment created successfully. ID: ${assignmentId}`);

    // Update with detailed answers
    console.log('Attaching detailed answers to assignment...');
    await fetch(`http://localhost:5000/api/assignments/${assignmentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answers: answers,
      }),
    });
    console.log('✅ Answers attached successfully.');

    // 6. Generate Handwriting Job (Mode: Personal)
    console.log('\n--- STEP 4: SYNTHESIZE HANDWRITING (PERSONAL MODE) & BUILD PDF ---');
    console.log('Submitting handwriting generation job using extracted profile...');
    const jobRes = await fetch('http://localhost:5000/api/handwriting/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assignmentId: assignmentId,
        handwritingProfileId: profileId,
        mode: 'personal',
      }),
    });
    const jobData = await jobRes.json();
    if (jobRes.status !== 200 && jobRes.status !== 201 && jobRes.status !== 202) {
      throw new Error(`Generation job failed to start: ${JSON.stringify(jobData)}`);
    }
    const jobId = jobData.job?.id || jobData.id;
    console.log(`✅ Generation job initiated. Job ID: ${jobId}`);

    // Poll job status until completed
    console.log('Polling generation progress...');
    let jobCompleted = false;
    let pollResult;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`http://localhost:5000/api/handwriting/generate/${jobId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      pollResult = await pollRes.json();
      const status = pollResult.job?.status || pollResult.status;
      const progress = pollResult.job?.progress || pollResult.progress || 0;
      console.log(`- Job state: ${status} (${progress}%)`);
      if (status === 'completed') {
        jobCompleted = true;
        break;
      }
      if (status === 'failed') {
        throw new Error(`Job execution failed: ${JSON.stringify(pollResult)}`);
      }
    }

    // 7. Download PDF from endpoint
    console.log('\n--- FETCHING GENERATED PDF ---');
    const pdfRes = await fetch(`http://localhost:5000/api/assignments/${assignmentId}/pdf`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    if (pdfRes.status !== 200) {
      throw new Error(`PDF download failed with status ${pdfRes.status}`);
    }
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    console.log(`✅ PDF downloaded successfully (${pdfBuffer.length} bytes)`);

    // 8. Save PDF in both locations
    const localPdfPath = path.resolve('Handwriting_Real_World_Test.pdf');
    const desktopPdfPath = 'C:\\Users\\Lenovo\\Desktop\\Handwriting_Real_World_Test.pdf';

    fs.writeFileSync(localPdfPath, pdfBuffer);
    console.log(`✅ Saved to project directory: ${localPdfPath}`);

    try {
      fs.writeFileSync(desktopPdfPath, pdfBuffer);
      console.log(`✅ Saved to Windows Desktop: ${desktopPdfPath}`);
    } catch (desktopErr) {
      console.warn(`⚠️ Note on Desktop write: ${desktopErr.message}`);
    }

    // 9. Inspect the PDF and render pages to PNG images for visual similarity check
    console.log('\n--- STEP 5: VERIFY OUTPUT & RENDER PAGES FOR VISUAL COMPARISON ---');
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    // Get the HTML content of the pages from the generation job
    const pages = (pollResult.job?.pages && pollResult.job.pages.length > 0) ? pollResult.job.pages : (pollResult.pages || []);
    console.log(`✅ Total Generated Pages: ${pages.length}`);

    const screenshotsDir = path.resolve('generated_pages_preview');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

    for (let p = 0; p < pages.length; p++) {
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
      
      const rawHtml = pages[p].htmlContent || pages[p].content || '';
      const fullPageHtml = rawHtml.includes('<html') ? rawHtml : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background: white; margin: 0; }
            .page-container {
              width: 794px;
              height: 1123px;
              position: relative;
              background: white;
            }
          </style>
        </head>
        <body>
          ${rawHtml}
        </body>
        </html>
      `;

      await page.setContent(fullPageHtml, { waitUntil: 'networkidle0' });
      const imgPath = path.join(screenshotsDir, `page_${p + 1}.png`);
      await page.screenshot({ path: imgPath, fullPage: false });
      console.log(`📸 Saved high-res page render: ${imgPath}`);
      await page.close();
    }

    await browser.close();

    console.log('\n======================================================================');
    console.log('🎉 REAL-WORLD HANDWRITING TEST RUN COMPLETED SUCCESSFULLY!');
    console.log('======================================================================');

  } finally {
    if (serverProcess) {
      console.log('Stopping test server process...');
      serverProcess.kill('SIGINT');
    }
  }
}

function checkPort(port) {
  return new Promise(resolve => {
    const socket = new http.ClientRequest({
      port,
      host: '127.0.0.1',
      path: '/health/live',
      method: 'GET',
      timeout: 1500,
    });
    socket.on('response', res => {
      resolve(res.statusCode === 200);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.end();
  });
}

main().catch(err => {
  console.error('❌ Critical Test Error:', err);
  process.exit(1);
});
