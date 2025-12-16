import { describe, it, expect, beforeAll } from 'vitest';
import { handleFetchAndParsePDF } from './pdfTool.js';
import { renderPDFToImages } from '../utils/pdfRenderer.js';
import { Path2D, DOMMatrix } from '@napi-rs/canvas';

// Setup canvas polyfills before any PDF operations
beforeAll(() => {
  if (typeof (globalThis as any).Path2D === 'undefined') {
    (globalThis as any).Path2D = Path2D;
  }
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = DOMMatrix;
  }
});

describe('PDF Image Mode Functionality', () => {
  // Test with a simple PDF URL - using a public PDF for testing
  const testPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  it('should render PDF in images mode', async () => {
    const result = await handleFetchAndParsePDF({
      url: testPdfUrl,
      mode: 'images',
      dpi: 150,
      maxPages: 1,
    });

    // Verify the response contains expected sections
    expect(result).toContain('# PDF Content (Images Mode)');
    expect(result).toContain('**Rendered Pages:**');
    expect(result).toContain('**DPI:** 150');
    expect(result).toContain('## Page 1');
    
    // Verify it contains base64 image data
    expect(result).toContain('data:image/png;base64,');
    expect(result).toContain('![Page 1]');
  }, 30000); // 30 second timeout for PDF fetching and rendering

  it('should render specific pages when pages array is provided', async () => {
    const result = await handleFetchAndParsePDF({
      url: testPdfUrl,
      mode: 'images',
      dpi: 150,
      maxPages: 5,
      pages: [1],
    });

    // Should only render page 1
    expect(result).toContain('## Page 1');
    expect(result).toContain('**Rendered Pages:** 1');
    
    // Should not contain page 2
    expect(result).not.toContain('## Page 2');
  }, 30000);

  it('should respect maxPages limit', async () => {
    const result = await handleFetchAndParsePDF({
      url: testPdfUrl,
      mode: 'images',
      dpi: 72, // Lower DPI for faster test
      maxPages: 1,
    });

    // Count how many page sections exist
    const pageMatches = result.match(/## Page \d+/g);
    expect(pageMatches?.length).toBeLessThanOrEqual(1);
  }, 30000);

  it('should render images with correct DPI settings', async () => {
    const result = await handleFetchAndParsePDF({
      url: testPdfUrl,
      mode: 'images',
      dpi: 72,
      maxPages: 1,
    });

    expect(result).toContain('**DPI:** 72');
    expect(result).toContain('data:image/png;base64,');
  }, 30000);

  it('should handle renderPDFToImages directly', async () => {
    // First fetch the PDF manually to test the render function directly
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(testPdfUrl);
    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    const images = await renderPDFToImages(pdfBuffer, {
      dpi: 150,
      maxPages: 1,
    });

    // Verify the structure of rendered images
    expect(images).toBeDefined();
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toHaveProperty('pageNumber');
    expect(images[0]).toHaveProperty('image');
    expect(images[0]).toHaveProperty('width');
    expect(images[0]).toHaveProperty('height');
    
    // Verify image is base64 encoded
    expect(images[0].image).toMatch(/^[A-Za-z0-9+/]+=*$/);
    
    // Verify dimensions are positive
    expect(images[0].width).toBeGreaterThan(0);
    expect(images[0].height).toBeGreaterThan(0);
  }, 30000);

  it('should handle invalid page numbers gracefully', async () => {
    const result = await handleFetchAndParsePDF({
      url: testPdfUrl,
      mode: 'images',
      dpi: 150,
      maxPages: 5,
      pages: [999], // Non-existent page
    });

    // Should still return valid response, just with no pages
    expect(result).toContain('# PDF Content (Images Mode)');
    expect(result).toContain('**Rendered Pages:** 0');
  }, 30000);
});

describe('PDF Canvas Polyfills', () => {
  it('should have Path2D polyfill available', () => {
    expect((globalThis as any).Path2D).toBeDefined();
    expect(typeof (globalThis as any).Path2D).toBe('function');
  });

  it('should have DOMMatrix polyfill available', () => {
    expect((globalThis as any).DOMMatrix).toBeDefined();
    expect(typeof (globalThis as any).DOMMatrix).toBe('function');
  });
});
