import fetch from 'node-fetch';

export interface FetchOptions {
  maxSizeBytes?: number;
  timeoutMs?: number;
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_TIMEOUT = 30000; // 30 seconds

export async function fetchPDFFromURL(url: string, options: FetchOptions = {}): Promise<Buffer> {
  const maxSize = options.maxSizeBytes ?? DEFAULT_MAX_SIZE;
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT;

  // Validate URL
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are supported');
    }
  } catch (error) {
    throw new Error(`Invalid URL: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Fetch with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PDF-MCP-Server/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/pdf')) {
      console.warn(`Warning: Content-Type is ${contentType}, expected application/pdf`);
    }

    // Check content length
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSize) {
      throw new Error(`PDF size (${contentLength} bytes) exceeds maximum allowed size (${maxSize} bytes)`);
    }

    // Read response as array buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Verify size
    if (arrayBuffer.byteLength > maxSize) {
      throw new Error(`PDF size (${arrayBuffer.byteLength} bytes) exceeds maximum allowed size (${maxSize} bytes)`);
    }

    return Buffer.from(arrayBuffer);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
