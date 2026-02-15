#!/usr/bin/env node

/**
 * FIFI - MCP Server for PDF Content Extraction
 *
 * Provides PDF reading capabilities to AI agents via Model Context Protocol.
 * Supports extracting text, images, and full content from PDF files.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { extractText, extractImages, extractAll } from "./extract_pdf.js";

const server = new McpServer({
    name: "fifi-pdf-reader",
    version: "1.0.0",
});

// ─────────────────────────────────────────────
// Tool: extract_pdf_text
// ─────────────────────────────────────────────
server.tool(
    "extract_pdf_text",
    "Extract all text from a PDF file, organized page by page. " +
    "Returns metadata (title, author, etc.) and text for each page. " +
    "Use this when you need to read the text content of a PDF document.",
    {
        pdfPath: z
            .string()
            .describe("Absolute path to the PDF file to extract text from"),
    },
    async ({ pdfPath }) => {
        try {
            const result = await extractText(pdfPath);

            // Format as readable text for the AI agent
            let output = `📄 PDF Text Extraction: ${result.file}\n`;
            output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            output += `Total Pages: ${result.totalPages}\n`;

            if (result.metadata.title) output += `Title: ${result.metadata.title}\n`;
            if (result.metadata.author)
                output += `Author: ${result.metadata.author}\n`;
            if (result.metadata.subject)
                output += `Subject: ${result.metadata.subject}\n`;

            output += `\n`;

            for (const page of result.pages) {
                output += `── Page ${page.page} ──────────────────────\n`;
                output += page.text || "(empty page)";
                output += `\n\n`;
            }

            return {
                content: [{ type: "text", text: output }],
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// ─────────────────────────────────────────────
// Tool: extract_pdf_images
// ─────────────────────────────────────────────
server.tool(
    "extract_pdf_images",
    "Extract images from a PDF file. Can render each page as an image and/or extract embedded images. " +
    "Returns images as base64-encoded data or saves them to disk. " +
    "Use this when you need to see visual content (charts, diagrams, photos) in a PDF.",
    {
        pdfPath: z
            .string()
            .describe("Absolute path to the PDF file to extract images from"),
        outputDir: z
            .string()
            .optional()
            .describe(
                "Directory to save images to. Defaults to same directory as the PDF."
            ),
        format: z
            .enum(["png", "jpeg"])
            .optional()
            .default("png")
            .describe("Image format: png or jpeg"),
        returnBase64: z
            .boolean()
            .optional()
            .default(false)
            .describe(
                "If true, return base64-encoded images in the response instead of saving to disk"
            ),
        dpi: z
            .number()
            .optional()
            .default(150)
            .describe("Resolution for rendering pages as images (default: 150 DPI)"),
    },
    async ({ pdfPath, outputDir, format, returnBase64, dpi }) => {
        try {
            const result = await extractImages(pdfPath, {
                outputDir,
                format,
                base64: returnBase64,
                dpi,
            });

            const content = [];

            let summary = `🖼️ PDF Image Extraction: ${result.file}\n`;
            summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            summary += `Total Pages: ${result.totalPages}\n`;
            summary += `Total Images Extracted: ${result.totalImages}\n\n`;

            for (const img of result.images) {
                summary += `• Page ${img.page}`;
                if (img.type === "embedded") {
                    summary += ` (embedded image #${img.imageIndex})`;
                } else {
                    summary += ` (full page render)`;
                }
                summary += `: ${img.width}×${img.height}px`;
                if (img.path) {
                    summary += ` → ${img.path}`;
                }
                summary += `\n`;
            }

            content.push({ type: "text", text: summary });

            // If base64 mode, also include images as image content
            if (returnBase64) {
                for (const img of result.images) {
                    if (img.base64) {
                        content.push({
                            type: "image",
                            data: img.base64,
                            mimeType: img.mimeType,
                        });
                    }
                }
            }

            return { content };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// ─────────────────────────────────────────────
// Tool: extract_pdf_all
// ─────────────────────────────────────────────
server.tool(
    "extract_pdf_all",
    "Extract ALL content (text + images) from a PDF file. " +
    "Returns text for each page along with associated images. " +
    "Use this for a complete understanding of a PDF document.",
    {
        pdfPath: z
            .string()
            .describe("Absolute path to the PDF file to extract from"),
        outputDir: z
            .string()
            .optional()
            .describe("Directory to save images to"),
        format: z
            .enum(["png", "jpeg"])
            .optional()
            .default("png")
            .describe("Image format"),
        dpi: z
            .number()
            .optional()
            .default(150)
            .describe("Resolution for page images (default: 150 DPI)"),
    },
    async ({ pdfPath, outputDir, format, dpi }) => {
        try {
            const result = await extractAll(pdfPath, {
                outputDir,
                format,
                base64: true,
                dpi,
            });

            const content = [];

            let summary = `📄🖼️ Full PDF Extraction: ${result.file}\n`;
            summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            summary += `Total Pages: ${result.totalPages}\n`;
            summary += `Total Images: ${result.totalImages}\n`;

            if (result.metadata.title)
                summary += `Title: ${result.metadata.title}\n`;
            if (result.metadata.author)
                summary += `Author: ${result.metadata.author}\n`;

            summary += `\n`;

            content.push({ type: "text", text: summary });

            for (const page of result.pages) {
                let pageText = `── Page ${page.page} ──────────────────────\n`;
                pageText += page.text || "(empty page)";
                pageText += `\n`;

                if (page.images && page.images.length > 0) {
                    pageText += `\n[${page.images.length} image(s) on this page]\n`;
                }

                content.push({ type: "text", text: pageText });

                // Include rendered page images inline
                if (page.images) {
                    for (const img of page.images) {
                        if (img.base64) {
                            content.push({
                                type: "image",
                                data: img.base64,
                                mimeType: img.mimeType,
                            });
                        }
                    }
                }
            }

            return { content };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// ─────────────────────────────────────────────
// Start the server
// ─────────────────────────────────────────────
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 FIFI PDF Reader MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
