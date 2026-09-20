import "server-only";
import sharp from "sharp";

/**
 * The image API leaves a light glow in the color channels of fully transparent pixels.
 * Invisible in most apps, but some viewers and resizers let it bleed as a halo, so blank it.
 */
export async function clearTransparentPixels(png: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}
