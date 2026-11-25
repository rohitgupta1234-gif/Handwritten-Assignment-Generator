/**
 * FINAL RUNNER: GENERATE HANDWRITING_FINAL_V2.pdf
 * End-to-end generation with Gaegu & organic micro-variations
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

process.env.PUPPETEER_CONFIG_PATH = path.resolve('.puppeteerrc.cjs');
process.env.NODE_ENV = 'development';
process.env.PORT = '5003';

function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    socket.setTimeout(500);
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
  console.log('🚀 GENERATING HANDWRITING_FINAL_V2.pdf (AUTHENTIC HANDWRITING ENGINE)');
  console.log('======================================================================');

  const refImagePath = path.resolve('handwritting6.jpg');
  if (!fs.existsSync(refImagePath)) throw new Error('handwritting6.jpg not found');

  // 1. Start Server on port 5003
  console.log('\n--- CHECKING SERVER ON PORT 5003 ---');
  let isRunning = await checkPort(5003);
  if (!isRunning) {
    console.log('Starting backend server on port 5003...');
    const { spawn } = require('child_process');
    spawn('node', ['backend/dist/index.js'], {
      cwd: __dirname,
      env: { ...process.env, PORT: '5003' },
      stdio: 'inherit',
    });

    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (await checkPort(5003)) {
        isRunning = true;
        break;
      }
    }
    if (!isRunning) throw new Error('Server failed to start on port 5003');
  }
  console.log('✅ Server running on http://localhost:5003');

  // 2. Authenticate
  const authRes = await fetch('http://localhost:5003/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@handwriteai.com', password: 'demo123456' }),
  });
  const authData = await authRes.json();
  const authToken = authData.accessToken;
  console.log(`✅ Authenticated as ${authData.user.email}`);

  // 3. Upload Profile
  const fileBytes = fs.readFileSync(refImagePath);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const bodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nHandwriting6-Gaegu-Profile\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="mode"\r\n\r\npersonal\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="penColor"\r\n\r\nblack\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="handwritting6.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    fileBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const uploadRes = await fetch('http://localhost:5003/api/handwriting/profiles', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: bodyBuffer,
  });
  const uploadData = await uploadRes.json();
  const profileId = uploadData.profile.id;
  console.log(`✅ Profile uploaded: ${profileId}`);

  // Analyze characteristics
  await fetch(`http://localhost:5003/api/handwriting/profiles/${profileId}/analyze`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  // Set active
  await fetch(`http://localhost:5003/api/handwriting/profiles/${profileId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: true, penColor: 'black' }),
  });

  // 4. Create Assignment with 5 Questions
  const questions = [
    { id: 'q1', text: 'What is Artificial Intelligence? Explain its major applications in real life.', type: 'detailed' },
    { id: 'q2', text: 'Explain the difference between Stack and Queue with suitable examples.', type: 'detailed' },
    { id: 'q3', text: 'What is a Binary Search Tree? Explain insertion and searching operations.', type: 'detailed' },
    { id: 'q4', text: 'Explain the OSI Model and describe all seven layers.', type: 'detailed' },
    { id: 'q5', text: 'What is Cloud Computing? Explain IaaS, PaaS, and SaaS with examples.', type: 'detailed' },
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

  const createRes = await fetch('http://localhost:5003/api/assignments', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
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

  await fetch(`http://localhost:5003/api/assignments/${assignmentId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  console.log('✅ Answers attached');

  // 5. Trigger handwriting generation job
  const jobRes = await fetch('http://localhost:5003/api/handwriting/generate', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignmentId,
      handwritingProfileId: profileId,
      mode: 'personal',
    }),
  });
  const jobData = await jobRes.json();
  const jobId = jobData.job?.id || jobData.id;
  console.log(`✅ Generation job started: ${jobId}`);

  // Poll
  let pollResult;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(`http://localhost:5003/api/handwriting/generate/${jobId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    pollResult = await pollRes.json();
    const status = pollResult.job?.status || pollResult.status;
    if (status === 'completed') {
      console.log('✅ Generation completed!');
      break;
    }
  }

  // 6. Download PDF
  console.log('\n--- DOWNLOADING PDF ---');
  const pdfRes = await fetch(`http://localhost:5003/api/assignments/${assignmentId}/pdf`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

  const localPdf = path.resolve('HANDWRITING_FINAL_V2.pdf');
  fs.writeFileSync(localPdf, pdfBuffer);
  console.log(`✅ Saved in project directory: ${localPdf} (${pdfBuffer.length} bytes)`);

  // 7. Render high-res previews of pages
  console.log('\n--- RENDERING PAGE PREVIEWS ---');
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const pages = (pollResult.job?.pages && pollResult.job.pages.length > 0) ? pollResult.job.pages : (pollResult.pages || []);
  console.log(`Total Pages: ${pages.length}`);

  const previewDir = path.resolve('v2_pages_preview');
  if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });

  for (let p = 0; p < Math.min(3, pages.length); p++) {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    const content = pages[p].htmlContent || pages[p].content || '';
    await page.setContent(content, { waitUntil: 'networkidle0' });
    const pPath = path.join(previewDir, `final_v2_page_${p + 1}.png`);
    await page.screenshot({ path: pPath, type: 'png' });
    console.log(`Rendered: ${pPath}`);
    await page.close();
  }
  await browser.close();

  console.log('\n======================================================================');
  console.log('🎉 HANDWRITING_FINAL_V2 GENERATION COMPLETE!');
  console.log('======================================================================');
}

main().catch(console.error);
