# Agentic-PDF-Extractor

**Agentic-PDF-Extractor** enables AI Agents in IDEs (like Antigravity, Cursor, etc.) to read PDF content including images. The app provides an **MCP server** and can also be used as a **CLI tool**.

## Features

- **Text Extraction** – Page-by-page text from PDFs with metadata
- **Image Extraction** – Render pages as images + extract embedded images
- **MCP Server** – Seamless integration into AI Agents via Model Context Protocol
- **CLI Tool** – Direct access via command line
- **Base64 Mode** – Return images directly as Base64 (ideal for AI Agents)
- **Configurable** – DPI, format (PNG/JPEG), output directory

## Installation

```bash
npm install
```

## MCP Server (for AI Agents)

### Start Server

```bash
npm start
# or
node server.js
```

### Configure in IDE

Add the following configuration into your MCP settings (e.g. `.vscode/mcp.json`, `~/.cursor/mcp.json`, etc.):

```json
{
  "mcpServers": {
    "agentic-pdf-extractor": {
      "command": "node",
      "args": ["<absolute-path-to>/pdf-extractor-mcp/server.js"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `extract_pdf_text` | Extracts all text page-by-page from a PDF |
| `extract_pdf_images` | Extracts/renders images from a PDF |
| `extract_pdf_all` | Extracts text + images completely |

## CLI Usage

```bash
# Extract text
node cli.js text dokument.pdf

# Extract images
node cli.js images report.pdf -o ./images -f jpeg -d 300

# Extract everything (text + images)
node cli.js all presentation.pdf --json

# Start MCP Server
node cli.js serve
```

### CLI Options

| Option | Short | Description |
|--------|------|-------------|
| `--output-dir` | `-o` | Directory for extracted images |
| `--format` | `-f` | Image format: `png` or `jpeg` |
| `--dpi` | `-d` | Resolution (Standard: 150 DPI) |
| `--base64` | `-b` | Output images as Base64 strings |
| `--json` | `-j` | Output as JSON |

## Project Structure

```
pdf-extractor-mcp/
├── extract_pdf.js   # Core: Text & image extraction
├── server.js        # MCP Server
├── cli.js           # CLI Interface
├── package.json
└── README.md
```

## How it works

1. **Text Extraction**: Uses `pdf-parse` and `mupdf` for reliable text extraction
2. **Image Extraction**: `mupdf` renders each page as an image and extracts embedded images
3. **MCP Protocol**: The server communicates via stdio with the AI Agent and provides structured data

## Example Output (Text)

```
PDF: C:\Users\example\document.pdf
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pages: 3
Title: My Document
Author: John Doe

── Page 1 ─────────────────────────────
Lorem ipsum dolor sit amet...

── Page 2 ─────────────────────────────
Further content...
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
