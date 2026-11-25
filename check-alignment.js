const sharp = require('./backend/node_modules/sharp');
const fs = require('fs');
const path = require('path');

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

async function checkAlignment() {
  const { data, info } = await sharp('handwritting6.jpg').raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let l = 0; l < TRANSCRIPT.length; l++) {
    const item = TRANSCRIPT[l];
    const words = item.text.split(' ');
    const numWords = words.length;
    const yLine = item.yLine;
    const yTop = Math.max(0, yLine - 28);

    const cols = new Array(width).fill(0);
    for (let x = 20; x < 760; x++) {
      let ink = 0;
      for (let y = yTop; y <= yLine - 2; y++) {
        const idx = (y * width + x) * channels;
        if ((data[idx] + data[idx+1] + data[idx+2]) / 3 < 165) ink++;
      }
      cols[x] = ink;
    }

    const runs = [];
    let runStart = -1;
    for (let x = 20; x < 760; x++) {
      if (cols[x] <= 1 && runStart === -1) {
        runStart = x;
      } else if (cols[x] > 1 && runStart !== -1) {
        runs.push({ x0: runStart, x1: x - 1, len: x - runStart });
        runStart = -1;
      }
    }

    let firstInk = 20;
    while (firstInk < 760 && cols[firstInk] <= 1) firstInk++;
    let lastInk = 759;
    while (lastInk > 20 && cols[lastInk] <= 1) lastInk--;

    const internalRuns = runs.filter(r => r.x0 > firstInk + 4 && r.x1 < lastInk - 4);
    internalRuns.sort((a, b) => b.len - a.len);

    const selectedGaps = internalRuns.slice(0, numWords - 1);
    selectedGaps.sort((a, b) => a.x0 - b.x0);

    const wordBlocks = [];
    let curX0 = firstInk;
    for (let g = 0; g < selectedGaps.length; g++) {
      wordBlocks.push({ x0: curX0, x1: selectedGaps[g].x0 - 1, gapLen: selectedGaps[g].len });
      curX0 = selectedGaps[g].x1 + 1;
    }
    wordBlocks.push({ x0: curX0, x1: lastInk, gapLen: 0 });

    // Print smallest gap among selected
    const minGap = selectedGaps.length > 0 ? Math.min(...selectedGaps.map(g => g.len)) : 0;
    // Check if next rejected gap was almost as big
    const nextRejectedGap = internalRuns[numWords - 1] ? internalRuns[numWords - 1].len : 0;

    console.log(`L${l+1} (${numWords} words): minGap=${minGap}px, nextRejected=${nextRejectedGap}px`);
  }
}

checkAlignment().catch(console.error);
