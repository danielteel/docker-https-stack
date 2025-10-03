const sharp = require('sharp');

/**
 * Combine multiple JPEG buffers into one tall JPEG,
 * scaling each to the max width.
 *
 * @param {Buffer[]} buffers
 * @returns {Buffer}
 */
async function stackVertically(buffers) {
  // Get metadata
  const metas = await Promise.all(buffers.map(b => sharp(b).metadata()));
  const maxWidth = Math.max(...metas.map(m => m.width));

  // Resize each buffer to maxWidth (aspect ratio preserved)
  const resizedBuffers = await Promise.all(
    buffers.map(b => sharp(b).resize({ width: maxWidth }).toBuffer())
  );

  // Get new heights after resizing
  const newMetas = await Promise.all(resizedBuffers.map(b => sharp(b).metadata()));
  const totalHeight = newMetas.reduce((sum, m) => sum + m.height, 0);

  // Build composite operations
  let yOffset = 0;
  const compositeOps = resizedBuffers.map((buf, i) => {
    const op = { input: buf, top: yOffset, left: 0 };
    yOffset += newMetas[i].height;
    return op;
  });

  // Create final canvas and composite
  return await sharp({
    create: {
      width: maxWidth,
      height: totalHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
    .composite(compositeOps)
    .jpeg()
    .toBuffer();
}

module.exports = { stackVertically };