import { defineConfig } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHmac, timingSafeEqual } from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const SCENE_FILE = path.join(ROOT, 'src', 'data', 'scene.json');
const LIGHTS_FILE = path.join(ROOT, 'src', 'data', 'lights.json');
const EVENTS_FILE = path.join(ROOT, 'src', 'data', 'events.json');
const INTERACTIONS_FILE = path.join(ROOT, 'src', 'data', 'interactions.json');
const TERRAIN_FILE = path.join(ROOT, 'src', 'data', 'terrain.json');
const LANDING_FILE = path.join(ROOT, 'src', 'data', 'landing.json');
const ASSET_DIR = path.join(ROOT, 'public', 'assets', 'scene');
const ACCESS_COOKIE = 'mur_access';
const localAccessPassword = () => String(process.env.MUR_ACCESS_PASSWORD || 'kreslo');
const accessToken = password => createHmac('sha256', password).update('mur-narekov-access-v1').digest('hex');
const safeEqual = (left,right) => { const a=Buffer.from(String(left)),b=Buffer.from(String(right));return a.length===b.length&&timingSafeEqual(a,b); };
const requestCookie = (req,name) => String(req.headers.cookie||'').split(';').map(value=>value.trim().split('=')).find(([key])=>key===name)?.slice(1).join('=')||'';

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
    visibility: ['day','night'].includes(item.visibility) ? item.visibility : 'always',
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

function cleanLight(light) {
  const number=(key,fallback,min,max)=>{const value=Number(light[key]);return Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;};
  return {
    id:String(light.id||'').slice(0,80),name:String(light.name||'Svetlo').trim().slice(0,60),
    x:number('x',0,0,700),y:number('y',-.4,-3,5),offsetX:number('offsetX',0,-50,50),offsetY:number('offsetY',0,-50,50),
    angle:number('angle',0,-180,180),lengthM:number('lengthM',10,1,30),widthM:number('widthM',7,.5,20),softness:number('softness',.72,0,1),haloM:number('haloM',2.4,.2,8),
    intensity:number('intensity',1,.05,2),color:/^#[0-9a-f]{6}$/i.test(String(light.color||''))?String(light.color).toLowerCase():'#ffd080',
    flicker:light.flicker===true,...(light.lampId?{lampId:String(light.lampId).slice(0,80)}:{}),...(light.generatedFrom?{generatedFrom:String(light.generatedFrom).slice(0,80)}:{})
  };
}

function cleanInteraction(interaction) {
  const number=(key,fallback,min,max)=>{const value=Number(interaction[key]);return Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;};
  return {
    id:String(interaction.id||'').slice(0,80),name:String(interaction.name||'Interakcia').trim().slice(0,60),
    game:interaction.game==='civava'?'civava':'segedin',x:number('x',0,0,700),y:number('y',.7,-3,5),
    radiusM:number('radiusM',2.2,.5,20),enabled:interaction.enabled!==false
  };
}

function cleanEvent(event) {
  const number=(key,fallback,min,max)=>{const value=Number(event[key]);return Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;};
  const common={id:String(event.id||'').slice(0,80),name:String(event.name||'Event').trim().slice(0,60),type:event.type==='text'?'text':event.type==='scene'?'scene':'walker',visibility:['day','night'].includes(event.visibility)?event.visibility:'always',startAt:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(event.startAt||''))?String(event.startAt):'',startDelaySec:number('startDelaySec',0,0,86400)};
  if(common.type==='scene'){
    const valueNumber=(value,fallback,min,max)=>{const parsed=Number(value);return Number.isFinite(parsed)?Math.max(min,Math.min(max,parsed)):fallback;};
    const durationSec=number('durationSec',20,1,600),actors=(Array.isArray(event.actors)?event.actors:[]).slice(0,30).map((actor,index)=>{
      const src=String(actor.src||'');if(!src.startsWith('/assets/scene/'))throw new Error(`Asset ${index+1} v scénke nie je uložený v scéne.`);
      return{id:String(actor.id||'').slice(0,80),name:String(actor.name||`Postava ${index+1}`).trim().slice(0,60),src:src.slice(0,240),widthM:valueNumber(actor.widthM,3,.2,30),startX:valueNumber(actor.startX,0,0,700),endX:valueNumber(actor.endX,0,0,700),pathY:valueNumber(actor.pathY,1,-3,5),moveStartSec:valueNumber(actor.moveStartSec,0,0,durationSec),moveDurationSec:valueNumber(actor.moveDurationSec,5,.1,durationSec),easing:actor.easing==='linear'?'linear':'ease',facing:actor.facing==='left'?'left':'right',animated:actor.animated===true,frames:Math.round(valueNumber(actor.frames,5,2,60)),fps:valueNumber(actor.fps,6,.5,30),frameDirection:actor.frameDirection==='vertical'?'vertical':'horizontal'};
    });
    const actorIds=new Set(actors.map(actor=>actor.id)),cues=(Array.isArray(event.cues)?event.cues:[]).slice(0,200).filter(cue=>actorIds.has(String(cue.actorId||''))).map(cue=>({id:String(cue.id||'').slice(0,80),actorId:String(cue.actorId||'').slice(0,80),atSec:valueNumber(cue.atSec,0,0,durationSec),durationSec:valueNumber(cue.durationSec,3,.5,30),text:String(cue.text||'').trim().slice(0,240),widthM:valueNumber(cue.widthM,5,2,14),fontSize:Math.round(valueNumber(cue.fontSize,20,12,42)),textColor:/^#[0-9a-f]{6}$/i.test(String(cue.textColor||''))?String(cue.textColor).toLowerCase():'#25211d',backgroundColor:/^#[0-9a-f]{6}$/i.test(String(cue.backgroundColor||''))?String(cue.backgroundColor).toLowerCase():'#f2eadb'}));
    return{...common,durationSec,repeatEvent:event.repeatEvent!==false,repeatEverySec:Math.max(durationSec,number('repeatEverySec',30,1,3600)),actors,cues};
  }
  if(common.type==='text'){
    const bubblesPerSequence=Math.round(number('bubblesPerSequence',1,1,20)),sequenceCount=Math.round(number('sequenceCount',1,1,50));
    const legacy=(Array.isArray(event.messages)?event.messages:[]).map(value=>String(value).trim().slice(0,160)).slice(0,1000),requestedSequences=Array.isArray(event.sequences)?event.sequences:[];
    const total=sequenceCount,sequences=Array.from({length:total},(_,sequenceIndex)=>Array.from({length:bubblesPerSequence},(_,bubbleIndex)=>{
      const value=requestedSequences[sequenceIndex]?.[bubbleIndex]??legacy[(sequenceIndex*bubblesPerSequence+bubbleIndex)%Math.max(1,legacy.length)]??'';return String(value).trim().slice(0,160);
    }));
    return{...common,x:number('x',0,0,700),y:number('y',-.2,-3,5),messages:sequences.flat(),sequences,bubblesPerSequence,sequenceCount,repeatEvent:event.repeatEvent!==false,bubbleIntervalSec:number('bubbleIntervalSec',3,.2,3600),bubbleDurationSec:number('bubbleDurationSec',2.5,.5,120),repeatEverySec:number('repeatEverySec',15,.5,86400),widthM:number('widthM',5,2,14),fontSize:number('fontSize',20,12,42),textColor:/^#[0-9a-f]{6}$/i.test(String(event.textColor||''))?String(event.textColor).toLowerCase():'#25211d',backgroundColor:/^#[0-9a-f]{6}$/i.test(String(event.backgroundColor||''))?String(event.backgroundColor).toLowerCase():'#f2eadb'};
  }
  const src=String(event.src||'');if(!src.startsWith('/assets/scene/'))throw new Error('Event asset musí byť uložený v scéne.');
  const pathY=Number(event.pathY);
  const speechLegacy=(Array.isArray(event.speechMessages)?event.speechMessages:[]).map(value=>String(value).trim().slice(0,160)).slice(0,1000),requestedSpeechSequences=Array.isArray(event.speechSequences)?event.speechSequences:[],speechBubblesPerSequence=Math.round(number('speechBubblesPerSequence',1,1,20)),speechSequenceCount=Math.round(number('speechSequenceCount',requestedSpeechSequences.length||speechLegacy.length||1,1,50));
  const speechSequences=Array.from({length:speechSequenceCount},(_,sequenceIndex)=>Array.from({length:speechBubblesPerSequence},(_,bubbleIndex)=>{const value=requestedSpeechSequences[sequenceIndex]?.[bubbleIndex]??speechLegacy[(sequenceIndex*speechBubblesPerSequence+bubbleIndex)%Math.max(1,speechLegacy.length)]??'';return String(value).trim().slice(0,160);}));
  return{...common,src:src.slice(0,240),widthM:number('widthM',3,.2,30),startX:number('startX',0,0,700),endX:number('endX',700,0,700),...(Number.isFinite(pathY)?{pathY:Math.max(-3,Math.min(5,pathY))}:{}),lane:number('lane',.5,0,1),speedMps:number('speedMps',4,.2,30),direction:event.direction==='left'?'left':'right',loopDelaySec:number('loopDelaySec',10,0,3600),runCount:Math.round(number('runCount',0,0,1000)),animated:event.animated===true,frames:Math.round(number('frames',5,2,60)),fps:number('fps',6,.5,30),frameDirection:event.frameDirection==='vertical'?'vertical':'horizontal',speechEnabled:event.speechEnabled===true,speechMessages:speechSequences.flat(),speechSequences,speechBubblesPerSequence,speechSequenceCount,speechRepeatEvent:event.speechRepeatEvent!==false,speechDelaySec:number('speechDelaySec',2,0,3600),speechBubbleIntervalSec:number('speechBubbleIntervalSec',3,.2,3600),speechBubbleDurationSec:number('speechBubbleDurationSec',number('speechDurationSec',3,.5,120),.5,120),speechRepeatEverySec:number('speechRepeatEverySec',number('speechEverySec',12,.5,86400),.5,86400),speechWidthM:number('speechWidthM',5,2,14),speechFontSize:Math.round(number('speechFontSize',20,12,42)),speechTextColor:/^#[0-9a-f]{6}$/i.test(String(event.speechTextColor||''))?String(event.speechTextColor).toLowerCase():'#25211d',speechBackgroundColor:/^#[0-9a-f]{6}$/i.test(String(event.speechBackgroundColor||''))?String(event.speechBackgroundColor).toLowerCase():'#f2eadb'};
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
        if(pathname==='/api/access'){
          const password=localAccessPassword(),authenticated=safeEqual(decodeURIComponent(requestCookie(req,ACCESS_COOKIE)),accessToken(password));
          res.setHeader('Cache-Control','no-store, max-age=0');
          if(req.method==='GET')return json(res,200,{authenticated});
          if(req.method!=='POST')return json(res,405,{error:'Nepovolená metóda.'});
          try{const body=await readJson(req,2048);if(!safeEqual(String(body.password||'').slice(0,128),password))return json(res,401,{error:'Nesprávne heslo.'});res.setHeader('Set-Cookie',`${ACCESS_COOKIE}=${encodeURIComponent(accessToken(password))}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`);return json(res,200,{authenticated:true});}catch(error){return json(res,400,{error:error.message||'Operácia zlyhala.'});}
        }
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
            if (!Array.isArray(body.lights) || body.lights.length > 1000) throw new Error('Scéna obsahuje priveľa svetiel.');
            if (!Array.isArray(body.events) || body.events.length > 500) throw new Error('Scéna obsahuje priveľa eventov.');
            if (!Array.isArray(body.interactions) || body.interactions.length > 100) throw new Error('Scéna obsahuje priveľa interakcií.');
            const items = body.items.map(cleanSceneItem);
            const lights = body.lights.map(cleanLight);
            const events = body.events.map(cleanEvent);
            const interactions = body.interactions.map(cleanInteraction);
            const terrain = cleanTerrain(body.terrain);
            const landing = cleanLanding(body.landing);
            await mkdir(path.dirname(SCENE_FILE), { recursive: true });
            await writeFile(SCENE_FILE, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
            await writeFile(LIGHTS_FILE, `${JSON.stringify(lights, null, 2)}\n`, 'utf8');
            await writeFile(EVENTS_FILE, `${JSON.stringify(events, null, 2)}\n`, 'utf8');
            await writeFile(INTERACTIONS_FILE, `${JSON.stringify(interactions, null, 2)}\n`, 'utf8');
            await writeFile(TERRAIN_FILE, `${JSON.stringify(terrain, null, 2)}\n`, 'utf8');
            await writeFile(LANDING_FILE, `${JSON.stringify(landing, null, 2)}\n`, 'utf8');
            return json(res, 200, { saved: items.length, lights: lights.length, events: events.length, interactions: interactions.length });
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
