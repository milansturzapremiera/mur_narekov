import { defineConfig } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SCENE_FILE = path.join(ROOT, 'src', 'data', 'scene.json');
const TERRAIN_FILE = path.join(ROOT, 'src', 'data', 'terrain.json');
const LANDING_FILE = path.join(ROOT, 'src', 'data', 'landing.json');
const ASSET_DIR = path.join(ROOT, 'public', 'assets', 'scene');

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(value));
}

function readJson(req, maxBytes = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Súbor je príliš veľký. Maximum je 8 MB.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new Error('Neplatné dáta.')); }
    });
    req.on('error', reject);
  });
}

function isLocal(req) {
  const address = req.socket.remoteAddress || '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function cleanSceneItem(item) {
  const source = String(item.src || '');
  if (!source.startsWith('/assets/scene/')) throw new Error('Obrázok musí byť uložený v scéne.');
  return {
    id: String(item.id || '').slice(0, 80),
    name: String(item.name || 'Objekt').trim().slice(0, 60),
    src: source.slice(0, 240),
    layer: item.layer === 'behind' ? 'behind' : 'front',
    x: Math.max(0, Math.min(700, Number(item.x) || 0)),
    y: Math.max(-2.5, Math.min(5, Number(item.y) || 0)),
    widthM: Math.max(.2, Math.min(100, Number(item.widthM) || 2)),
    rotation: Math.max(-180, Math.min(180, Number(item.rotation) || 0)),
    animated: item.animated === true,
    frames: Math.max(2, Math.min(60, Math.round(Number(item.frames) || 5))),
    fps: Math.max(.5, Math.min(30, Number(item.fps) || 6)),
    frameDirection: item.frameDirection === 'vertical' ? 'vertical' : 'horizontal',
    phase: Math.max(0, Math.min(1, Number(item.phase) || 0)),
    ...(item.generatedFrom ? { generatedFrom: String(item.generatedFrom).slice(0, 80) } : {})
  };
}

function cleanTerrain(value = {}) {
  const ratio = (key, fallback, min, max) => Math.max(min, Math.min(max, Number(value[key]) || fallback));
  return {
    wallHeight: ratio('wallHeight', .36, .2, .55),
    lowWallHeight: ratio('lowWallHeight', .06, .03, .1),
    upperGrassHeight: ratio('upperGrassHeight', .025, .01, .06),
    walkwayHeight: ratio('walkwayHeight', .065, .04, .15),
    bottomGrassHeight: ratio('bottomGrassHeight', .06, .03, .15)
  };
}

function cleanLanding(value = {}) {
  const limits = {
    eyebrow: 80, titleLine1: 80, titleLine2: 80, lead: 320, controlsTitle: 40,
    movementText: 100, runText: 100, mobileHint: 240, skinLegend: 80,
    nameLegend: 80, nameOptional: 40, nameLabel: 40, namePlaceholder: 80,
    colorLabel: 40, submitButton: 80, footer: 240
  };
  const cleaned = Object.fromEntries(Object.entries(limits).map(([key, limit]) => [key, String(value[key] || '').trim().slice(0, limit)]));
  const input = value.styles || {};
  const fonts = ['Archivo Black','Barlow Condensed','Against Myself','Don Graffiti','Mostwasted','Punk Kid','Impact','Georgia'];
  const font = (key,fallback) => fonts.includes(input[key]) ? input[key] : fallback;
  const color = (key,fallback) => /^#[0-9a-f]{6}$/i.test(String(input[key] || '')) ? String(input[key]).toLowerCase() : fallback;
  const number = (key,fallback,min,max) => {
    const parsed = Number(input[key]);
    return Number.isFinite(parsed) ? Math.max(min,Math.min(max,parsed)) : fallback;
  };
  cleaned.styles = {
    displayFont:font('displayFont','Archivo Black'), bodyFont:font('bodyFont','Barlow Condensed'),
    backgroundColor:color('backgroundColor','#ddd5c7'), formBackgroundColor:color('formBackgroundColor','#f2eadb'),
    backgroundImage:/^\/assets\/scene\/[a-z0-9._-]+$/i.test(String(input.backgroundImage || '')) ? String(input.backgroundImage) : '',
    backgroundFit:['cover','contain','repeat'].includes(input.backgroundFit) ? input.backgroundFit : 'cover',
    backgroundPositionX:number('backgroundPositionX',0,-12,12), backgroundPositionY:number('backgroundPositionY',0,-12,12),
    backgroundOpacity:number('backgroundOpacity',100,10,100),
    textColor:color('textColor','#25211d'), titleColor:color('titleColor','#25211d'), eyebrowColor:color('eyebrowColor','#25211d'),
    accentColor:color('accentColor','#b44f35'), buttonBackgroundColor:color('buttonBackgroundColor','#e6c94e'), buttonTextColor:color('buttonTextColor','#25211d'),
    titleSizeDesktop:number('titleSizeDesktop',134,64,160), titleSizeMobile:number('titleSizeMobile',64,42,80),
    leadSizeDesktop:number('leadSizeDesktop',20,16,28), leadSizeMobile:number('leadSizeMobile',17,16,22),
    desktopCopyX:number('desktopCopyX',0,-80,80), desktopCopyY:number('desktopCopyY',0,-100,100),
    desktopFormX:number('desktopFormX',0,-80,80), desktopFormY:number('desktopFormY',0,-80,80),
    mobileCopyX:number('mobileCopyX',0,-24,24), mobileCopyY:number('mobileCopyY',0,-48,48),
    mobileFormX:number('mobileFormX',0,-16,16), mobileFormY:number('mobileFormY',0,-32,64)
  };
  const elementDefaults = { eyebrow:[16,14],title:[134,64],lead:[20,17],controls:[12,12],footer:[12,12] };
  const elementNumber = (element,key,fallback,min,max) => {
    const parsed = Number(input.elements?.[element]?.[key]);
    return Number.isFinite(parsed) ? Math.max(min,Math.min(max,parsed)) : fallback;
  };
  cleaned.styles.elements = Object.fromEntries(Object.entries(elementDefaults).map(([element,[desktop,mobile]])=>[element,{
    sizeDesktop:elementNumber(element,'sizeDesktop',desktop,10,160), sizeMobile:elementNumber(element,'sizeMobile',mobile,10,80),
    xDesktop:elementNumber(element,'xDesktop',0,-120,120), yDesktop:elementNumber(element,'yDesktop',0,-120,120),
    xMobile:elementNumber(element,'xMobile',0,-32,32), yMobile:elementNumber(element,'yMobile',0,-64,64)
  }]));
  return cleaned;
}

function sceneEditorPlugin() {
  return {
    name: 'mur-local-scene-editor',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (!pathname.startsWith('/__scene-editor/')) return next();
        if (!isLocal(req)) return json(res, 403, { error: 'Editor zapisuje iba z lokálneho počítača.' });
        if (req.method !== 'POST') return json(res, 405, { error: 'Nepovolená metóda.' });

        try {
          if (pathname === '/__scene-editor/upload') {
            const body = await readJson(req);
            const match = String(body.dataUrl || '').match(/^data:image\/(png|jpeg|webp);base64,([a-z0-9+/=]+)$/i);
            if (!match) throw new Error('Použi PNG, JPG alebo WebP.');
            const bytes = Buffer.from(match[2], 'base64');
            if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error('Maximum pre obrázok je 8 MB.');
            const extension = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
            const base = String(body.name || 'objekt').normalize('NFKD').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'objekt';
            const filename = `${Date.now()}-${base}.${extension}`;
            await mkdir(ASSET_DIR, { recursive: true });
            await writeFile(path.join(ASSET_DIR, filename), bytes);
            return json(res, 201, { src: `/assets/scene/${filename}` });
          }

          if (pathname === '/__scene-editor/save') {
            const body = await readJson(req, 1024 * 1024);
            if (!Array.isArray(body.items) || body.items.length > 1000) throw new Error('Scéna obsahuje priveľa objektov.');
            const items = body.items.map(cleanSceneItem);
            const terrain = cleanTerrain(body.terrain);
            const landing = cleanLanding(body.landing);
            await mkdir(path.dirname(SCENE_FILE), { recursive: true });
            await writeFile(SCENE_FILE, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
            await writeFile(TERRAIN_FILE, `${JSON.stringify(terrain, null, 2)}\n`, 'utf8');
            await writeFile(LANDING_FILE, `${JSON.stringify(landing, null, 2)}\n`, 'utf8');
            return json(res, 200, { saved: items.length });
          }

          return json(res, 404, { error: 'Neznáma editorová operácia.' });
        } catch (error) {
          return json(res, 400, { error: error.message || 'Operácia zlyhala.' });
        }
      });
    }
  };
}

export default defineConfig({ plugins: [sceneEditorPlugin()] });
