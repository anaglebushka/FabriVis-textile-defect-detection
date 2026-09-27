import { UploadedGarmentPhoto } from '../types/inspection';

/**
 * Creates high-fidelity synthetic garment test images with reference objects
 * and defects for instant testing in environments without physical garments.
 */
export function generateSampleGarment(
  type: 'water_mark' | 'tear' | 'stain'
): UploadedGarmentPhoto {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d')!;

  // 1. Clean background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Garment body (e.g. Heather Grey Cotton T-shirt)
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  // Collar
  ctx.moveTo(350, 150);
  ctx.quadraticCurveTo(450, 220, 550, 150);
  // Right shoulder & sleeve
  ctx.lineTo(760, 240);
  ctx.lineTo(700, 420);
  ctx.lineTo(620, 370);
  // Right side seam
  ctx.lineTo(640, 950);
  // Bottom hem
  ctx.quadraticCurveTo(450, 980, 260, 950);
  // Left side seam
  ctx.lineTo(280, 370);
  ctx.lineTo(200, 420);
  ctx.lineTo(140, 240);
  ctx.closePath();
  ctx.fill();

  // Subtle fabric texture
  ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
  for (let i = 180; i < 900; i += 8) {
    ctx.fillRect(200, i, 500, 2);
  }

  // Collar ribbing
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(450, 140, 95, 0.3 * Math.PI, 0.7 * Math.PI, false);
  ctx.stroke();

  // 3. Reference object: Standard Credit Card (85.6 mm x 53.98 mm)
  // Drawn near the chest/defect for precise Gemini calibration
  ctx.save();
  ctx.translate(280, 560);
  ctx.rotate(-0.08);
  ctx.fillStyle = '#1e3a8a'; // Deep blue card
  ctx.beginPath();
  ctx.roundRect(0, 0, 140, 90, 8);
  ctx.fill();
  ctx.fillStyle = '#fbbf24'; // Chip
  ctx.beginPath();
  ctx.roundRect(20, 30, 28, 22, 3);
  ctx.fill();
  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('SAMPLE QC REF CARD (85.6mm)', 14, 76);
  ctx.restore();

  // 4. Draw specific defect
  if (type === 'water_mark') {
    // Water mark: pure darker wet looking area with NO residue, NO colored ring
    ctx.save();
    const grad = ctx.createRadialGradient(480, 460, 5, 480, 460, 40);
    grad.addColorStop(0, 'rgba(148, 163, 184, 0.65)');
    grad.addColorStop(0.7, 'rgba(148, 163, 184, 0.45)');
    grad.addColorStop(1, 'rgba(226, 232, 240, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(480, 460, 38, 30, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (type === 'tear') {
    // Tear / seam rip on seam
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(632, 510);
    ctx.lineTo(628, 535);
    ctx.lineTo(635, 555);
    ctx.lineTo(629, 580);
    ctx.stroke();

    // Loose thread fraying
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(630, 530);
    ctx.quadraticCurveTo(645, 540, 650, 550);
    ctx.stroke();
    ctx.restore();
  } else if (type === 'stain') {
    // Dark brown coffee/oil stain
    ctx.save();
    ctx.fillStyle = 'rgba(113, 63, 18, 0.75)';
    ctx.beginPath();
    ctx.ellipse(460, 480, 22, 18, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Splatter droplet
    ctx.beginPath();
    ctx.ellipse(485, 505, 7, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const base64 = dataUrl.split('base64,')[1];
  const fileSizeKb = Math.round((base64.length * 3) / 4 / 1024);

  return {
    id: `sample-${type}-${Date.now()}`,
    dataUrl,
    base64,
    width: canvas.width,
    height: canvas.height,
    fileSizeKb,
  };
}
