#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { FetchAndParsePDFSchema, handleFetchAndParsePDF } from './tools/pdfTool.js';

// Create MCP server instance
const server = new Server(
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

// Tool definitions
const TOOLS = [
  {
    name: 'fetch_and_parse_pdf',
    description:
      'Fetches a PDF from a URL and parses it. Supports multiple modes: text extraction, image rendering, hybrid (text + images), or auto-detection. ' +
      'Use text mode for text-heavy documents, images mode for visual content, hybrid for mixed content, or auto to let the tool decide based on document analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the PDF to fetch and parse',
        },
        mode: {
          type: 'string',
          enum: ['text', 'images', 'hybrid', 'auto'],
          default: 'auto',
          description:
            'Extraction mode: text (text only), images (render all pages), hybrid (text + key images), auto (intelligent detection)',
        },
        dpi: {
          type: 'number',
          minimum: 72,
          maximum: 300,
          default: 150,
          description: 'DPI for image rendering (72-300, default 150)',
        },
        maxPages: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 50,
          description: 'Maximum number of pages to render as images',
        },
        pages: {
          type: 'array',
          items: {
            type: 'number',
            minimum: 1,
          },
          description: 'Specific page numbers to render (only used in images/hybrid mode)',
        },
      },
      required: ['url'],
    },
  },
];

// Handle list_tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle call_tool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'fetch_and_parse_pdf') {
      // Validate input
      const validatedInput = FetchAndParsePDFSchema.parse(args);
      
      // Execute tool
      const result = await handleFetchAndParsePDF(validatedInput);
      
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } else {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${errorMessage}`
    );
  }
});

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
