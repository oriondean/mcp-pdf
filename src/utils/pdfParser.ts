import * as pdfjsLib from 'pdfjs-dist';
import type { PDFMetadata, PDFTextContent } from '../types/index.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `pdfjs-dist/build/pdf.worker.mjs`;

export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<PDFTextContent> {
  try {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      standardFontDataUrl: 'pdfjs-dist/standard_fonts/',
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;

    // Extract metadata
    const metadata = await extractMetadata(pdfDocument);
    metadata.pageCount = numPages;

    // Extract text from all pages
    const textPromises: Promise<string>[] = [];
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      textPromises.push(extractPageText(pdfDocument, pageNum));
    }

    const pageTexts = await Promise.all(textPromises);
    const fullText = pageTexts
      .map((text, index) => `[Page ${index + 1}]\n${text}`)
      .join('\n\n');

    return {
      text: fullText,
      metadata,
    };
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function extractPageText(pdfDocument: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<string> {
  const page = await pdfDocument.getPage(pageNum);
  const textContent = await page.getTextContent();
  
  // Extract text items and join them
  const text = textContent.items
    .map((item) => {
      if ('str' in item) {
        return item.str;
      }
      return '';
    })
    .join(' ');

  return text.trim();
}

async function extractMetadata(pdfDocument: pdfjsLib.PDFDocumentProxy): Promise<PDFMetadata> {
  try {
    const metadata = await pdfDocument.getMetadata();
    const info = metadata.info as any;

    return {
      pageCount: 0, // Will be set by caller
      title: info?.Title || undefined,
      author: info?.Author || undefined,
      subject: info?.Subject || undefined,
      creator: info?.Creator || undefined,
      producer: info?.Producer || undefined,
      creationDate: info?.CreationDate || undefined,
    };
  } catch (error) {
    console.warn('Failed to extract PDF metadata:', error);
    return { pageCount: 0 };
  }
}

export async function analyzePDFPages(pdfBuffer: Buffer): Promise<Map<number, { hasImages: boolean; textLength: number }>> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
  });

  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  const pageAnalysis = new Map<number, { hasImages: boolean; textLength: number }>();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    
    // Get text content length
    const textContent = await page.getTextContent();
    const textLength = textContent.items.reduce((sum, item) => {
      if ('str' in item) {
        return sum + item.str.length;
      }
      return sum;
    }, 0);

    // Check for images using operators
    const ops = await page.getOperatorList();
    const hasImages = ops.fnArray.some((fn) => 
      fn === pdfjsLib.OPS.paintImageXObject || 
      fn === pdfjsLib.OPS.paintInlineImageXObject
    );

    pageAnalysis.set(pageNum, { hasImages, textLength });
  }

  return pageAnalysis;
}
