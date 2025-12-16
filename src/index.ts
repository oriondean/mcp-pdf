#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { FetchAndParsePDFSchema, handleFetchAndParsePDF } from './tools/pdfTool.js';
import { UploadPDFToGeminiSchema, handleUploadPDFToGemini } from './tools/geminiTool.js';

// Create MCP server instance
const server = new McpServer(
  {
    name: 'pdf-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register the fetch_and_parse_pdf tool
server.registerTool(
  'fetch_and_parse_pdf',
  {
    description:
      'Fetches a PDF from a URL and parses it. Supports multiple modes: text extraction, image rendering, hybrid (text + images), or auto-detection. ' +
      'Use text mode for text-heavy documents, images mode for visual content, hybrid for mixed content, or auto to let the tool decide based on document analysis.',
    inputSchema: FetchAndParsePDFSchema,
  },
  async (args) => {
    // Execute tool
    const result = await handleFetchAndParsePDF(args);
    
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }
);

// Register the upload_pdf_to_gemini tool
server.registerTool(
  'upload_pdf_to_gemini',
  {
    description:
      'Fetches a PDF from a URL, renders it as images, and uploads to Google Gemini for advanced visual processing and analysis with a custom prompt. ' +
      'Gemini can analyze charts, diagrams, tables, handwriting, and complex visual layouts that traditional text extraction might miss. ' +
      'Requires GOOGLE_API_KEY or GEMINI_API_KEY environment variable. Best for visually complex documents, forms, presentations, or documents with mixed content.',
    inputSchema: UploadPDFToGeminiSchema,
  },
  async (args) => {
    // Execute tool
    const result = await handleUploadPDFToGemini(args);
    
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PDF MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
