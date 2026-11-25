const sharp = require('./backend/node_modules/sharp');

async function inspectWordSpacing() {
  const { data, info } = await sharp('handwritting6.jpg').raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Line 2: y0 = 100, y1 = 133
  // Check colDensity across x
  const cols = [];
  for (let x = 30; x < 750; x++) {
    let ink = 0;
    for (let y = 100; y <= 133; y++) {
      const idx = (y * width + x) * channels;
      if ((data[idx] + data[idx+1] + data[idx+2]) / 3 < 155) ink++;
    }
    cols.push({ x, ink });
  }

  // Print segments where ink > 0
  const segments = [];
  let start = -1;
  for (let i = 0; i < cols.length; i++) {
    if (cols[i].ink > 0 && start === -1) {
      start = cols[i].x;
    } else if (cols[i].ink === 0 && start !== -1) {
      segments.push({ start, end: cols[i-1].x, len: cols[i-1].x - start + 1 });
      start = -1;
    }
  }

  console.log(`Line 2 has ${segments.length} raw ink segments:`);
  segments.forEach((s, i) => {
    const gap = i < segments.length - 1 ? segments[i+1].start - s.end - 1 : 0;
    console.log(` Seg ${i+1}: x=${s.start}..${s.end} (w=${s.len}), next gap=${gap}px`);
  });
}

inspectWordSpacing().catch(console.error);
