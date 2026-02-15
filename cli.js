#!/usr/bin/env node

/**
 * FIFI - CLI for PDF Content Extraction
 *
 * Usage:
 *   node cli.js text <pdf-path>          Extract text from a PDF
 *   node cli.js images <pdf-path>        Extract images from a PDF
 *   node cli.js all <pdf-path>           Extract text + images from a PDF
 *   node cli.js serve                    Start MCP server
 *
 * Options:
 *   --output-dir, -o   Directory for extracted images
 *   --format, -f       Image format: png or jpeg (default: png)
 *   --dpi, -d          DPI for image rendering (default: 150)
 *   --base64, -b       Output images as base64 (default: false)
 *   --json, -j         Output as JSON (default: false)
 */

import { extractText, extractImages, extractAll } from "./extract_pdf.js";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(args) {
    const parsed = {
        command: null,
        pdfPath: null,
        outputDir: null,
        format: "png",
        dpi: 150,
        base64: false,
        json: false,
    };

    let i = 0;
    while (i < args.length) {
        const arg = args[i];

        if (!parsed.command && !arg.startsWith("-")) {
            parsed.command = arg;
            i++;
            continue;
        }

        if (!parsed.pdfPath && !arg.startsWith("-") && parsed.command) {
            parsed.pdfPath = arg;
            i++;
            continue;
        }

        switch (arg) {
            case "--output-dir":
            case "-o":
                parsed.outputDir = args[++i];
                break;
            case "--format":
            case "-f":
                parsed.format = args[++i];
                break;
            case "--dpi":
            case "-d":
                parsed.dpi = parseInt(args[++i], 10);
                break;
            case "--base64":
            case "-b":
                parsed.base64 = true;
                break;
            case "--json":
            case "-j":
                parsed.json = true;
                break;
        }
        i++;
    }

    return parsed;
}

function printHelp() {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                🔍 FIFI - PDF Content Extractor               ║
║          Extract text & images from PDFs for AI Agents        ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
  node cli.js <command> <pdf-path> [options]

Commands:
  text     Extract text from all pages of a PDF
  images   Extract/render images from a PDF
  all      Extract text + images together
  serve    Start the MCP server for AI agent integration

Options:
  -o, --output-dir  Directory for extracted images (default: PDF's directory)
  -f, --format      Image format: png | jpeg (default: png)
  -d, --dpi         DPI for rendering (default: 150)
  -b, --base64      Return images as base64 strings
  -j, --json        Output results as JSON

Examples:
  node cli.js text document.pdf
  node cli.js images report.pdf -o ./images -f jpeg -d 300
  node cli.js all presentation.pdf --json
  node cli.js serve
`);
}

function formatTextOutput(result) {
    let output = "";
    output += `\n📄 PDF: ${result.file}\n`;
    output += `${"━".repeat(60)}\n`;
    output += `Pages: ${result.totalPages}\n`;

    if (result.metadata.title) output += `Title: ${result.metadata.title}\n`;
    if (result.metadata.author) output += `Author: ${result.metadata.author}\n`;

    output += `\n`;

    for (const page of result.pages) {
        output += `── Page ${page.page} ${"─".repeat(45)}\n`;
        output += `${page.text || "(empty page)"}\n\n`;
    }

    return output;
}

function formatImagesOutput(result) {
    let output = "";
    output += `\n🖼️ Images from: ${result.file}\n`;
    output += `${"━".repeat(60)}\n`;
    output += `Pages: ${result.totalPages}\n`;
    output += `Images: ${result.totalImages}\n\n`;

    for (const img of result.images) {
        const type =
            img.type === "embedded"
                ? `embedded img #${img.imageIndex}`
                : `full page`;
        output += `  • Page ${img.page} (${type}): ${img.width}×${img.height}px`;
        if (img.path) output += ` → ${img.path}`;
        output += `\n`;
    }

    return output;
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
        printHelp();
        process.exit(0);
    }

    const opts = parseArgs(args);

    try {
        switch (opts.command) {
            case "text": {
                if (!opts.pdfPath) {
                    console.error("Error: Please provide a PDF file path.");
                    process.exit(1);
                }
                const result = await extractText(opts.pdfPath);
                if (opts.json) {
                    console.log(JSON.stringify(result, null, 2));
                } else {
                    console.log(formatTextOutput(result));
                }
                break;
            }

            case "images": {
                if (!opts.pdfPath) {
                    console.error("Error: Please provide a PDF file path.");
                    process.exit(1);
                }
                const result = await extractImages(opts.pdfPath, {
                    outputDir: opts.outputDir,
                    format: opts.format,
                    base64: opts.base64,
                    dpi: opts.dpi,
                });
                if (opts.json) {
                    console.log(JSON.stringify(result, null, 2));
                } else {
                    console.log(formatImagesOutput(result));
                }
                break;
            }

            case "all": {
                if (!opts.pdfPath) {
                    console.error("Error: Please provide a PDF file path.");
                    process.exit(1);
                }
                const result = await extractAll(opts.pdfPath, {
                    outputDir: opts.outputDir,
                    format: opts.format,
                    base64: opts.base64,
                    dpi: opts.dpi,
                });
                if (opts.json) {
                    console.log(JSON.stringify(result, null, 2));
                } else {
                    console.log(formatTextOutput(result));
                    console.log(
                        formatImagesOutput({
                            file: result.file,
                            totalPages: result.totalPages,
                            totalImages: result.totalImages,
                            images: result.pages.flatMap((p) => p.images || []),
                        })
                    );
                }
                break;
            }

            case "serve": {
                // Import and run the MCP server
                await import("./server.js");
                break;
            }

            default:
                console.error(`Unknown command: ${opts.command}`);
                printHelp();
                process.exit(1);
        }
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

main();
