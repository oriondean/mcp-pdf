import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server
const serverPath = join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

console.log('🚀 Starting MCP server test...\n');

let responseBuffer = '';

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  // Try to parse complete JSON-RPC messages
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('📨 Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('📝 Server output:', line);
      }
    }
  });
});

// Test 1: Initialize
console.log('Test 1: Sending initialize request...');
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};
server.stdin.write(JSON.stringify(initRequest) + '\n');

// Test 2: List tools
setTimeout(() => {
  console.log('\nTest 2: Listing available tools...');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

// Test 3: Call the PDF tool with a test URL (will fail but shows the tool responds)
setTimeout(() => {
  console.log('\nTest 3: Testing fetch_and_parse_pdf tool (with invalid URL)...');
  const callToolRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'fetch_and_parse_pdf',
      arguments: {
        url: 'https://httpbin.org/status/404', // Test URL that returns 404
        mode: 'text'
      }
    }
  };
  server.stdin.write(JSON.stringify(callToolRequest) + '\n');
}, 2000);

// Cleanup after tests
setTimeout(() => {
  console.log('\n✅ Tests completed. Shutting down server...');
  server.kill();
  process.exit(0);
}, 5000);

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Server exited with code ${code}`);
  }
});
