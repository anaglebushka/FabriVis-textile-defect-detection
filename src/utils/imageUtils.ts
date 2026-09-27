import { CustomerRule, DefectType, UploadedGarmentPhoto } from '../types/inspection';

/**
 * Resizes an image file to a maximum dimension on its longest side, converting to JPEG.
 */
export async function resizeImageToMax(
  file: File | Blob,
  maxLongSide: number = 1600,
  quality: number = 0.88
): Promise<UploadedGarmentPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read photo file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for resizing'));
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        let targetWidth = width;
        let targetHeight = height;

        if (width > maxLongSide || height > maxLongSide) {
          if (width > height) {
            targetWidth = maxLongSide;
            targetHeight = Math.round((height / width) * maxLongSide);
          } else {
            targetHeight = maxLongSide;
            targetWidth = Math.round((width / height) * maxLongSide);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Could not create canvas 2D rendering context'));
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split('base64,')[1];
        const fileSizeKb = Math.round((base64.length * 3) / 4 / 1024);

        resolve({
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          dataUrl,
          base64,
          width: targetWidth,
          height: targetHeight,
          fileSizeKb,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function resizeImageToMax1600(file: File | Blob): Promise<UploadedGarmentPhoto> {
  return resizeImageToMax(file, 1600, 0.88);
}

export async function resizeImageToMax800(file: File | Blob): Promise<UploadedGarmentPhoto> {
  return resizeImageToMax(file, 800, 0.85);
}

/**
 * Pretty-formats defect types for display
 */
export function formatDefectType(type: DefectType | string): string {
  switch (type) {
    case 'tear':
      return 'Tear';
    case 'stain':
      return 'Stain';
    case 'water_mark':
      return 'Water mark';
    case 'other':
      return 'Other';
    default:
      return type.replace('_', ' ');
  }
}

/**
 * Converts a customer rule into an intuitive plain-English description:
 * e.g. "Water marks on T-shirts smaller than 40 mm → PASS"
 */
export function formatRuleInPlainEnglish(
  rule: Pick<CustomerRule, 'defectType' | 'garmentTypes' | 'maxSizeMm' | 'result'>
): string {
  // 1. Defect plural label
  let defectPlural = 'Defects';
  if (rule.defectType === 'water_mark') defectPlural = 'Water marks';
  else if (rule.defectType === 'stain') defectPlural = 'Stains';
  else if (rule.defectType === 'tear') defectPlural = 'Tears or holes';
  else if (rule.defectType === 'other') defectPlural = 'Other damage';

  // 2. Garment types
  const gTypes = rule.garmentTypes && rule.garmentTypes.length > 0 ? rule.garmentTypes : ['any'];
  let garmentDesc = 'all garments';
  if (!gTypes.includes('any')) {
    const formatted = gTypes.map((g) => {
      const lower = g.toLowerCase().trim().replace(/[\s-]+/g, '_');
      if (lower === 't_shirt' || lower === 'tee' || lower === 'tshirt') return 'T-shirts';
      if (lower === 'dress') return 'Dresses';
      if (lower === 'shirt') return 'Shirts';
      if (lower === 'pants') return 'Pants';
      return `${g.charAt(0).toUpperCase() + g.slice(1)}s`;
    });
    garmentDesc = formatted.join(', ');
  }

  // 3. Size
  const sizeDesc =
    rule.maxSizeMm !== null && rule.maxSizeMm !== undefined && !isNaN(Number(rule.maxSizeMm))
      ? `smaller than ${rule.maxSizeMm} mm`
      : 'of any size';

  // 4. Result
  const resultDesc = rule.result ? rule.result.replace('_', ' ') : 'PASS';

  return `${defectPlural} on ${garmentDesc} ${sizeDesc} → ${resultDesc}`;
}
