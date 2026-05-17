// Renders a flat splash for iOS PWA at common iPhone sizes.
// Run with `pnpm gen:splash`.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const sizes = [
  { name: "iphone-se",   w: 750,  h: 1334 },
  { name: "iphone-8p",   w: 1242, h: 2208 },
  { name: "iphone-x",    w: 1125, h: 2436 },
  { name: "iphone-xr",   w: 828,  h: 1792 },
  { name: "iphone-12",   w: 1170, h: 2532 },
  { name: "iphone-12pm", w: 1284, h: 2778 },
  { name: "iphone-14p",  w: 1179, h: 2556 },
  { name: "iphone-14pm", w: 1290, h: 2796 },
];

const bg = "#f8fafc";
const fg = "#16a34a";

await mkdir("public/splash", { recursive: true });

for (const s of sizes) {
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}">
      <rect width="100%" height="100%" fill="${bg}"/>
      <circle cx="${s.w / 2}" cy="${s.h / 2}" r="${Math.min(s.w, s.h) * 0.18}" fill="${fg}"/>
      <text x="50%" y="${s.h / 2 + Math.min(s.w, s.h) * 0.32}"
        text-anchor="middle" font-family="system-ui, sans-serif"
        font-size="${Math.min(s.w, s.h) * 0.06}" font-weight="800" fill="#0f172a">
        JPR Farm
      </text>
    </svg>
  `);
  await sharp(svg).png().toFile(`public/splash/${s.name}.png`);
  console.log(`wrote public/splash/${s.name}.png`);
}
