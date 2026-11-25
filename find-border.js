const sharp = require('./backend/node_modules/sharp');

async function findBorder() {
  const { data, info } = await sharp('handwritting6.jpg').grayscale().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Let's check for dark horizontal lines near top (y=20..80) and bottom (y=height-80..height-20)
  // and vertical lines near left (x=10..60) and right (x=width-60..width-10)
  for (let y = 20; y < 70; y++) {
    let dark = 0;
    for (let x = 30; x < width - 30; x++) {
      if (data[y * width + x] < 120) dark++;
    }
    if (dark > width * 0.5) console.log(`Top border near y=${y} (dark: ${dark}/${width})`);
  }

  for (let y = height - 70; y < height - 10; y++) {
    let dark = 0;
    for (let x = 30; x < width - 30; x++) {
      if (data[y * width + x] < 120) dark++;
    }
    if (dark > width * 0.5) console.log(`Bottom border near y=${y} (dark: ${dark}/${width})`);
  }

  for (let x = 10; x < 60; x++) {
    let dark = 0;
    for (let y = 30; y < height - 30; y++) {
      if (data[y * width + x] < 120) dark++;
    }
    if (dark > height * 0.5) console.log(`Left border near x=${x} (dark: ${dark}/${height})`);
  }

  for (let x = width - 60; x < width - 10; x++) {
    let dark = 0;
    for (let y = 30; y < height - 30; y++) {
      if (data[y * width + x] < 120) dark++;
    }
    if (dark > height * 0.5) console.log(`Right border near x=${x} (dark: ${dark}/${height})`);
  }
}

findBorder().catch(console.error);
