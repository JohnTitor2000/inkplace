export type DecodedBmp = {
  width: number
  height: number
  rgba: Uint8ClampedArray
}

export function decodeBmp(buffer: ArrayBuffer): DecodedBmp | null {
  if (buffer.byteLength < 54) return null
  const view = new DataView(buffer)
  if (view.getUint16(0, true) !== 0x4d42) return null
  const pixelOffset = view.getUint32(10, true)
  const width = view.getInt32(18, true)
  let height = view.getInt32(22, true)
  const bpp = view.getUint16(28, true)
  const compression = view.getUint32(30, true)
  if (compression !== 0 || (bpp !== 24 && bpp !== 32)) return null
  const topDown = height < 0
  height = Math.abs(height)
  if (width <= 0 || height <= 0 || width > 8000 || height > 8000) return null
  const bytesPerPixel = bpp / 8
  const rowStride = Math.floor((bpp * width + 31) / 32) * 4
  if (pixelOffset + rowStride * height > buffer.byteLength) return null
  const bytes = new Uint8Array(buffer)
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    const srcY = topDown ? y : height - 1 - y
    const rowStart = pixelOffset + srcY * rowStride
    for (let x = 0; x < width; x++) {
      const i = rowStart + x * bytesPerPixel
      const o = (y * width + x) * 4
      rgba[o] = bytes[i + 2]
      rgba[o + 1] = bytes[i + 1]
      rgba[o + 2] = bytes[i]
      rgba[o + 3] = bpp === 32 ? bytes[i + 3] : 255
    }
  }
  return { width, height, rgba }
}
