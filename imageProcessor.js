// imageProcessor.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Processes an image:
 * - Strips all metadata (EXIF, XMP, etc.)
 * - Changes MD5 hash by cropping 1 pixel from the bottom edge
 * - Saves as JPEG in the output directory
 *
 * @param {string} sourcePath   - Full path to source image
 * @param {string} outputDir    - Directory to store processed image
 * @returns {Promise<string>}   - Absolute path to the processed image
 */
async function processImage(sourcePath, outputDir) {
    // Generate a unique output file name
    const ext = path.extname(sourcePath);
    const baseName = path.basename(sourcePath, ext);
    const outputFileName = `${baseName}_proc_${Date.now()}.jpg`;
    const outputPath = path.join(outputDir, outputFileName);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Load image, get dimensions
    const image = sharp(sourcePath);
    const metadata = await image.metadata();

    // Process: remove metadata + crop 1 pixel row off the bottom
    await image
        .withMetadata({})           // empty object = strip all metadata
        .extract({
            left: 0,
            top: 0,
            width: metadata.width,
            height: metadata.height - 1   // cut last row
        })
        .jpeg({ quality: 90 })      // always output JPEG for consistency
        .toFile(outputPath);

    console.log(`[ImageProcessor] Processed → ${outputFileName}`);
    return outputPath;
}

module.exports = { processImage };