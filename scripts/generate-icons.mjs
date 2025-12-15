import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

// PWA icon sizes needed
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Source icon
const sourceIcon = join(iconsDir, 'packtrack-icon-512.jpg');

async function generateIcons() {
  console.log('Generating PWA icons from:', sourceIcon);

  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);

    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Also create Apple touch icon (192x192)
  const appleTouchIcon = join(iconsDir, 'apple-touch-icon.png');
  await sharp(sourceIcon)
    .resize(180, 180, { fit: 'cover', position: 'center' })
    .png()
    .toFile(appleTouchIcon);
  console.log('Generated: apple-touch-icon.png (180x180)');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
