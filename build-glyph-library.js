const sharp = require('./backend/node_modules/sharp');
const fs = require('fs');
const path = require('path');

// Complete transcript of lines in handwritting6.jpg
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

async function extractAll() {
  const imgPath = path.resolve('handwritting6.jpg');
  const image = sharp(imgPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  console.log(`Loaded ${width}x${height} image.`);

  const glyphMap = {}; // char -> Array of { dataUri, width, height, char }

  for (let lineIdx = 0; lineIdx < TRANSCRIPT.length; lineIdx++) {
    const item = TRANSCRIPT[lineIdx];
    const yLine = item.yLine;
    const yTop = Math.max(0, yLine - 30);
    const yBottom = Math.min(height - 1, yLine + 8); // Allow small descenders

    // Words in this line
    const words = item.text.split(' ');

    // Scan vertical columns between x=30 and x=750 above the ruled line
    const colDensity = new Array(width).fill(0);
    for (let x = 30; x < 750; x++) {
      let ink = 0;
      for (let y = yTop; y <= yLine - 2; y++) {
        const idx = (y * width + x) * channels;
        const b = (data[idx] + data[idx+1] + data[idx+2]) / 3;
        if (b < 165) ink++;
      }
      colDensity[x] = ink;
    }

    // Find word clusters
    // Gaps >= 14px indicate a space between words
    const wordRanges = [];
    let inWord = false;
    let wStart = 0;
    for (let x = 30; x < 750; x++) {
      if (!inWord && colDensity[x] > 0) {
        inWord = true;
        wStart = x;
      } else if (inWord) {
        let gap = 0;
        while (x + gap < 750 && colDensity[x + gap] === 0) {
          gap++;
        }
        if (gap >= 12 || x === 749) {
          wordRanges.push({ x0: wStart, x1: x, width: x - wStart });
          inWord = false;
          x += gap - 1;
        }
      }
    }

    // Now match wordRanges to words
    // If counts match closely:
    const count = Math.min(words.length, wordRanges.length);
    for (let wIdx = 0; wIdx < count; wIdx++) {
      const word = words[wIdx];
      const range = wordRanges[wIdx];
      const charCount = word.length;
      if (charCount === 0) continue;

      const avgCharW = range.width / charCount;

      for (let c = 0; c < charCount; c++) {
        const char = word[c];
        const cx0 = Math.max(0, Math.floor(range.x0 + c * avgCharW));
        const cx1 = Math.min(width - 1, Math.ceil(range.x0 + (c + 1) * avgCharW));
        const cw = cx1 - cx0 + 1;
        const ch = yBottom - yTop + 1;

        if (cw < 4 || ch < 8) continue;

        // Crop pixel buffer and isolate ink
        const rgba = Buffer.alloc(cw * ch * 4);
        let darkPixels = 0;

        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            const srcY = yTop + y;
            const srcX = cx0 + x;
            if (srcY >= height || srcX >= width) continue;

            const srcIdx = (srcY * width + srcX) * channels;
            const dstIdx = (y * cw + x) * 4;
            const b = (data[srcIdx] + data[srcIdx+1] + data[srcIdx+2]) / 3;

            // Don't capture the horizontal ruled line if y is near yLine
            const isRuledLineY = (srcY >= yLine - 1 && srcY <= yLine + 2);
            // If it's ink and not ruled line
            if (b < 170 && !(isRuledLineY && b > 140)) {
              rgba[dstIdx] = 20;     // R
              rgba[dstIdx + 1] = 20; // G
              rgba[dstIdx + 2] = 20; // B
              // Smooth natural alpha based on darkness
              const alpha = Math.min(255, Math.max(0, Math.round((180 - b) / 90 * 255)));
              rgba[dstIdx + 3] = alpha;
              if (alpha > 40) darkPixels++;
            } else {
              rgba[dstIdx] = 255;
              rgba[dstIdx + 1] = 255;
              rgba[dstIdx + 2] = 255;
              rgba[dstIdx + 3] = 0; // Transparent
            }
          }
        }

        if (darkPixels >= 10) {
          if (!glyphMap[char]) glyphMap[char] = [];
          const pngBuf = await sharp(rgba, { raw: { width: cw, height: ch, channels: 4 } }).png().toBuffer();
          glyphMap[char].push({
            char,
            w: cw,
            h: ch,
            dataUri: `data:image/png;base64,${pngBuf.toString('base64')}`,
          });
        }
      }
    }
  }

  const chars = Object.keys(glyphMap).sort();
  console.log(`Extracted glyphs for ${chars.length} characters:`);
  let totalVariants = 0;
  chars.forEach(c => {
    const n = glyphMap[c].length;
    totalVariants += n;
    console.log(` '${c}': ${n} variants`);
  });
  console.log(`Total glyph variants: ${totalVariants}`);
}

extractAll().catch(console.error);
