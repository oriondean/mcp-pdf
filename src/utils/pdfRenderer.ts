import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from '@napi-rs/canvas';
import type { PDFImagePage } from '../types/index.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `pdfjs-dist/build/pdf.worker.mjs`;

export interface RenderOptions {
  dpi?: number;
  maxPages?: number;
  pages?: number[]; // Specific pages to render
}

const DEFAULT_DPI = 150;
const DEFAULT_MAX_PAGES = 50;

export async function renderPDFToImages(
  pdfBuffer: Buffer,
  options: RenderOptions = {}
): Promise<PDFImagePage[]> {
  const dpi = options.dpi ?? DEFAULT_DPI;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;

    // Determine which pages to render
    let pagesToRender: number[];
    if (options.pages && options.pages.length > 0) {
      // Validate and filter requested pages
      pagesToRender = options.pages
        .filter((p) => p >= 1 && p <= numPages)
        .slice(0, maxPages);
    } else {
      // Render all pages up to maxPages
      pagesToRender = Array.from(
        { length: Math.min(numPages, maxPages) },
        (_, i) => i + 1
      );
    }

    // Render pages in parallel (with limit to avoid memory issues)
    const images: PDFImagePage[] = [];
    const batchSize = 5; // Render 5 pages at a time to manage memory
    
    for (let i = 0; i < pagesToRender.length; i += batchSize) {
      const batch = pagesToRender.slice(i, i + batchSize);
      const batchImages = await Promise.all(
        batch.map((pageNum) => renderPageToImage(pdfDocument, pageNum, dpi))
      );
      images.push(...batchImages);
    }

    return images;
  } catch (error) {
    throw new Error(`Failed to render PDF to images: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function renderPageToImage(
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  dpi: number
): Promise<PDFImagePage> {
  const page = await pdfDocument.getPage(pageNum);
  
  // Calculate scale based on DPI (72 is the base DPI)
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });

  // Create canvas
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d') as any;

  // Render PDF page to canvas
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  // Convert canvas to base64 PNG
  const imageBase64 = canvas.toDataURL('image/png').split(',')[1];

  return {
    pageNumber: pageNum,
    image: imageBase64,
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
  };
}

export async function renderSpecificPages(
  pdfBuffer: Buffer,
  pageNumbers: number[],
  dpi: number = DEFAULT_DPI
): Promise<PDFImagePage[]> {
  return renderPDFToImages(pdfBuffer, {
    dpi,
    pages: pageNumbers,
    maxPages: pageNumbers.length,
  });
}
