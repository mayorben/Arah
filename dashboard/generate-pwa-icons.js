#!/usr/bin/env node
/**
 * Generates minimal valid PNG icons for the Arah PWA.
 * Uses only Node.js built-ins — no npm packages required.
 * Creates a green background with a gold "A" mark via pixel art.
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

// Rasterise a simple "A" glyph centred in size×size; returns RGBA Uint8Array
function makePixels(size) {
  const pixels = new Uint8Array(size * size * 4);
  const BG_R = 27, BG_G = 67, BG_B = 50;          // #1B4332 green
  const FG_R = 201, FG_G = 168, FG_B = 76;         // #C9A84C gold

  // Fill background
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4]     = BG_R;
    pixels[i * 4 + 1] = BG_G;
    pixels[i * 4 + 2] = BG_B;
    pixels[i * 4 + 3] = 255;
  }

  // Draw a simple pixel-art "A" scaled to ~50% of the icon
  // Base glyph on a 10×12 grid, scaled up
  const glyph = [
    '  XXXX  ',
    ' XXXXXX ',
    ' XX  XX ',
    ' XX  XX ',
    ' XXXXXX ',
    ' XXXXXX ',
    ' XX  XX ',
    ' XX  XX ',
  ];
  const gW = glyph[0].length;
  const gH = glyph.length;
  const cellW = Math.floor(size * 0.55 / gW);
  const cellH = Math.floor(size * 0.55 / gH);
  const offX = Math.floor((size - gW * cellW) / 2);
  const offY = Math.floor((size - gH * cellH) / 2);

  for (let row = 0; row < gH; row++) {
    for (let col = 0; col < gW; col++) {
      if (glyph[row][col] === 'X') {
        for (let dy = 0; dy < cellH; dy++) {
          for (let dx = 0; dx < cellW; dx++) {
            const px = offX + col * cellW + dx;
            const py = offY + row * cellH + dy;
            if (px < size && py < size) {
              const idx = (py * size + px) * 4;
              pixels[idx]     = FG_R;
              pixels[idx + 1] = FG_G;
              pixels[idx + 2] = FG_B;
              pixels[idx + 3] = 255;
            }
          }
        }
      }
    }
  }
  return pixels;
}

function makePNG(size) {
  const pixels = makePixels(size);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // bit depth 8, RGBA

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // filter None
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      row[1 + x * 4]     = pixels[idx];
      row[1 + x * 4 + 1] = pixels[idx + 1];
      row[1 + x * 4 + 2] = pixels[idx + 2];
      row[1 + x * 4 + 3] = pixels[idx + 3];
    }
    rows.push(row);
  }
  const idat = zlib.deflateSync(Buffer.concat(rows), { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, 'public', 'icons');
fs.mkdirSync(dir, { recursive: true });

[72, 96, 128, 144, 152, 192, 384, 512].forEach(s => {
  fs.writeFileSync(path.join(dir, `icon-${s}x${s}.png`), makePNG(s));
  console.log(`  ✓  icon-${s}x${s}.png`);
});
console.log('\nPWA icons generated in dashboard/public/icons/');
