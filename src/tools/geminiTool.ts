import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchPDFFromURL } from '../utils/fetcher.js';
import { renderPDFToImages } from '../utils/pdfRenderer.js';

export const UploadPDFToGeminiSchema = z.object({
  url: z.string().url().describe('URL of the PDF to fetch and upload to Gemini'),
  prompt: z
    .string()
    .describe('Prompt to send to Gemini for analyzing the PDF. Describe what you want to extract or understand from the document.'),
  dpi: z
    .number()
    .min(72)
    .max(300)
    .default(150)
    .describe('DPI for image rendering (72-300, default 150)'),
  maxPages: z
    .number()
    .min(1)
    .max(50)
    .default(20)
    .describe('Maximum number of pages to upload to Gemini (1-50, default 20)'),
  pages: z
    .array(z.number().min(1))
    .optional()
    .describe('Specific page numbers to upload (optional)'),
  model: z
    .enum(['gemini-3-pro', 'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'])
    .default('gemini-3-pro')
    .describe('Gemini model to use for visual processing'),
});

export type UploadPDFToGeminiInput = z.infer<typeof UploadPDFToGeminiSchema>;

export async function handleUploadPDFToGemini(input: UploadPDFToGeminiInput): Promise<string> {
  try {
    // Check for API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Gemini API key not found. Please set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.'
      );
    }

    // Fetch PDF from URL
    console.error(`Fetching PDF from: ${input.url}`);
    const pdfBuffer = await fetchPDFFromURL(input.url);
    console.error(`PDF fetched successfully (${pdfBuffer.length} bytes)`);

    // Render PDF pages to images
    console.error('Rendering PDF pages to images for Gemini...');
    const images = await renderPDFToImages(pdfBuffer, {
      dpi: input.dpi,
      maxPages: input.maxPages,
      pages: input.pages,
    });

    if (images.length === 0) {
      throw new Error('No pages were rendered from the PDF');
    }

    console.error(`Rendered ${images.length} pages, uploading to Gemini...`);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: input.model });

    // Prepare the content for Gemini
    // Convert base64 images to inline data format
    const imageParts = images.map((imagePage) => ({
      inlineData: {
        mimeType: 'image/png',
        data: imagePage.image,
      },
    }));

    // Send to Gemini
    console.error(`Sending ${images.length} pages to Gemini ${input.model}...`);
    const result = await model.generateContent([input.prompt, ...imageParts]);
    const response = result.response;
    const text = response.text();

    console.error(`Gemini analysis complete (${text.length} characters)`);

    // Format the response
    let output = `# PDF Visual Analysis (Gemini ${input.model})\n\n`;
    output += `**Source URL:** ${input.url}\n`;
    output += `**Pages Analyzed:** ${images.length}\n`;
    output += `**Model:** ${input.model}\n`;
    output += `**DPI:** ${input.dpi}\n\n`;
    output += `---\n\n`;
    output += `## User Prompt\n\n`;
    output += `${input.prompt}\n\n`;
    output += `---\n\n`;
    output += `## Gemini's Analysis\n\n`;
    output += text;
    output += `\n\n---\n\n`;
    output += `## Analyzed Pages\n\n`;
    
    for (const imagePage of images) {
      output += `- Page ${imagePage.pageNumber} (${imagePage.width}x${imagePage.height}px)\n`;
    }

    return output;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to upload PDF to Gemini: ${errorMessage}`);
  }
}
