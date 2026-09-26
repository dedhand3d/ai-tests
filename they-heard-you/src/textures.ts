import * as THREE from 'three';

export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function surface(size: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas textures are unavailable in this browser.');
  return { canvas, context };
}

export function canvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 2;
  return texture;
}

export function dirtyTexture(kind: 'wood' | 'cloth' | 'floor' | 'ceiling' | 'metal', seed: number): THREE.CanvasTexture {
  const { canvas, context } = surface(128);
  const random = seededRandom(seed);
  const bases = { wood: '#5b422b', cloth: '#494532', floor: '#554637', ceiling: '#93876a', metal: '#777b70' };
  context.fillStyle = bases[kind];
  context.fillRect(0, 0, 128, 128);
  if (kind === 'wood') {
    for (let stripe = 0; stripe < 95; stripe++) {
      context.fillStyle = random() > 0.5 ? '#271d1480' : '#b68b4940';
      context.fillRect(random() * 128, 0, random() * 3 + 0.4, 128);
    }
    context.fillStyle = '#1e1a13';
    context.fillRect(0, 0, 3, 128);
    context.fillRect(65, 0, 2, 128);
  }
  if (kind === 'cloth' || kind === 'floor') {
    const colors = ['#886743', '#383c30', '#222d29', '#69523d', '#837851'];
    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 8; column++) {
        context.fillStyle = colors[Math.floor(random() * colors.length)];
        if (kind === 'floor') context.fillRect(column * 16 + 1, row * 16 + 1, 13, 13);
        else {
          context.beginPath();
          context.ellipse(column * 16 + 8, row * 16 + 8, 7, 4, random() * 3, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }
  for (let fleck = 0; fleck < 2400; fleck++) {
    context.fillStyle = random() > 0.58 ? '#d0b68418' : '#080b0960';
    context.fillRect(random() * 128, random() * 128, random() * 3 + 1, random() * 2 + 1);
  }
  for (let stain = 0; stain < 20; stain++) {
    context.fillStyle = '#10150d30';
    context.beginPath();
    context.ellipse(random() * 128, random() * 128, random() * 14 + 3, random() * 9 + 2, random() * 3, 0, Math.PI * 2);
    context.fill();
  }
  const texture = canvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function lettering(lines: string[], background = '#b3a37b', ink = '#252b22', size = 256): THREE.CanvasTexture {
  const { canvas, context } = surface(size);
  const random = seededRandom(lines.join('').length * 391);
  context.fillStyle = background;
  context.fillRect(0, 0, size, size);
  for (let spot = 0; spot < 1800; spot++) {
    context.fillStyle = random() > 0.7 ? '#00000025' : '#ffffff0c';
    context.fillRect(random() * size, random() * size, random() * 5, random() * 8);
  }
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = ink;
  const height = Math.min(size / (lines.length + 1), size * 0.18);
  context.font = `bold ${height}px monospace`;
  lines.forEach((line, index) => {
    context.save();
    context.translate(size / 2, size / 2 + (index - (lines.length - 1) / 2) * height * 1.2);
    context.rotate((random() - 0.5) * 0.06);
    context.fillText(line, 0, 0, size * 0.88);
    context.restore();
  });
  return canvasTexture(canvas);
}

export function televisionTexture(): THREE.CanvasTexture {
  const { canvas, context } = surface(256);
  context.fillStyle = '#779cbc';
  context.fillRect(0, 0, 256, 256);
  context.fillStyle = '#d7d5b9';
  context.fillRect(9, 10, 238, 43);
  context.fillStyle = '#9d1d25';
  context.textAlign = 'center';
  context.font = 'bold 36px monospace';
  context.fillText('MISSING', 128, 43);
  context.fillStyle = '#253742';
  context.fillRect(19, 68, 87, 111);
  context.fillStyle = '#95a6a5';
  context.beginPath();
  context.ellipse(62, 115, 25, 34, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#3e535b';
  context.fillRect(34, 87, 51, 19);
  context.fillRect(43, 112, 10, 5);
  context.fillRect(71, 111, 9, 5);
  context.fillRect(53, 137, 20, 3);
  context.beginPath();
  context.ellipse(63, 180, 43, 30, 0, Math.PI, 0);
  context.fill();
  context.textAlign = 'left';
  context.fillStyle = '#142a3b';
  context.font = 'bold 14px monospace';
  ['LAST SEEN', 'RED CREEK', 'COUNTY', '', 'FAMILY', 'ASKS FOR', 'INFORMATION'].forEach((line, index) => context.fillText(line, 118, 85 + index * 15));
  context.fillStyle = '#183550';
  context.fillRect(0, 209, 256, 47);
  context.fillStyle = '#d2e3cd';
  context.textAlign = 'center';
  context.font = 'bold 15px monospace';
  context.fillText('HAVE YOU SEEN THIS PERSON?', 128, 229, 243);
  context.font = '11px monospace';
  context.fillText('COUNTY NEWS 4 / 11:47 PM', 128, 246);
  for (let scan = 0; scan < 256; scan += 3) {
    context.fillStyle = '#102f5738';
    context.fillRect(0, scan, 256, 1);
  }
  return canvasTexture(canvas);
}