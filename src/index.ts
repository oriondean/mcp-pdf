#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { FetchAndParsePDFSchema, handleFetchAndParsePDF } from './tools/pdfTool.js';

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
