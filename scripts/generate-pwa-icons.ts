import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

function makeChunk(type: string, data: Buffer): Buffer {
  const len = data.length
  const buf = Buffer.alloc(8 + len + 4)
  buf.writeUInt32BE(len, 0)
  buf.write(type, 4, 4, 'ascii')
  data.copy(buf, 8)
  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]))
  buf.writeUInt32BE(crc, 8 + len)
  return buf
}

let crcTable: Uint32Array | null = null
function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable
  crcTable = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1)
      else c = c >>> 1
    }
    crcTable[n] = c
  }
  return crcTable
}

function crc32(buf: Buffer): number {
  const table = getCrcTable()
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ (buf[i] ?? 0)) & 0xff]! ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function createPng(
  width: number,
  height: number,
  getPixel: (x: number, y: number, w: number, h: number) => [number, number, number, number]
): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // RGBA
  ihdrData[10] = 0 // deflate
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // no interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData)

  const rowStride = 1 + width * 4
  const rawData = Buffer.alloc(height * rowStride)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride
    rawData[rowOffset] = 0 // filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height)
      const pxOffset = rowOffset + 1 + x * 4
      rawData[pxOffset] = r
      rawData[pxOffset + 1] = g
      rawData[pxOffset + 2] = b
      rawData[pxOffset + 3] = a
    }
  }

  const idatCompressed = zlib.deflateSync(rawData)
  const idatChunk = makeChunk('IDAT', idatCompressed)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk])
}

// Brand Colors:
// Pine Emerald Deep: #0f3f35 (15, 63, 53)
// Pine Emerald: #17594d (23, 89, 77)
// Mint/Accent: #34d399 (52, 211, 153)
// Terracotta / Ochre: #ba5d3a (186, 93, 58)
// White: #ffffff (255, 255, 255)

function drawSuperHosurIcon(x: number, y: number, w: number, h: number, isMaskable: boolean): [number, number, number, number] {
  // Normalize coords to [-1, 1]
  const nx = (x / w) * 2 - 1
  const ny = (y / h) * 2 - 1

  // Background: Forest Emerald gradient
  const distFromCenter = Math.sqrt(nx * nx + ny * ny)
  const cornerRadius = isMaskable ? 2.0 : 0.78 // circular or squircle for 'any', full bleed for 'maskable'

  const bgR = Math.round(15 + (23 - 15) * ((ny + 1) / 2))
  const bgG = Math.round(63 + (89 - 63) * ((ny + 1) / 2))
  const bgB = Math.round(53 + (77 - 53) * ((ny + 1) / 2))
  const bgA = 255

  if (!isMaskable) {
    // Rounded squircle badge for 'any' icon
    const sqDist = Math.pow(Math.abs(nx), 4) + Math.pow(Math.abs(ny), 4)
    if (sqDist > Math.pow(cornerRadius, 4)) {
      return [0, 0, 0, 0] // transparent outer
    }
  }

  // Draw stylized 'S' & 'H' emblem in safe zone
  // Safe zone radius: 0.55
  const scale = isMaskable ? 0.65 : 0.78
  const sx = nx / scale
  const sy = ny / scale

  // Central emblem: Stylized bold 'S' ribbon
  // S top curve: center at (0, -0.32), r ~ 0.28
  // S bottom curve: center at (0, 0.32), r ~ 0.28
  const topDist = Math.hypot(sx, sy + 0.30)
  const botDist = Math.hypot(sx, sy - 0.30)

  const isTopArc = topDist >= 0.18 && topDist <= 0.44 && (sy < -0.05 || sx < 0.1)
  const isBotArc = botDist >= 0.18 && botDist <= 0.44 && (sy > 0.05 || sx > -0.1)
  const isDiagBar = Math.abs(sx * 0.9 + sy * 0.8) <= 0.20 && Math.abs(sy) <= 0.32

  // Hosur Accent dot at top-right
  const dotDist = Math.hypot(sx - 0.46, sy + 0.50)
  const isAccentDot = dotDist <= 0.12

  if (isAccentDot) {
    // Terracotta Ochre accent
    return [220, 110, 65, 255]
  }

  if (isTopArc || isBotArc || isDiagBar) {
    // Crisp white emblem with slight mint gradient
    const mintR = Math.round(255 - 20 * (sy + 1))
    const mintG = 255
    const mintB = Math.round(240 + 15 * (sy + 1))
    return [mintR, mintG, mintB, 255]
  }

  // Subtle inner glow ring
  if (distFromCenter >= 0.70 * scale && distFromCenter <= 0.74 * scale) {
    return [Math.min(255, bgR + 35), Math.min(255, bgG + 45), Math.min(255, bgB + 40), 255]
  }

  return [bgR, bgG, bgB, bgA]
}

function generateIcons() {
  const iconsDir = path.resolve('public/icons')
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }

  // 192x192 regular
  const p192 = createPng(192, 192, (x, y, w, h) => drawSuperHosurIcon(x, y, w, h, false))
  fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), p192)
  console.log('Generated public/icons/icon-192x192.png (bytes:', p192.length, ')')

  // 512x512 regular
  const p512 = createPng(512, 512, (x, y, w, h) => drawSuperHosurIcon(x, y, w, h, false))
  fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), p512)
  console.log('Generated public/icons/icon-512x512.png (bytes:', p512.length, ')')

  // 192x192 maskable
  const m192 = createPng(192, 192, (x, y, w, h) => drawSuperHosurIcon(x, y, w, h, true))
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192x192.png'), m192)
  console.log('Generated public/icons/icon-maskable-192x192.png (bytes:', m192.length, ')')

  // 512x512 maskable
  const m512 = createPng(512, 512, (x, y, w, h) => drawSuperHosurIcon(x, y, w, h, true))
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512x512.png'), m512)
  console.log('Generated public/icons/icon-maskable-512x512.png (bytes:', m512.length, ')')
}

generateIcons()
