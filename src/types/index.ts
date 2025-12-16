export type PDFMode = 'text' | 'images' | 'hybrid' | 'auto';

export interface PDFMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
}

export interface PDFTextContent {
  text: string;
  metadata: PDFMetadata;
}

export interface PDFImagePage {
  pageNumber: number;
  image: string; // base64 encoded
  width: number;
  height: number;
}

export interface PDFHybridContent {
  text: string;
  images: PDFImagePage[];
  metadata: PDFMetadata;
  visualPageNumbers: number[];
}

export interface DocumentAnalysis {
  hasVisuals: boolean;
  visualPageNumbers: number[];
  textDensity: number;
  recommendedMode: PDFMode;
}
