import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const inspectionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    garment_type: {
      type: Type.STRING,
      enum: ['t-shirt', 'dress', 'shirt', 'pants', 'other'],
      description: 'The auto-detected garment type',
    },
    image_quality: {
      type: Type.STRING,
      enum: ['good', 'poor'],
      description: 'Assessment of photo clarity, lighting, and garment visibility',
    },
    image_quality_note: {
      type: Type.STRING,
      description: 'Explanation if photo quality is poor or helpful clarity context',
    },
    defects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ['tear', 'stain', 'water_mark', 'other'],
            description: 'Defect type',
          },
          image_index: {
            type: Type.INTEGER,
            description: '0-based index of the garment photo displaying the defect (counts garment photos only, not reference examples)',
          },
          box_2d: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: '[ymin, xmin, ymax, xmax] coordinates normalized 0-1000 relative to garment photo at image_index',
          },
          location: {
            type: Type.STRING,
            description: 'Location on the garment (e.g. center chest, left sleeve, collar, lower hem, side seam)',
          },
          size_mm: {
            type: Type.NUMBER,
            description: 'Estimated largest dimension in millimeters',
          },
          size_basis: {
            type: Type.STRING,
            enum: ['reference_object', 'garment_proportions'],
            description: 'Whether sizing was derived from a reference object or garment proportions',
          },
          severity: {
            type: Type.STRING,
            enum: ['low', 'medium', 'high'],
            description: 'Severity degree of the defect',
          },
          confidence: {
            type: Type.NUMBER,
            description: 'Model confidence score between 0 and 1',
          },
          stain_uncertain: {
            type: Type.BOOLEAN,
            description: 'Set to true if unsure whether stain might be temporary water evaporation',
          },
          description: {
            type: Type.STRING,
            description: 'Detailed, objective observation of the defect',
          },
        },
        required: [
          'type',
          'image_index',
          'box_2d',
          'location',
          'size_mm',
          'size_basis',
          'severity',
          'confidence',
          'stain_uncertain',
          'description',
        ],
      },
    },
    summary: {
      type: Type.STRING,
      description: 'One or two sentence quality inspection summary of the garment',
    },
  },
  required: [
    'garment_type',
    'image_quality',
    'image_quality_note',
    'defects',
    'summary',
  ],
};

const SYSTEM_INSTRUCTION = `You are an expert garment quality-control inspector. Find every visible defect in the garment photo(s).
Defect types:
- tear (rips, holes, cuts, open seams)
- stain (any discoloration: dirt, food, ink, oil, makeup, wine)
- water_mark (only water: darker/wet-looking area with NO color tint, NO residue, NO colored ring – if unsure whether it is water, use 'stain' and set stain_uncertain=true)
- other (missing button, loose threads, fading, pilling)

A spot that looks wet or darker than the fabric, with no color tint and no residue, is a water_mark even if it is large. Only use stain for spots with color, residue, or a visible colored ring.

Estimate each defect's largest dimension in mm. If a reference object is visible (credit card 85.6x54 mm, US quarter 24.3 mm, ruler) use it and set size_basis='reference_object', otherwise size_basis='garment_proportions'.
Ignore prints, patterns, embroidery, logos, dye effects, shadows and wrinkles.
Report each physical defect once even if it appears in several photos.

CRITICAL INSTRUCTIONS FOR REFERENCE IMAGES:
If REFERENCE EXAMPLE images are provided before the garment photos, study them ONLY as customer definitions of acceptable/tolerated defect examples. DO NOT report any defects from reference images.
image_index counts garment photos only (0-based starting from the first photo after 'GARMENT PHOTOS START HERE', or 0 if no reference images).
box_2d is [ymin, xmin, ymax, xmax] normalized 0-1000 relative to the garment photo at image_index (0-based, garment photos only).
If a photo is blurry, dark, or the garment isn't clearly visible, set image_quality='poor' and explain in image_quality_note.`;

async function callGeminiInspection(
  requestParts: any[]
) {
  const modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[FabriVis] Attempting inspection with model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: requestParts,
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: inspectionResponseSchema,
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim();
      if (responseText) {
        const parsed = JSON.parse(responseText);
        console.log(`[FabriVis] Successfully inspected with ${modelName}. Defects found: ${parsed.defects?.length || 0}`);
        return { success: true, result: parsed, model: modelName };
      }
    } catch (err: any) {
      console.warn(`[FabriVis] Model ${modelName} failed:`, err?.message || err);
      lastError = err;
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Gemini model inspection currently unavailable.',
  };
}

app.post('/api/inspect', async (req, res) => {
  try {
    const { images, referenceExamples } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Please provide at least 1 garment photo.' });
    }

    if (images.length > 3) {
      return res.status(400).json({ error: 'Maximum 3 photos per garment inspection.' });
    }

    const requestParts: any[] = [];

    // If enabled customer rules have example photos, add them BEFORE garment photos
    if (Array.isArray(referenceExamples) && referenceExamples.length > 0) {
      for (const ref of referenceExamples) {
        if (ref.data) {
          let rawRef = ref.data;
          if (rawRef.includes('base64,')) {
            rawRef = rawRef.split('base64,')[1];
          }
          requestParts.push({
            text: `REFERENCE EXAMPLE (not the garment being inspected): this is an example of a '${ref.defectType}' as defined by the customer. Do not report defects from reference images.`,
          });
          requestParts.push({
            inlineData: {
              mimeType: ref.mimeType || 'image/jpeg',
              data: rawRef,
            },
          });
        }
      }
      requestParts.push({
        text: 'GARMENT PHOTOS START HERE',
      });
    }

    // Add garment photos
    for (const img of images) {
      let rawBase64 = img.data;
      if (rawBase64.includes('base64,')) {
        rawBase64 = rawBase64.split('base64,')[1];
      }
      requestParts.push({
        inlineData: {
          mimeType: img.mimeType || 'image/jpeg',
          data: rawBase64,
        },
      });
    }

    requestParts.push({
      text: `Inspect these ${images.length} photo(s) of this garment. Auto-detect garment type, locate all defects, estimate sizes in mm, and return the structured inspection JSON.`,
    });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const geminiResult = await callGeminiInspection(requestParts);

    if (geminiResult.success && geminiResult.result) {
      return res.json({ result: geminiResult.result });
    }

    return res.status(503).json({
      error: geminiResult.error || 'Inspection service temporarily busy. Please try again.',
    });
  } catch (error: any) {
    console.error('Inspection API error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to inspect garment. Please try again.',
    });
  }
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FabriVis server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
