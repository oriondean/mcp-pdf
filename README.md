# PDF MCP Server

An MCP (Model Context Protocol) server that fetches PDFs from URLs and intelligently parses them for optimal AI consumption. Supports text extraction, image rendering, and hybrid modes.

## Features

- **Multiple Processing Modes**:
  - 🔤 **Text Mode**: Fast text extraction for text-heavy documents
  - 🖼️ **Images Mode**: Renders all pages as high-quality images
  - 🔄 **Hybrid Mode**: Extracts text + renders visual pages (charts, diagrams)
  - 🤖 **Auto Mode**: Intelligently detects the best approach based on content

- **Smart Document Analysis**: Automatically identifies pages with visual content
- **Configurable Quality**: Adjustable DPI (72-300) for image rendering
- **Metadata Extraction**: Extracts PDF title, author, page count, and more
- **Security**: URL validation, file size limits, and timeout protection

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Development

```bash
# Run in development mode
npm run dev

# Watch mode (auto-rebuild on changes)
npm run watch
```

## Usage

### As an MCP Server

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "pdf-parser": {
      "command": "node",
      "args": ["C:\\dev\\aii-mcp-example\\dist\\index.js"]
    }
  }
}
```

Or in development mode:

```json
{
  "mcpServers": {
    "pdf-parser": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "C:\\dev\\aii-mcp-example"
    }
  }
}
```

### Tool: fetch_and_parse_pdf

Fetches a PDF from a URL and parses it according to the specified mode.

**Parameters:**

- `url` (required): URL of the PDF to fetch
- `mode` (optional): Processing mode - `"text"`, `"images"`, `"hybrid"`, or `"auto"` (default: `"auto"`)
- `dpi` (optional): Image rendering quality, 72-300 (default: `150`)
- `maxPages` (optional): Maximum pages to render as images, 1-100 (default: `50`)
- `pages` (optional): Array of specific page numbers to render

**Examples:**

```typescript
// Auto mode - intelligently detects best approach
{
  "url": "https://example.com/document.pdf"
}

// Text-only extraction
{
  "url": "https://example.com/report.pdf",
  "mode": "text"
}

// Render all pages as images
{
  "url": "https://example.com/slides.pdf",
  "mode": "images",
  "dpi": 200,
  "maxPages": 20
}

// Hybrid mode with specific pages
{
  "url": "https://example.com/report.pdf",
  "mode": "hybrid",
  "pages": [1, 5, 10]
}
```

## How It Works

### Mode Selection Logic

**Auto Mode** analyzes the document and selects:
- **Text Mode**: For documents with high text density and no visual elements
- **Images Mode**: For documents with >50% visual pages or very low text density
- **Hybrid Mode**: For mixed-content documents (text + charts/diagrams)

### Hybrid Mode Intelligence

In hybrid mode, the tool:
1. Extracts all text content
2. Analyzes each page to detect visual elements (images, charts, low text density)
3. Selectively renders only pages with important visual content
4. Returns both text and images for optimal AI understanding

### Performance Considerations

- **Text extraction**: <1s for most PDFs
- **Image rendering**: ~500ms per page
- **Memory usage**: ~200MB for typical documents
- **Maximum file size**: 50MB (configurable)
- **Request timeout**: 30 seconds

## Architecture

```
src/
├── index.ts              # MCP server entry point
├── tools/
│   └── pdfTool.ts        # PDF tool implementation
├── utils/
│   ├── fetcher.ts        # URL fetching with validation
│   ├── pdfParser.ts      # Text extraction (PDF.js)
│   ├── pdfRenderer.ts    # Image rendering (Canvas)
│   └── documentAnalyzer.ts # Intelligent content detection
└── types/
    └── index.ts          # TypeScript type definitions
```

## Technologies

- **[@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol)**: MCP server framework
- **[PDF.js](https://mozilla.github.io/pdf.js/)**: PDF parsing and text extraction
- **[node-canvas](https://github.com/Automattic/node-canvas)**: Server-side canvas for rendering
- **[Zod](https://zod.dev/)**: Runtime type validation
- **TypeScript**: Type-safe development

## Security Features

- ✅ URL protocol validation (HTTP/HTTPS only)
- ✅ File size limits (default 50MB)
- ✅ Request timeouts (30 seconds)
- ✅ Content-Type verification
- ✅ Input validation with Zod schemas

## Error Handling

The server provides detailed error messages for:
- Invalid URLs
- Network failures
- Timeout errors
- PDF parsing errors
- File size violations
- Unsupported content types

## Limitations

- Maximum file size: 50MB
- Maximum pages for rendering: 100
- Supported protocols: HTTP, HTTPS only
- Image format: PNG (base64 encoded)

## Use Cases

- 📄 **Research Papers**: Hybrid mode extracts text + renders figures
- 📊 **Financial Reports**: Hybrid mode for text + charts
- 📝 **Text Documents**: Text mode for fast, efficient extraction
- 🎨 **Presentations**: Images mode for slide decks
- 📋 **Forms**: Images mode to preserve layout
- 📚 **eBooks**: Text mode for optimal reading

## License

MIT

## Contributing

Contributions welcome! Please ensure TypeScript compilation succeeds and follow existing code style.
