const sharp = require('./backend/node_modules/sharp');
const fs = require('fs');
const path = require('path');

// Complete transcript of lines in handwritting6.jpg with line positions
const TRANSCRIPT = [
  { text: "Wedding", yLine: 95, isHeading: true },
  { text: "When James was in high school he had the", yLine: 130 },
  { text: "likes for a girl, named Savannah. He loved her", yLine: 165 },
  { text: "enough to stare at her in social study class", yLine: 200 },
  { text: "because he sat behind her, years later he went", yLine: 235 },
  { text: "to her house to ask her if she wanted to", yLine: 269 },
  { text: "marry him and she said yes and he go happy", yLine: 304 },
  { text: "and got children, and she died last month.", yLine: 339 },
  { text: "Career", yLine: 409, isHeading: true },
  { text: "Lebron's career is to be a basketball player.", yLine: 443 },
  { text: "And today he is in the NBA and with the maimi", yLine: 478 },
  { text: "heat. And he is a great player, but he might get", yLine: 513 },
  { text: "transfered to the Lakers in 2014, with Carmello", yLine: 548 },
  { text: "Anthony and kobe Bryant. And he used to play", yLine: 582 },
  { text: "football for st-vincent - st-mary high. Futher more", yLine: 617 },
  { text: "he was a great football player.", yLine: 652 },
  { text: "Team", yLine: 722, isHeading: true },
  { text: "Maimi heat is a professinal basketball team", yLine: 757 },
  { text: "based on Maimi, Florida, United state. The team is a", yLine: 792 },
  { text: "member of the southeast Divison in the Eastern", yLine: 827 },
  { text: "of the NBA. And were they play there home games is", yLine: 862 },
  { text: "American Airlines Areana in Downtown Maimi. And formed", yLine: 897 },
  { text: "in 1988 as one of the NBA four expansion franishes.", yLine: 932 },
  { text: "Therefore maimi is the best team in", yLine: 967 },
  { text: "the world to me.", yLine: 1002 },
];

async function buildAdvancedGlyphExtractor() {
  const imgPath = path.resolve('handwritting6.jpg');
  const image = sharp(imgPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  console.log(`Image: ${width}x${height}`);

  const charGlyphs = {}; // char -> Array of { dataUri, w, h }
  const wordGlyphs = {}; // lowerWord -> Array of { dataUri, w, h }

  for (let lIdx = 0; lIdx < TRANSCRIPT.length; lIdx++) {
    const item = TRANSCRIPT[lIdx];
    const yLine = item.yLine;
    const yTop = Math.max(0, yLine - 28);
    const yBottom = Math.min(height - 1, yLine + 7);

    const words = item.text.split(' ');

    // Scan vertical columns between x=30 and x=750
    // To separate words, check density in core letter zone
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

    // Segment word boundaries (gap >= 12px)
    const wordBlocks = [];
    let inWord = false;
    let wStart = 0;
    for (let x = 30; x < 750; x++) {
      if (!inWord && colDensity[x] > 0) {
        inWord = true;
        wStart = x;
      } else if (inWord) {
        let gap = 0;
        while (x + gap < 750 && colDensity[x + gap] === 0) gap++;
        if (gap >= 12 || x === 749) {
          wordBlocks.push({ x0: wStart, x1: x, width: x - wStart });
          inWord = false;
          x += gap - 1;
        }
      }
    }

    const count = Math.min(words.length, wordBlocks.length);
    for (let w = 0; w < count; w++) {
      const word = words[w];
      const block = wordBlocks[w];

      // 1. Extract Whole Word Glyph
      const wordW = block.x1 - block.x0 + 1;
      const wordH = yBottom - yTop + 1;
      let wordPngBuf = null;

      if (wordW >= 8 && wordH >= 10) {
        const wordRgba = Buffer.alloc(wordW * wordH * 4);
        let darkCount = 0;
        for (let y = 0; y < wordH; y++) {
          for (let x = 0; x < wordW; x++) {
            const srcY = yTop + y;
            const srcX = block.x0 + x;
            if (srcY >= height || srcX >= width) continue;
            const srcIdx = (srcY * width + srcX) * channels;
            const dstIdx = (y * wordW + x) * 4;
            const b = (data[srcIdx] + data[srcIdx+1] + data[srcIdx+2]) / 3;

            const isRuledY = (srcY >= yLine - 1 && srcY <= yLine + 2);
            if (b < 170 && !(isRuledY && b > 140)) {
              wordRgba[dstIdx] = 22;
              wordRgba[dstIdx + 1] = 22;
              wordRgba[dstIdx + 2] = 22;
              const alpha = Math.min(255, Math.max(0, Math.round((180 - b) / 90 * 255)));
              wordRgba[dstIdx + 3] = alpha;
              if (alpha > 40) darkCount++;
            } else {
              wordRgba[dstIdx] = 255;
              wordRgba[dstIdx + 1] = 255;
              wordRgba[dstIdx + 2] = 255;
              wordRgba[dstIdx + 3] = 0;
            }
          }
        }

        if (darkCount >= 15) {
          const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          if (cleanWord.length > 0) {
            if (!wordGlyphs[cleanWord]) wordGlyphs[cleanWord] = [];
            wordPngBuf = await sharp(wordRgba, { raw: { width: wordW, height: wordH, channels: 4 } }).png().toBuffer();
            wordGlyphs[cleanWord].push({
              word: cleanWord,
              w: wordW,
              h: wordH,
              dataUri: `data:image/png;base64,${wordPngBuf.toString('base64')}`,
            });
          }
        }
      }

      // If word has single character
      if (word.length === 1 && wordPngBuf) {
        const char = word[0];
        if (!charGlyphs[char]) charGlyphs[char] = [];
        charGlyphs[char].push({
          char,
          w: wordW,
          h: wordH,
          dataUri: `data:image/png;base64,${wordPngBuf.toString('base64')}`,
        });
        continue;
      }

      // 2. Character segmentation within the word using vertical valley profiles
      const wordCols = [];
      for (let x = block.x0; x <= block.x1; x++) {
        let ink = 0;
        for (let y = yTop; y <= yLine - 2; y++) {
          const srcIdx = (y * width + x) * channels;
          const b = (data[srcIdx] + data[srcIdx+1] + data[srcIdx+2]) / 3;
          if (b < 165) ink++;
        }
        wordCols.push({ x, ink });
      }

      // Find character valleys
      // Target number of cuts is word.length - 1
      const cuts = [block.x0];
      const targetCuts = word.length - 1;

      // Find local minima where ink drops below 2
      const candidateValleys = [];
      for (let i = 2; i < wordCols.length - 2; i++) {
        if (wordCols[i].ink <= 1) {
          candidateValleys.push(wordCols[i].x);
        }
      }

      // Cluster adjacent valley columns
      const valleyClusters = [];
      let currentCluster = [];
      for (let i = 0; i < candidateValleys.length; i++) {
        if (currentCluster.length === 0 || candidateValleys[i] - currentCluster[currentCluster.length - 1] === 1) {
          currentCluster.push(candidateValleys[i]);
        } else {
          valleyClusters.push(Math.round(currentCluster.reduce((a,b)=>a+b,0) / currentCluster.length));
          currentCluster = [candidateValleys[i]];
        }
      }
      if (currentCluster.length > 0) {
        valleyClusters.push(Math.round(currentCluster.reduce((a,b)=>a+b,0) / currentCluster.length));
      }

      // If valley clusters count is reasonable, use them
      let finalCuts = [];
      if (valleyClusters.length >= targetCuts - 1 && valleyClusters.length <= targetCuts + 2) {
        // Filter valleys to have minimum spacing of 5px
        finalCuts = [block.x0];
        valleyClusters.forEach(v => {
          if (v - finalCuts[finalCuts.length - 1] >= 5 && block.x1 - v >= 5) {
            finalCuts.push(v);
          }
        });
        finalCuts.push(block.x1);
      } else {
        // Proportional character slicing based on character weights (e.g. 'm' is wider than 'i')
        const charWeights = {
          'i': 0.4, 'l': 0.4, 't': 0.6, 'j': 0.5, 'f': 0.6, 'r': 0.6,
          'm': 1.6, 'w': 1.5, 'M': 1.7, 'W': 1.7,
        };
        let totalWeight = 0;
        for (const ch of word) totalWeight += (charWeights[ch] || 1.0);

        finalCuts = [block.x0];
        let accW = 0;
        for (let c = 0; c < word.length - 1; c++) {
          accW += (charWeights[word[c]] || 1.0);
          finalCuts.push(Math.round(block.x0 + (accW / totalWeight) * block.width));
        }
        finalCuts.push(block.x1);
      }

      // Extract each character segment
      const numSegments = Math.min(word.length, finalCuts.length - 1);
      for (let s = 0; s < numSegments; s++) {
        const char = word[s];
        const cx0 = finalCuts[s];
        const cx1 = finalCuts[s + 1];
        const cw = cx1 - cx0 + 1;
        const ch = yBottom - yTop + 1;

        if (cw < 3 || ch < 6) continue;

        const charRgba = Buffer.alloc(cw * ch * 4);
        let dark = 0;

        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            const srcY = yTop + y;
            const srcX = cx0 + x;
            if (srcY >= height || srcX >= width) continue;
            const srcIdx = (srcY * width + srcX) * channels;
            const dstIdx = (y * cw + x) * 4;
            const b = (data[srcIdx] + data[srcIdx+1] + data[srcIdx+2]) / 3;

            const isRuledY = (srcY >= yLine - 1 && srcY <= yLine + 2);
            if (b < 170 && !(isRuledY && b > 140)) {
              charRgba[dstIdx] = 22;
              charRgba[dstIdx + 1] = 22;
              charRgba[dstIdx + 2] = 22;
              const alpha = Math.min(255, Math.max(0, Math.round((180 - b) / 90 * 255)));
              charRgba[dstIdx + 3] = alpha;
              if (alpha > 40) dark++;
            } else {
              charRgba[dstIdx] = 255;
              charRgba[dstIdx + 1] = 255;
              charRgba[dstIdx + 2] = 255;
              charRgba[dstIdx + 3] = 0;
            }
          }
        }

        if (dark >= 6) {
          if (!charGlyphs[char]) charGlyphs[char] = [];
          const pngBuf = await sharp(charRgba, { raw: { width: cw, height: ch, channels: 4 } }).png().toBuffer();
          charGlyphs[char].push({
            char,
            w: cw,
            h: ch,
            dataUri: `data:image/png;base64,${pngBuf.toString('base64')}`,
          });
        }
      }
    }
  }

  const uniqueChars = Object.keys(charGlyphs).sort();
  const uniqueWords = Object.keys(wordGlyphs).sort();

  console.log(`\n========================================`);
  console.log(`Extracted ${uniqueWords.length} unique whole-word glyphs!`);
  console.log(`Extracted ${uniqueChars.length} unique character glyphs!`);
  let totalChars = 0;
  uniqueChars.forEach(c => totalChars += charGlyphs[c].length);
  console.log(`Total character glyph variations: ${totalChars}`);
  console.log(`Sample words: ${uniqueWords.slice(0, 20).join(', ')}`);
  console.log(`Sample chars: ${uniqueChars.join(' ')}`);
  console.log(`========================================`);
}

buildAdvancedGlyphExtractor().catch(console.error);
