import { deflateSync } from "node:zlib";

export type SeedImageKind = "amenity" | "linen" | "fruit" | "scenario-room" | "opening-package" | "receipt" | "generic";

type Color = [number, number, number, number?];

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = makeCrcTable();

export function encodeSeedPhoto(kind: SeedImageKind, seedText = "") {
  const width = 960;
  const height = 640;
  const canvas = new RasterCanvas(width, height, hashText(`${kind}:${seedText}`));
  canvas.paintBase(kind);

  if (kind === "amenity") drawAmenityPhoto(canvas);
  else if (kind === "linen") drawLinenPhoto(canvas);
  else if (kind === "fruit") drawFruitPhoto(canvas);
  else if (kind === "scenario-room") drawScenarioRoomPhoto(canvas);
  else if (kind === "opening-package") drawOpeningPackagePhoto(canvas);
  else if (kind === "receipt") drawReceiptPhoto(canvas);
  else drawGenericPhoto(canvas);

  canvas.addFilmGrain(12);
  canvas.addVignette();
  return encodePng(width, height, canvas.pixels);
}

class RasterCanvas {
  readonly pixels: Buffer;

  constructor(
    readonly width: number,
    readonly height: number,
    private state: number
  ) {
    this.pixels = Buffer.alloc(width * height * 4);
  }

  random() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0xffffffff;
  }

  paintBase(kind: SeedImageKind) {
    const palettes: Record<SeedImageKind, [Color, Color]> = {
      amenity: [[236, 240, 236], [198, 214, 209]],
      linen: [[231, 236, 238], [202, 214, 220]],
      fruit: [[237, 234, 220], [207, 221, 205]],
      "scenario-room": [[226, 232, 232], [196, 211, 214]],
      "opening-package": [[233, 225, 213], [201, 188, 171]],
      receipt: [[231, 235, 232], [205, 214, 211]],
      generic: [[232, 238, 238], [203, 219, 219]]
    };
    const [top, bottom] = palettes[kind];
    for (let y = 0; y < this.height; y += 1) {
      const t = y / (this.height - 1);
      const color: Color = [
        mix(top[0], bottom[0], t),
        mix(top[1], bottom[1], t),
        mix(top[2], bottom[2], t),
        255
      ];
      this.fillRect(0, y, this.width, 1, color);
    }
  }

  addFilmGrain(amount: number) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const offset = (this.random() - 0.5) * amount;
        const i = (y * this.width + x) * 4;
        this.pixels[i] = clamp(this.pixels[i] + offset);
        this.pixels[i + 1] = clamp(this.pixels[i + 1] + offset);
        this.pixels[i + 2] = clamp(this.pixels[i + 2] + offset);
      }
    }
  }

  addVignette() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxDistance = Math.hypot(cx, cy);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const d = Math.hypot(x - cx, y - cy) / maxDistance;
        const factor = 1 - Math.max(0, d - 0.45) * 0.38;
        const i = (y * this.width + x) * 4;
        this.pixels[i] = clamp(this.pixels[i] * factor);
        this.pixels[i + 1] = clamp(this.pixels[i + 1] * factor);
        this.pixels[i + 2] = clamp(this.pixels[i + 2] * factor);
      }
    }
  }

  fillRect(x: number, y: number, width: number, height: number, color: Color, alpha = 1) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + width));
    const y1 = Math.min(this.height, Math.ceil(y + height));
    for (let yy = y0; yy < y1; yy += 1) {
      for (let xx = x0; xx < x1; xx += 1) this.blendPixel(xx, yy, color, alpha);
    }
  }

  fillEllipse(cx: number, cy: number, rx: number, ry: number, color: Color, alpha = 1) {
    const x0 = Math.max(0, Math.floor(cx - rx));
    const y0 = Math.max(0, Math.floor(cy - ry));
    const x1 = Math.min(this.width, Math.ceil(cx + rx));
    const y1 = Math.min(this.height, Math.ceil(cy + ry));
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.blendPixel(x, y, color, alpha);
      }
    }
  }

  strokeLine(x1: number, y1: number, x2: number, y2: number, width: number, color: Color, alpha = 1) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let i = 0; i <= steps; i += 1) {
      const t = steps === 0 ? 0 : i / steps;
      this.fillEllipse(mix(x1, x2, t), mix(y1, y2, t), width / 2, width / 2, color, alpha);
    }
  }

  shadow(x: number, y: number, width: number, height: number, alpha = 0.18) {
    this.fillEllipse(x + width / 2, y + height, width * 0.52, Math.max(14, height * 0.12), [36, 48, 54, 255], alpha);
  }

  private blendPixel(x: number, y: number, color: Color, alpha = 1) {
    const i = (y * this.width + x) * 4;
    const a = ((color[3] ?? 255) / 255) * alpha;
    this.pixels[i] = clamp(this.pixels[i] * (1 - a) + color[0] * a);
    this.pixels[i + 1] = clamp(this.pixels[i + 1] * (1 - a) + color[1] * a);
    this.pixels[i + 2] = clamp(this.pixels[i + 2] * (1 - a) + color[2] * a);
    this.pixels[i + 3] = 255;
  }
}

function drawAmenityPhoto(canvas: RasterCanvas) {
  canvas.fillRect(0, 420, 960, 220, [198, 205, 194, 255]);
  canvas.shadow(176, 364, 560, 82, 0.22);
  canvas.fillRect(170, 330, 570, 96, [235, 238, 232, 255]);
  canvas.fillRect(192, 352, 500, 12, [204, 217, 210, 255], 0.8);
  canvas.fillRect(214, 375, 458, 10, [193, 207, 204, 255], 0.65);
  canvas.fillRect(578, 306, 78, 162, [216, 226, 220, 255]);
  canvas.fillRect(592, 306, 50, 162, [244, 247, 243, 255]);
  canvas.fillRect(596, 292, 44, 20, [80, 136, 122, 255]);
  canvas.fillRect(196, 265, 430, 58, [245, 247, 240, 255]);
  canvas.fillRect(196, 323, 76, 60, [58, 130, 117, 255]);
  canvas.fillRect(258, 282, 260, 16, [197, 226, 218, 255]);
  canvas.strokeLine(198, 220, 730, 304, 22, [218, 204, 172, 255]);
  canvas.strokeLine(205, 218, 308, 236, 42, [50, 123, 114, 255]);
  for (let x = 640; x < 748; x += 14) canvas.strokeLine(x, 222, x + 10, 268, 5, [189, 142, 74, 255], 0.9);
  canvas.fillRect(144, 452, 326, 62, [224, 232, 229, 255], 0.95);
  canvas.fillRect(158, 468, 296, 10, [174, 196, 194, 255], 0.65);
}

function drawLinenPhoto(canvas: RasterCanvas) {
  canvas.fillRect(0, 374, 960, 266, [205, 213, 214, 255]);
  canvas.fillRect(110, 250, 738, 230, [236, 240, 240, 255]);
  canvas.fillRect(110, 250, 738, 48, [218, 226, 229, 255]);
  canvas.shadow(185, 360, 590, 96, 0.18);
  canvas.fillRect(186, 308, 602, 92, [244, 246, 245, 255]);
  canvas.fillRect(210, 386, 548, 76, [226, 235, 236, 255]);
  canvas.fillRect(238, 454, 492, 58, [240, 243, 242, 255]);
  for (let y = 324; y <= 492; y += 28) canvas.strokeLine(214, y, 748, y + 10, 3, [185, 202, 207, 255], 0.42);
  for (let x = 255; x < 728; x += 74) canvas.strokeLine(x, 304, x + 18, 516, 2, [196, 210, 212, 255], 0.26);
  canvas.fillRect(290, 178, 160, 78, [248, 248, 246, 255]);
  canvas.fillRect(512, 186, 168, 74, [239, 242, 242, 255]);
}

function drawFruitPhoto(canvas: RasterCanvas) {
  canvas.fillRect(0, 406, 960, 234, [208, 218, 203, 255]);
  canvas.shadow(154, 252, 650, 220, 0.24);
  canvas.fillRect(148, 218, 664, 268, [238, 244, 239, 255], 0.86);
  canvas.fillRect(186, 250, 588, 196, [245, 250, 248, 255], 0.9);
  const fruit: Array<[number, number, number, Color]> = [
    [270, 322, 54, [236, 78, 63, 255]],
    [380, 316, 62, [244, 172, 47, 255]],
    [502, 332, 56, [248, 216, 83, 255]],
    [620, 316, 58, [103, 173, 82, 255]],
    [326, 398, 50, [238, 120, 62, 255]],
    [458, 404, 62, [226, 66, 84, 255]],
    [596, 402, 52, [246, 232, 143, 255]]
  ];
  for (const [x, y, r, color] of fruit) {
    canvas.fillEllipse(x, y, r, r * 0.74, color);
    canvas.fillEllipse(x - r * 0.24, y - r * 0.2, r * 0.28, r * 0.18, [255, 255, 255, 255], 0.28);
  }
  canvas.strokeLine(220, 244, 740, 446, 10, [255, 255, 255, 255], 0.24);
  canvas.strokeLine(710, 252, 228, 448, 8, [255, 255, 255, 255], 0.18);
}

function drawScenarioRoomPhoto(canvas: RasterCanvas) {
  canvas.fillRect(0, 0, 960, 250, [221, 229, 228, 255]);
  canvas.fillRect(0, 250, 960, 390, [206, 216, 214, 255]);
  canvas.fillRect(126, 250, 706, 226, [236, 241, 240, 255]);
  canvas.fillRect(126, 250, 706, 58, [175, 190, 195, 255]);
  canvas.fillRect(180, 312, 250, 80, [249, 248, 243, 255]);
  canvas.fillRect(526, 312, 250, 80, [249, 248, 243, 255]);
  canvas.shadow(180, 394, 596, 126, 0.2);
  canvas.fillRect(166, 380, 628, 116, [246, 247, 243, 255]);
  canvas.fillRect(220, 466, 522, 84, [213, 225, 225, 255]);
  canvas.fillRect(690, 512, 120, 34, [176, 132, 96, 255]);
  canvas.fillRect(700, 452, 88, 60, [232, 236, 232, 255]);
}

function drawOpeningPackagePhoto(canvas: RasterCanvas) {
  canvas.fillRect(0, 396, 960, 244, [199, 190, 176, 255]);
  canvas.shadow(150, 388, 650, 110, 0.26);
  const boxes: Array<[number, number, number, number, Color]> = [
    [146, 282, 226, 150, [197, 151, 93, 255]],
    [376, 234, 220, 198, [218, 170, 105, 255]],
    [604, 306, 214, 126, [188, 145, 90, 255]],
    [266, 404, 226, 112, [204, 162, 101, 255]]
  ];
  for (const [x, y, w, h, color] of boxes) {
    canvas.fillRect(x, y, w, h, color);
    canvas.fillRect(x, y, w, 16, [244, 225, 182, 255], 0.55);
    canvas.strokeLine(x + w / 2, y, x + w / 2, y + h, 4, [153, 110, 70, 255], 0.38);
  }
  canvas.fillRect(206, 180, 256, 60, [236, 242, 239, 255]);
  canvas.fillRect(236, 196, 196, 12, [185, 204, 201, 255], 0.75);
  canvas.fillRect(610, 214, 112, 82, [240, 244, 238, 255]);
  canvas.fillRect(628, 198, 78, 20, [66, 128, 119, 255]);
}

function drawReceiptPhoto(canvas: RasterCanvas) {
  canvas.fillRect(0, 388, 960, 252, [205, 211, 207, 255]);
  canvas.shadow(150, 330, 620, 142, 0.2);
  canvas.fillRect(150, 236, 330, 210, [220, 171, 105, 255]);
  canvas.fillRect(488, 258, 292, 188, [238, 240, 235, 255]);
  canvas.fillRect(518, 292, 230, 12, [183, 198, 198, 255], 0.75);
  canvas.fillRect(518, 326, 196, 12, [183, 198, 198, 255], 0.75);
  canvas.fillRect(518, 360, 218, 12, [183, 198, 198, 255], 0.75);
  canvas.fillEllipse(684, 426, 54, 18, [172, 79, 62, 255], 0.65);
}

function drawGenericPhoto(canvas: RasterCanvas) {
  canvas.fillRect(0, 406, 960, 234, [205, 215, 213, 255]);
  canvas.shadow(182, 292, 580, 156, 0.2);
  canvas.fillRect(184, 246, 580, 210, [244, 247, 244, 255]);
  canvas.fillRect(224, 286, 500, 26, [183, 206, 203, 255], 0.75);
  canvas.fillRect(224, 338, 410, 22, [183, 206, 203, 255], 0.65);
  canvas.fillRect(224, 386, 460, 22, [183, 206, 203, 255], 0.55);
}

function encodePng(width: number, height: number, rgba: Buffer) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const target = y * (stride + 1);
    scanlines[target] = 0;
    rgba.copy(scanlines, target + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines, { level: 8 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function pngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.byteLength, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])) >>> 0, 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
