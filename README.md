# 🔍 FIFI - PDF Content Extractor for AI Agents

**FIFI** ermöglicht es AI Agents in IDEs (wie Antigravity, Cursor, etc.) PDF-Inhalte inklusive Bilder auszulesen. Die App stellt einen **MCP-Server** bereit und kann auch als **CLI-Tool** genutzt werden.

## ✨ Features

- **Text-Extraktion** – Seitenweiser Text aus PDFs mit Metadaten
- **Bild-Extraktion** – Seiten als Bilder rendern + eingebettete Bilder extrahieren
- **MCP-Server** – Nahtlose Integration in AI-Agents via Model Context Protocol
- **CLI-Tool** – Direkter Zugriff über die Kommandozeile
- **Base64-Modus** – Bilder direkt als Base64 zurückgeben (ideal für AI Agents)
- **Konfigurierbar** – DPI, Format (PNG/JPEG), Output-Verzeichnis

## 🚀 Installation

```bash
npm install
```

## 🤖 MCP Server (für AI Agents)

### Server starten

```bash
npm start
# oder
node server.js
```

### In IDE konfigurieren

Füge folgende Konfiguration in deine MCP-Settings ein (z.B. `.vscode/mcp.json`, `~/.cursor/mcp.json`, etc.):

```json
{
  "mcpServers": {
    "fifi-pdf-reader": {
      "command": "node",
      "args": ["<absoluter-pfad-zu>/fifi/server.js"]
    }
  }
}
```

### Verfügbare MCP Tools

| Tool | Beschreibung |
|------|-------------|
| `extract_pdf_text` | Extrahiert allen Text seitenweise aus einem PDF |
| `extract_pdf_images` | Extrahiert/rendert Bilder aus einem PDF |
| `extract_pdf_all` | Extrahiert Text + Bilder komplett |

## 💻 CLI Nutzung

```bash
# Text extrahieren
node cli.js text dokument.pdf

# Bilder extrahieren
node cli.js images bericht.pdf -o ./bilder -f jpeg -d 300

# Alles extrahieren (Text + Bilder)
node cli.js all praesentation.pdf --json

# MCP Server starten
node cli.js serve
```

### CLI Optionen

| Option | Kurz | Beschreibung |
|--------|------|-------------|
| `--output-dir` | `-o` | Verzeichnis für extrahierte Bilder |
| `--format` | `-f` | Bildformat: `png` oder `jpeg` |
| `--dpi` | `-d` | Auflösung (Standard: 150 DPI) |
| `--base64` | `-b` | Bilder als Base64-Strings ausgeben |
| `--json` | `-j` | Ausgabe als JSON |

## 📁 Projektstruktur

```
fifi/
├── extract_pdf.js   # Core: Text- & Bild-Extraktion
├── server.js        # MCP Server
├── cli.js           # CLI Interface
├── package.json
└── README.md
```

## 🔧 Wie es funktioniert

1. **Text-Extraktion**: Nutzt `pdf-parse` und `mupdf` für zuverlässige Textextraktion
2. **Bild-Extraktion**: `mupdf` rendert jede Seite als Bild und extrahiert eingebettete Bilder
3. **MCP-Protokoll**: Der Server kommuniziert via stdio mit dem AI Agent und stellt strukturierte Daten bereit

## 📋 Beispiel-Output (Text)

```
📄 PDF: C:\Users\example\document.pdf
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pages: 3
Title: Mein Dokument
Author: Max Mustermann

── Page 1 ─────────────────────────────
Lorem ipsum dolor sit amet...

── Page 2 ─────────────────────────────
Weitere Inhalte...
```
