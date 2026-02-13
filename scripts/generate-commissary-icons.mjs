import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, '..', 'public', 'icons', 'commissary');

// ChefHat paths from Lucide (24x24 viewBox)
// Scaled to fit ~55% of 512px canvas, centered
// Transform: translate to center, scale 11.7x (24*11.7 ≈ 281px icon size)
const ICON_SCALE = 11.7;
const ICON_SIZE = 24 * ICON_SCALE; // ~281px
const OFFSET_X = (512 - ICON_SIZE) / 2;
const OFFSET_Y = (512 - ICON_SIZE) / 2;

function buildSvg(size) {
  const scale = size / 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <!-- Background gradient (orange) -->
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5A84B"/>
      <stop offset="30%" stop-color="#F0943A"/>
      <stop offset="70%" stop-color="#E07A2F"/>
      <stop offset="100%" stop-color="#C45A1A"/>
    </linearGradient>
    <!-- Inner highlight for subtle glow -->
    <linearGradient id="innerGlow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.25)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.15)"/>
    </linearGradient>
    <!-- Border gradient -->
    <linearGradient id="borderGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5B870"/>
      <stop offset="100%" stop-color="#A84810"/>
    </linearGradient>
    <!-- Drop shadow for the icon -->
    <filter id="iconShadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.2)"/>
    </filter>
  </defs>

  <!-- Outer border/shadow rectangle -->
  <rect x="8" y="8" width="496" height="496" rx="80" ry="80"
        fill="url(#borderGrad)" opacity="0.6"/>

  <!-- Main background -->
  <rect x="16" y="16" width="480" height="480" rx="72" ry="72"
        fill="url(#bgGrad)"/>

  <!-- Inner highlight overlay -->
  <rect x="16" y="16" width="480" height="480" rx="72" ry="72"
        fill="url(#innerGlow)"/>

  <!-- White ChefHat icon, centered -->
  <g transform="translate(${OFFSET_X}, ${OFFSET_Y}) scale(${ICON_SCALE})"
     fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
     filter="url(#iconShadow)">
    <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
    <line x1="6" x2="18" y1="17" y2="17"/>
  </g>
</svg>`;
}

async function generate() {
  const sizes = [512, 192];

  for (const size of sizes) {
    const svg = buildSvg(size);
    const outputPath = join(outputDir, `icon-${size}x${size}.png`);

    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-${size}x${size}.png`);
  }

  console.log('\nCommissary icons generated successfully!');
}

generate().catch(console.error);
