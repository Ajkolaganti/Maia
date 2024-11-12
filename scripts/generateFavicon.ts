import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const sizes = [16, 32, 48, 64, 128, 256];

const generateFavicon = (size: number) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#0ea5e9');
  gradient.addColorStop(1, '#0284c7');
  
  // Draw circle
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();

  // Draw clock hands
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size/10;
  ctx.lineCap = 'round';

  // Hour hand
  ctx.beginPath();
  ctx.moveTo(size/2, size/2);
  ctx.lineTo(size/2 + size/4, size/2);
  ctx.stroke();

  // Minute hand
  ctx.beginPath();
  ctx.moveTo(size/2, size/2);
  ctx.lineTo(size/2, size/3);
  ctx.stroke();

  return canvas.toBuffer();
};

// Generate favicons
sizes.forEach(size => {
  const buffer = generateFavicon(size);
  fs.writeFileSync(
    path.join(__dirname, `../public/favicon-${size}x${size}.png`),
    buffer
  );
}); 