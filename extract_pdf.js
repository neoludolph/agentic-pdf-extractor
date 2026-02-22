/**
 * Agentic-PDF-Extractor for AI Agents
 *
 * Core module for extracting text and images from PDF files.
 * Designed to provide structured output that AI agents in IDEs can consume.
 */

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import * as mupdf from "mupdf";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

/**
 * Extract text from a PDF file, page by page.
 *
 * @param {string} pdfPath - Absolute path to the PDF file
 * @returns {Promise<{totalPages: number, pages: Array<{page: number, text: string}>}>}
 */
export async function extractText(pdfPath) {
    const absolutePath = path.resolve(pdfPath);

    if (!fs.existsSync(absolutePath)) {
        throw new Error(`PDF file not found: ${absolutePath}`);
    }

    const dataBuffer = fs.readFileSync(absolutePath);

    // Get metadata with pdf-parse
    let metadata = {};
    try {
        const data = await PDFParse(dataBuffer);
        metadata = data.info || {};
    } catch {
        // pdf-parse may fail on some PDFs, continue with mupdf
    }

    // Also extract page-by-page using mupdf for more granular control
    const doc = mupdf.Document.openDocument(dataBuffer, "application/pdf");
    const totalPages = doc.countPages();
    const pages = [];

    for (let i = 0; i < totalPages; i++) {
        const page = doc.loadPage(i);
        const text = page.toStructuredText("preserve-whitespace").asText();
        pages.push({
            page: i + 1,
            text: text.trim(),
        });
    }

    return {
        file: absolutePath,
        totalPages,
        metadata: {
            title: metadata.Title || null,
            author: metadata.Author || null,
            subject: metadata.Subject || null,
            creator: metadata.Creator || null,
            producer: metadata.Producer || null,
            creationDate: metadata.CreationDate || null,
            modDate: metadata.ModDate || null,
        },
        pages,
    };
}

/**
 * Extract images from a PDF file.
 *
 * @param {string} pdfPath - Absolute path to the PDF file
 * @param {object} options
 * @param {string} [options.outputDir] - Directory to save images to (default: same directory as PDF)
 * @param {"png"|"jpeg"} [options.format="png"] - Image format
 * @param {boolean} [options.base64=false] - If true, return base64-encoded images instead of saving to disk
 * @param {number} [options.dpi=150] - Resolution for page rendering
 * @returns {Promise<Array<{page: number, imageIndex: number, width: number, height: number, path?: string, base64?: string}>>}
 */
export async function extractImages(pdfPath, options = {}) {
    const absolutePath = path.resolve(pdfPath);

    if (!fs.existsSync(absolutePath)) {
        throw new Error(`PDF file not found: ${absolutePath}`);
    }

    const {
        outputDir = path.dirname(absolutePath),
        format = "png",
        base64: returnBase64 = false,
        dpi = 150,
    } = options;

    const dataBuffer = fs.readFileSync(absolutePath);
    const doc = mupdf.Document.openDocument(dataBuffer, "application/pdf");
    const totalPages = doc.countPages();
    const images = [];

    // Ensure output directory exists
    if (!returnBase64) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const pdfBaseName = path.basename(absolutePath, path.extname(absolutePath));
    const scale = dpi / 72; // PDF default is 72 DPI

    for (let i = 0; i < totalPages; i++) {
        const page = doc.loadPage(i);

        // Render the full page as an image
        const pixmap = page.toPixmap(
            mupdf.Matrix.scale(scale, scale),
            mupdf.ColorSpace.DeviceRGB,
            false, // no alpha
            true   // annots
        );

        const width = pixmap.getWidth();
        const height = pixmap.getHeight();

        let imgBuffer;
        if (format === "jpeg") {
            imgBuffer = pixmap.asJPEG(85);
        } else {
            imgBuffer = pixmap.asPNG();
        }

        const imageInfo = {
            page: i + 1,
            imageIndex: 0,
            width,
            height,
            format,
        };

        if (returnBase64) {
            imageInfo.base64 = Buffer.from(imgBuffer).toString("base64");
            imageInfo.mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
        } else {
            const ext = format === "jpeg" ? "jpg" : "png";
            const fileName = `${pdfBaseName}_page_${i + 1}.${ext}`;
            const filePath = path.join(outputDir, fileName);
            fs.writeFileSync(filePath, imgBuffer);
            imageInfo.path = filePath;
        }

        images.push(imageInfo);

        // Also try to extract embedded images from the page
        try {
            const embeddedImages = extractEmbeddedImages(page, i, pdfBaseName, {
                outputDir,
                format,
                returnBase64,
            });
            images.push(...embeddedImages);
        } catch {
            // Some pages may not have extractable embedded images
        }
    }

    return {
        file: absolutePath,
        totalPages,
        totalImages: images.length,
        images,
    };
}

/**
 * Try to extract embedded images from a PDF page using structured text.
 */
function extractEmbeddedImages(page, pageIndex, pdfBaseName, options) {
    const images = [];
    const stext = page.toStructuredText("preserve-images");
    let imageIndex = 1;

    // Walk through structured text blocks to find image blocks
    stext.walk({
        onImageBlock(bbox, transform, image) {
            try {
                const pixmap = image.toPixmap();
                const width = pixmap.getWidth();
                const height = pixmap.getHeight();

                let imgBuffer;
                if (options.format === "jpeg") {
                    imgBuffer = pixmap.asJPEG(85);
                } else {
                    imgBuffer = pixmap.asPNG();
                }

                const imageInfo = {
                    page: pageIndex + 1,
                    imageIndex,
                    width,
                    height,
                    format: options.format,
                    type: "embedded",
                    bbox: {
                        x: bbox[0],
                        y: bbox[1],
                        w: bbox[2] - bbox[0],
                        h: bbox[3] - bbox[1],
                    },
                };

                if (options.returnBase64) {
                    imageInfo.base64 = Buffer.from(imgBuffer).toString("base64");
                    imageInfo.mimeType =
                        options.format === "jpeg" ? "image/jpeg" : "image/png";
                } else {
                    const ext = options.format === "jpeg" ? "jpg" : "png";
                    const fileName = `${pdfBaseName}_page_${pageIndex + 1}_img_${imageIndex}.${ext}`;
                    const filePath = path.join(options.outputDir, fileName);
                    fs.writeFileSync(filePath, imgBuffer);
                    imageInfo.path = filePath;
                }

                images.push(imageInfo);
                imageIndex++;
            } catch {
                // Skip images that can't be extracted
            }
        },
    });

    return images;
}

/**
 * Extract everything (text + images) from a PDF.
 *
 * @param {string} pdfPath - Absolute path to the PDF file
 * @param {object} options - Same options as extractImages
 * @returns {Promise<object>}
 */
export async function extractAll(pdfPath, options = {}) {
    const [textResult, imageResult] = await Promise.all([
        extractText(pdfPath),
        extractImages(pdfPath, options),
    ]);

    return {
        file: textResult.file,
        totalPages: textResult.totalPages,
        metadata: textResult.metadata,
        pages: textResult.pages.map((p) => {
            const pageImages = imageResult.images.filter(
                (img) => img.page === p.page
            );
            return {
                ...p,
                images: pageImages,
            };
        }),
        totalImages: imageResult.totalImages,
    };
}
