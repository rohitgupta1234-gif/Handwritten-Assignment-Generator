const sharp = require('./backend/node_modules/sharp');

async function findRuledLines() {
  const { data, info } = await sharp('handwritting6.jpg').grayscale().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Between x = 30 and x = 750, count dark pixels across rows
  const ruledLines = [];
  for (let y = 35; y < 990; y++) {
    // Ruled lines are thin horizontal lines, continuous across x
    let linePixels = 0;
    for (let x = 30; x < 750; x++) {
      // Ruled line is darker than paper (~247) but may not be pitch black (e.g. < 210)
      if (data[y * width + x] < 185) linePixels++;
    }
    if (linePixels > 450) {
      ruledLines.push({ y, linePixels });
    }
  }

  // Filter local maxima
  const cleanLines = [];
  for (let i = 0; i < ruledLines.length; i++) {
    if (cleanLines.length === 0 || ruledLines[i].y - cleanLines[cleanLines.length - 1].y > 15) {
      cleanLines.push(ruledLines[i]);
    } else if (ruledLines[i].linePixels > cleanLines[cleanLines.length - 1].linePixels) {
      cleanLines[cleanLines.length - 1] = ruledLines[i];
    }
  }

  console.log(`Found ${cleanLines.length} ruled lines:`);
  for (let i = 0; i < cleanLines.length; i++) {
    const diff = i > 0 ? `(spacing: ${cleanLines[i].y - cleanLines[i-1].y}px)` : '';
    console.log(` Line ${i + 1}: y=${cleanLines[i].y} ${diff}`);
  }
}

findRuledLines().catch(console.error);
