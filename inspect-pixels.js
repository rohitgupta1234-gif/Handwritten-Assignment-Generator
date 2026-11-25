const sharp = require('./backend/node_modules/sharp');

async function inspectPixels() {
  const image = sharp('handwritting6.jpg');
  const metadata = await image.metadata();
  console.log('Format:', metadata.format, 'Channels:', metadata.channels);

  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  console.log(`Dimensions: ${width}x${height}, channels: ${channels}`);

  // Sample pixels across a vertical strip where there are ruled lines and text
  // Let's sample x = 200, y from 100 to 200
  const samples = [];
  for (let y = 100; y < 150; y++) {
    const idx = (y * width + 200) * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    samples.push({ y, r, g, b, brightness: Math.round((r + g + b) / 3) });
  }

  // Find min brightness (ink), ruled line brightness, and max brightness (paper)
  const brightnesses = samples.map(s => s.brightness);
  console.log('Sample vertical strip brightnesses:');
  console.log('Min (ink):', Math.min(...brightnesses));
  console.log('Max (paper):', Math.max(...brightnesses));

  // Check background color near corners (e.g. x: 50, y: 50)
  const bgIdx = (50 * width + 50) * channels;
  console.log('Paper color near (50, 50):', { r: data[bgIdx], g: data[bgIdx + 1], b: data[bgIdx + 2] });

  // Border detection: check the rectangular border
  // Check horizontal profile near top (y = 20 to 50)
  for (let y = 15; y <= 45; y += 5) {
    let darkCount = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      if ((data[idx] + data[idx+1] + data[idx+2]) / 3 < 100) darkCount++;
    }
    console.log(`Row y=${y}: dark pixels = ${darkCount}`);
  }
}

inspectPixels().catch(console.error);
