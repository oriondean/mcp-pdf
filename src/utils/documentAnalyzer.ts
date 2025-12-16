import type { DocumentAnalysis, PDFMode } from '../types/index.js';
import { analyzePDFPages } from './pdfParser.js';

interface AnalysisOptions {
  textDensityThreshold?: number; // Characters per page to consider "text-heavy"
  visualPageThreshold?: number; // Min pages with images to trigger hybrid/image mode
}

const DEFAULT_TEXT_DENSITY = 500; // Average characters per page
const DEFAULT_VISUAL_THRESHOLD = 0.2; // 20% of pages have visuals

export async function analyzeDocument(
  pdfBuffer: Buffer,
  options: AnalysisOptions = {}
): Promise<DocumentAnalysis> {
  const textDensityThreshold = options.textDensityThreshold ?? DEFAULT_TEXT_DENSITY;
  const visualThreshold = options.visualPageThreshold ?? DEFAULT_VISUAL_THRESHOLD;

  // Analyze all pages
  const pageAnalysis = await analyzePDFPages(pdfBuffer);
  const totalPages = pageAnalysis.size;

  // Calculate metrics
  let totalTextLength = 0;
  const visualPages: number[] = [];

  for (const [pageNum, analysis] of pageAnalysis.entries()) {
    totalTextLength += analysis.textLength;
    
    // Mark page as visual if it has images or very little text
    if (analysis.hasImages || analysis.textLength < textDensityThreshold / 2) {
      visualPages.push(pageNum);
    }
  }

  const avgTextDensity = totalPages > 0 ? totalTextLength / totalPages : 0;
  const visualPageRatio = totalPages > 0 ? visualPages.length / totalPages : 0;
  const hasVisuals = visualPages.length > 0;

  // Determine recommended mode
  let recommendedMode: PDFMode;

  if (!hasVisuals && avgTextDensity > textDensityThreshold) {
    // Text-heavy document with no visuals
    recommendedMode = 'text';
  } else if (visualPageRatio > 0.5 || avgTextDensity < textDensityThreshold / 2) {
    // More than 50% visual pages or very low text density
    recommendedMode = 'images';
  } else if (hasVisuals && visualPageRatio >= visualThreshold) {
    // Some visual content (hybrid approach)
    recommendedMode = 'hybrid';
  } else {
    // Default to text for mostly text content
    recommendedMode = 'text';
  }

  return {
    hasVisuals,
    visualPageNumbers: visualPages,
    textDensity: avgTextDensity,
    recommendedMode,
  };
}

export function selectPagesToRender(
  analysis: DocumentAnalysis,
  maxPages: number = 10
): number[] {
  // For hybrid mode, intelligently select which pages to render
  const { visualPageNumbers } = analysis;

  if (visualPageNumbers.length === 0) {
    // No visual pages detected, render first page only
    return [1];
  }

  if (visualPageNumbers.length <= maxPages) {
    // Render all visual pages if within limit
    return visualPageNumbers;
  }

  // Too many visual pages, select a representative sample
  // Always include first page, then evenly distribute the rest
  const selectedPages = [visualPageNumbers[0]];
  const step = Math.ceil((visualPageNumbers.length - 1) / (maxPages - 1));

  for (let i = step; i < visualPageNumbers.length && selectedPages.length < maxPages; i += step) {
    selectedPages.push(visualPageNumbers[i]);
  }

  return selectedPages.sort((a, b) => a - b);
}
