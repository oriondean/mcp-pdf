import { z } from 'zod';
import type { PDFMode, PDFTextContent } from '../types/index.js';
import { fetchPDFFromURL } from '../utils/fetcher.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { renderPDFToImages, renderSpecificPages } from '../utils/pdfRenderer.js';
import { analyzeDocument, selectPagesToRender } from '../utils/documentAnalyzer.js';

// Input schema for the PDF tool
export const FetchAndParsePDFSchema = z.object({
  url: z.string().url().describe('URL of the PDF to fetch and parse'),
  mode: z
    .enum(['text', 'images', 'hybrid', 'auto'])
    .default('auto')
    .describe('Extraction mode: text (text only), images (render all pages), hybrid (text + key images), auto (intelligent detection)'),
  dpi: z
    .number()
    .min(72)
    .max(300)
    .default(150)
    .describe('DPI for image rendering (72-300, default 150)'),
  maxPages: z
    .number()
    .min(1)
    .max(100)
    .default(50)
    .describe('Maximum number of pages to render as images'),
  pages: z
    .array(z.number().min(1))
    .optional()
    .describe('Specific page numbers to render (only used in images/hybrid mode)'),
});

export type FetchAndParsePDFInput = z.infer<typeof FetchAndParsePDFSchema>;

export async function handleFetchAndParsePDF(input: FetchAndParsePDFInput): Promise<string> {
  try {
    // Fetch PDF from URL
    console.error(`Fetching PDF from: ${input.url}`);
    const pdfBuffer = await fetchPDFFromURL(input.url);
    console.error(`PDF fetched successfully (${pdfBuffer.length} bytes)`);

    // Determine the actual mode to use
    let actualMode: PDFMode = input.mode;
    if (input.mode === 'auto') {
      console.error('Analyzing document structure...');
      const analysis = await analyzeDocument(pdfBuffer);
      actualMode = analysis.recommendedMode;
      console.error(`Auto-detected mode: ${actualMode} (text density: ${Math.round(analysis.textDensity)}, visual pages: ${analysis.visualPageNumbers.length})`);
    }

    // Process based on mode
    switch (actualMode) {
      case 'text':
        return await handleTextMode(pdfBuffer);
      
      case 'images':
        return await handleImagesMode(pdfBuffer, input);
      
      case 'hybrid':
        return await handleHybridMode(pdfBuffer, input);
      
      default:
        throw new Error(`Unknown mode: ${actualMode}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch and parse PDF: ${errorMessage}`);
  }
}

async function handleTextMode(pdfBuffer: Buffer): Promise<string> {
  console.error('Extracting text from PDF...');
  const textContent: PDFTextContent = await extractTextFromPDF(pdfBuffer);
  
  // Format response
  const metadata = textContent.metadata;
  let response = '# PDF Content (Text Mode)\n\n';
  
  if (metadata.title) response += `**Title:** ${metadata.title}\n`;
  if (metadata.author) response += `**Author:** ${metadata.author}\n`;
  if (metadata.subject) response += `**Subject:** ${metadata.subject}\n`;
  response += `**Pages:** ${metadata.pageCount}\n\n`;
  response += '---\n\n';
  response += textContent.text;
  
  console.error(`Text extraction complete (${textContent.text.length} characters)`);
  return response;
}

async function handleImagesMode(pdfBuffer: Buffer, input: FetchAndParsePDFInput): Promise<string> {
  console.error('Rendering PDF pages to images...');
  const images = await renderPDFToImages(pdfBuffer, {
    dpi: input.dpi,
    maxPages: input.maxPages,
    pages: input.pages,
  });
  
  // Format response with embedded images
  let response = `# PDF Content (Images Mode)\n\n`;
  response += `**Rendered Pages:** ${images.length}\n`;
  response += `**DPI:** ${input.dpi}\n\n`;
  response += '---\n\n';
  
  for (const imagePage of images) {
    response += `## Page ${imagePage.pageNumber}\n\n`;
    response += `![Page ${imagePage.pageNumber}](data:image/png;base64,${imagePage.image})\n\n`;
    response += `*Size: ${imagePage.width}x${imagePage.height}px*\n\n`;
  }
  
  console.error(`Image rendering complete (${images.length} pages)`);
  return response;
}

async function handleHybridMode(pdfBuffer: Buffer, input: FetchAndParsePDFInput): Promise<string> {
  console.error('Processing PDF in hybrid mode (text + images)...');
  
  // Extract text first
  const textContent: PDFTextContent = await extractTextFromPDF(pdfBuffer);
  
  // Analyze document to find visual pages
  const analysis = await analyzeDocument(pdfBuffer);
  const pagesToRender = input.pages ?? selectPagesToRender(analysis, Math.min(10, input.maxPages));
  
  console.error(`Rendering ${pagesToRender.length} visual pages: [${pagesToRender.join(', ')}]`);
  
  // Render selected pages
  const images = pagesToRender.length > 0 
    ? await renderSpecificPages(pdfBuffer, pagesToRender, input.dpi)
    : [];
  
  // Format hybrid response
  const metadata = textContent.metadata;
  let response = '# PDF Content (Hybrid Mode)\n\n';
  
  if (metadata.title) response += `**Title:** ${metadata.title}\n`;
  if (metadata.author) response += `**Author:** ${metadata.author}\n`;
  response += `**Pages:** ${metadata.pageCount}\n`;
  response += `**Text Density:** ${Math.round(analysis.textDensity)} chars/page\n`;
  response += `**Visual Pages:** ${analysis.visualPageNumbers.length}\n`;
  response += `**Rendered Pages:** ${images.length}\n\n`;
  response += '---\n\n';
  
  // Add text content
  response += '## Text Content\n\n';
  response += textContent.text;
  response += '\n\n---\n\n';
  
  // Add visual pages
  if (images.length > 0) {
    response += '## Visual Pages\n\n';
    response += `The following pages contain charts, diagrams, or other visual elements:\n\n`;
    
    for (const imagePage of images) {
      response += `### Page ${imagePage.pageNumber}\n\n`;
      response += `![Page ${imagePage.pageNumber}](data:image/png;base64,${imagePage.image})\n\n`;
    }
  }
  
  console.error(`Hybrid processing complete (${textContent.text.length} chars, ${images.length} images)`);
  return response;
}
