const sharp = require('./backend/node_modules/sharp');
const fs = require('fs');

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

async function extractWholeWords() {
  const { data, info } = await sharp('handwritting6.jpg').raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const wordLib = {}; // cleanWordKey -> array of { dataUri, width, height, aspect }

  for (let l = 0; l < TRANSCRIPT.length; l++) {
    const item = TRANSCRIPT[l];
    const words = item.text.split(' ');
    const numWords = words.length;
    const yLine = item.yLine;
    const yTop = Math.max(0, yLine - 28);
    const yBottom = Math.min(height - 1, yLine + 7);

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

    for (let w = 0; w < words.length; w++) {
      const rawWord = words[w];
      const cleanKey = rawWord.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const b = wordBlocks[w];
      if (!b || !cleanKey) continue;

      const cropW = b.x1 - b.x0 + 1;
      const cropH = yBottom - yTop + 1;
      if (cropW < 4 || cropH < 4) continue;

      const patch = await sharp('handwritting6.jpg')
        .extract({ left: b.x0, top: yTop, width: cropW, height: cropH })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const patchData = patch.data;
      const rgbaBuf = Buffer.alloc(cropW * cropH * 4);

      for (let py = 0; py < cropH; py++) {
        for (let px = 0; px < cropW; px++) {
          const sIdx = (py * cropW + px) * patch.info.channels;
          const dIdx = (py * cropW + px) * 4;
          const gray = (patchData[sIdx] + patchData[sIdx+1] + patchData[sIdx+2]) / 3;

          if (gray < 165) {
            rgbaBuf[dIdx] = 18;
            rgbaBuf[dIdx+1] = 18;
            rgbaBuf[dIdx+2] = 18;
            const alpha = Math.min(255, Math.max(0, Math.round((165 - gray) * 2.8)));
            rgbaBuf[dIdx+3] = alpha;
          } else {
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

      if (!wordLib[cleanKey]) wordLib[cleanKey] = [];
      wordLib[cleanKey].push({
        rawWord,
        dataUri,
        width: cropW,
        height: cropH,
        aspect: cropW / cropH
      });
    }
  }

  const keys = Object.keys(wordLib);
  console.log(`Extracted whole words for ${keys.length} unique words!`);
  fs.writeFileSync('extracted-word-library.json', JSON.stringify(wordLib));
  console.log('Saved extracted-word-library.json');
}

extractWholeWords().catch(console.error);
