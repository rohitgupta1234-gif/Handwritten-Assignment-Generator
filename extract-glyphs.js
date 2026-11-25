const sharp = require('./backend/node_modules/sharp');
const fs = require('fs');
const path = require('path');

// 25 lines of handwritting6.jpg with their baseline Y position
const TRANSCRIPT = [
  { text: "Wedding", yLine: 95 },
  { text: "When James was in high school he had the", yLine: 130 },
  { text: "likes for a girl, named Savannah. He loved her", yLine: 165 },
  { text: "enough to stare at her in social study class", yLine: 200 },
  { text: "because he sat behind her, years later he went", yLine: 235 },
  { text: "to her house to ask her if she wanted to", yLine: 269 },
  { text: "marry him and she said yes and he go happy", yLine: 304 },
  { text: "and got children, and she died last month.", yLine: 339 },
  { text: "Career", yLine: 409 },
  { text: "Lebron's career is to be a basketball player.", yLine: 443 },
  { text: "And today he is in the NBA and with the maimi", yLine: 478 },
  { text: "heat. And he is a great player, but he might get", yLine: 513 },
  { text: "transfered to the Lakers in 2014, with Carmello", yLine: 548 },
  { text: "Anthony and kobe Bryant. And he used to play", yLine: 582 },
  { text: "football for st-vincent - st-mary high. Futher more", yLine: 617 },
  { text: "he was a great football player.", yLine: 652 },
  { text: "Team", yLine: 722 },
  { text: "Maimi heat is a professinal basketball team", yLine: 757 },
  { text: "based on Maimi, Florida, United state. The team is a", yLine: 792 },
  { text: "member of the southeast Divison in the Eastern", yLine: 827 },
  { text: "of the NBA. And were they play there home games is", yLine: 862 },
  { text: "American Airlines Areana in Downtown Maimi. And formed", yLine: 897 },
  { text: "in 1988 as one of the NBA four expansion franishes.", yLine: 932 },
  { text: "Therefore maimi is the best team in", yLine: 967 },
  { text: "the world to me.", yLine: 1002 },
];

// Approximate relative character widths for proportional segmentation
const CHAR_WEIGHTS = {
  'i': 0.4, 'l': 0.4, 'j': 0.4, 't': 0.6, 'f': 0.6, 'r': 0.6,
  'm': 1.4, 'w': 1.4, 'M': 1.5, 'W': 1.5,
  'A': 1.1, 'B': 1.1, 'C': 1.1, 'D': 1.1, 'E': 1.0, 'F': 1.0,
  'G': 1.1, 'H': 1.2, 'N': 1.2, 'O': 1.2, 'Q': 1.2, 'R': 1.1,
  'S': 1.0, 'T': 1.1, 'U': 1.1, 'V': 1.1, 'X': 1.1, 'Y': 1.1,
  'a': 0.85, 'b': 0.9, 'c': 0.8, 'd': 0.9, 'e': 0.85, 'g': 0.9,
  'h': 0.9, 'k': 0.9, 'n': 0.9, 'o': 0.85, 'p': 0.9, 'q': 0.9,
  's': 0.8, 'u': 0.9, 'v': 0.85, 'x': 0.85, 'y': 0.9, 'z': 0.8,
  '.': 0.4, ',': 0.4, '\'': 0.4, '-': 0.6, ':': 0.4,
  '0': 0.9, '1': 0.6, '2': 0.9, '3': 0.9, '4': 0.9, '5': 0.9,
  '6': 0.9, '7': 0.9, '8': 0.9, '9': 0.9
};

async function buildGlyphLibrary() {
  const img = sharp('handwritting6.jpg');
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const glyphMap = {}; // char -> array of { dataUri, width, height, yOffset }

  for (let l = 0; l < TRANSCRIPT.length; l++) {
    const item = TRANSCRIPT[l];
    const words = item.text.split(' ');
    const numWords = words.length;
    const yLine = item.yLine;
    const yTop = Math.max(0, yLine - 28);
    const yBottom = Math.min(height - 1, yLine + 7);

    // Profile of column inks
    const cols = new Array(width).fill(0);
    for (let x = 25; x < 755; x++) {
      let ink = 0;
      for (let y = yTop; y <= yLine - 2; y++) {
        const idx = (y * width + x) * channels;
        if ((data[idx] + data[idx+1] + data[idx+2]) / 3 < 165) ink++;
      }
      cols[x] = ink;
    }

    let firstInk = 25;
    while (firstInk < 755 && cols[firstInk] <= 1) firstInk++;
    let lastInk = 754;
    while (lastInk > 25 && cols[lastInk] <= 1) lastInk--;
    if (firstInk >= lastInk) continue;

    // Runs
    const runs = [];
    let runStart = -1;
    for (let x = 25; x < 755; x++) {
      if (cols[x] <= 1 && runStart === -1) {
        runStart = x;
      } else if (cols[x] > 1 && runStart !== -1) {
        runs.push({ x0: runStart, x1: x - 1, len: x - runStart });
        runStart = -1;
      }
    }

    const internalRuns = runs.filter(r => r.x0 > firstInk + 5 && r.x1 < lastInk - 5);
    internalRuns.sort((a, b) => b.len - a.len);
    const selectedGaps = internalRuns.slice(0, numWords - 1);
    selectedGaps.sort((a, b) => a.x0 - b.x0);

    const wordBlocks = [];
    let curX0 = firstInk;
    for (let g = 0; g < selectedGaps.length; g++) {
      wordBlocks.push({ x0: curX0, x1: selectedGaps[g].x0 - 1 });
      curX0 = selectedGaps[g].x1 + 1;
    }
    wordBlocks.push({ x0: curX0, x1: lastInk });

    // For each word block, segment characters proportionally
    for (let w = 0; w < words.length; w++) {
      const wordStr = words[w];
      const block = wordBlocks[w];
      if (!block) continue;
      const totalW = block.x1 - block.x0 + 1;
      if (totalW <= 4) continue;

      let totalWeight = 0;
      for (const ch of wordStr) {
        totalWeight += (CHAR_WEIGHTS[ch] || 0.9);
      }

      let currX = block.x0;
      for (let c = 0; c < wordStr.length; c++) {
        const ch = wordStr[c];
        const weight = (CHAR_WEIGHTS[ch] || 0.9);
        const charW = Math.max(4, Math.round((weight / totalWeight) * totalW));
        const charX0 = Math.max(0, currX);
        const charX1 = Math.min(width - 1, currX + charW - 1);
        currX += charW;

        // Crop bounding box around char
        const cropW = charX1 - charX0 + 1;
        const cropH = yBottom - yTop + 1;
        if (cropW <= 0 || cropH <= 0) continue;

        // Clean pixels: make paper background transparent, keep ink black
        // Extract raw buffer of this patch
        const charPatch = await sharp('handwritting6.jpg')
          .extract({ left: charX0, top: yTop, width: cropW, height: cropH })
          .raw()
          .toBuffer({ resolveWithObject: true });

        const patchData = charPatch.data;
        const rgbaBuf = Buffer.alloc(cropW * cropH * 4);

        for (let py = 0; py < cropH; py++) {
          for (let px = 0; px < cropW; px++) {
            const sIdx = (py * cropW + px) * charPatch.info.channels;
            const dIdx = (py * cropW + px) * 4;
            const r = patchData[sIdx];
            const g = patchData[sIdx+1];
            const b = patchData[sIdx+2];
            const gray = (r + g + b) / 3;

            // In handwritting6.jpg, ruled lines are light grey (~190-210), paper is off-white (~240-250), ink is < 165
            if (gray < 160) {
              // Ink pixel: render in rich black
              rgbaBuf[dIdx] = 20;     // R
              rgbaBuf[dIdx+1] = 20;   // G
              rgbaBuf[dIdx+2] = 20;   // B
              // Alpha based on darkness
              const alpha = Math.min(255, Math.max(0, Math.round((165 - gray) * 2.5)));
              rgbaBuf[dIdx+3] = alpha;
            } else {
              // Background / ruled line - fully transparent!
              rgbaBuf[dIdx] = 0;
              rgbaBuf[dIdx+1] = 0;
              rgbaBuf[dIdx+2] = 0;
              rgbaBuf[dIdx+3] = 0;
            }
          }
        }

        const pngBuf = await sharp(rgbaBuf, {
          raw: { width: cropW, height: cropH, channels: 4 }
        }).png().toBuffer();

        const dataUri = `data:image/png;base64,${pngBuf.toString('base64')}`;

        if (!glyphMap[ch]) glyphMap[ch] = [];
        glyphMap[ch].push({
          dataUri,
          width: cropW,
          height: cropH,
          aspect: cropW / cropH
        });
      }
    }
  }

  const chars = Object.keys(glyphMap);
  console.log(`Extracted glyphs for ${chars.length} unique characters:`, chars.join(' '));
  let totalVariants = 0;
  for (const ch of chars) {
    totalVariants += glyphMap[ch].length;
  }
  console.log(`Total glyph instances extracted: ${totalVariants}`);

  fs.writeFileSync('extracted-glyph-library.json', JSON.stringify(glyphMap));
  console.log('Saved extracted-glyph-library.json successfully!');
}

buildGlyphLibrary().catch(console.error);
