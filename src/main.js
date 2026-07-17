import './style.css';
import initialScene from './data/scene.json';
import initialTerrain from './data/terrain.json';
import initialLanding from './data/landing.json';

const FONTS = [
  ['Impact', 'Impact, Haettenschweiler, sans-serif'], ['Krieda', '"Comic Sans MS", cursive'],
  ['Tag', '"Permanent Marker", cursive'], ['Wildstyle', '"Rock Salt", cursive'],
  ['Drip', '"Rubik Wet Paint", fantasy'],
  ['Plagát', '"Arial Black", Gadget, sans-serif'], ['Fixka', '"Trebuchet MS", sans-serif'],
  ['Stroj', '"Courier New", monospace'], ['Román', 'Georgia, serif'],
  ['Rukopis', '"Brush Script MT", cursive'], ['Podpis', '"Lucida Handwriting", cursive'],
  ['Kov', 'Copperplate, fantasy'], ['Klasik', '"Times New Roman", serif'],
  ['Against Myself', '"Against Myself", cursive'], ['Don Graffiti', '"Don Graffiti", fantasy'],
  ['Mostwasted', 'Mostwasted, fantasy'], ['Punk Kid', '"Punk Kid", fantasy']
];
const LANDING_FONT_STACKS = {
  'Archivo Black': "'Archivo Black','Arial Black',sans-serif",
  'Barlow Condensed': "'Barlow Condensed','Arial Narrow',sans-serif",
  'Against Myself': "'Against Myself',cursive",
  'Don Graffiti': "'Don Graffiti',fantasy",
  'Mostwasted': "Mostwasted,fantasy",
  'Punk Kid': "'Punk Kid',fantasy",
  'Impact': "Impact,Haettenschweiler,sans-serif",
  'Georgia': "Georgia,serif"
};
const SKINS = { light: '#f0c6a4', tan: '#c88f62', brown: '#875338', dark: '#4c2d23' };
const PX_PER_M = 48, SECTION_PX = 430, PILLAR_PX = 82;
const VISITOR_KEY = 'mur:visitor-id', WRITTEN_KEY = 'mur:has-written';
const MUSIC_ENABLED_KEY = 'mur:music-enabled', MUSIC_VOLUME_KEY = 'mur:music-volume';
const MUSIC_TRACK_KEY = 'mur:music-track';
const TRACKS = [
  { title:'Ukáž mi čurilu',artist:'zltunke_',src:'/assets/audio/background-music.mp3',cover:'/assets/audio/cover.png' },
  { title:'hymna 2.0',artist:'zltunke_',src:'/assets/audio/hymna-2.mp3',cover:'/assets/audio/cover.png' }
];
const WRITE_LIMIT_ENABLED = !import.meta.env.DEV;
const MESSAGE_LIMIT = 20;
const DEV_RUN_MULTIPLIER = import.meta.env.DEV ? 5 : 1;
function storedValue(key) { try { return localStorage.getItem(key); } catch { return null; } }
function storeValue(key,value) { try { localStorage.setItem(key,value); } catch {} }
function getVisitorId() {
  const stored = storedValue(VISITOR_KEY);
  if (stored && /^[a-z0-9-]{16,128}$/i.test(stored)) return stored;
  const created = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  storeValue(VISITOR_KEY,created); return created;
}
const visitorId = getVisitorId();
const state = {
  started: false, running: false, x: 0, lane: .5, camera: 0, dir: 1, moving: 0, velocity: 0, stride: 0, zoom: 1, targetZoom: 1,
  skin: 'tan', name: '', nameColor: '#f0c849',
  graffiti: [], others: [], edit: false, targetY: .5, targetX: 0, positionU: .5, section: 0, angle: 0,
  sceneItems: structuredClone(initialScene), selectedSceneId: null, sceneEditing: false,
  terrain: structuredClone(initialTerrain),
  landing: structuredClone(initialLanding),
  hasWritten: WRITE_LIMIT_ENABLED && storedValue(WRITTEN_KEY) === '1', savingGraffiti: false,
  mode: 'local', keys: new Set(), last: performance.now()
};
const uid = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('mur-narekov') : null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

document.querySelector('#app').innerHTML = `
  <main id="game" aria-label="Múr nárekov, interaktívna prechádzka">
    <canvas id="world" tabindex="0" aria-label="700 metrov dlhý tehlový múr s odkazmi návštevníkov."></canvas>
    <header class="hud">
      <div class="hud-left">
        <div class="brand"><span>MÚR</span><strong>NÁREKOV</strong></div>
        <button class="graffiti-count" id="graffitiCountButton" type="button" aria-expanded="false" aria-controls="graffitiIndex" aria-label="Zobraziť všetky odkazy"><b id="graffitiCount">0</b><span>odkazov</span></button>
      </div>
      <div class="meter" aria-label="Aktuálna poloha na múre"><b id="meterValue">1 – 700</b></div>
      <div class="status"><i id="statusDot"></i><span id="statusText">lokálna stena</span></div>
    </header>
    <section class="graffiti-index" id="graffitiIndex" aria-hidden="true" aria-labelledby="graffitiIndexTitle" inert>
      <header><div><span>REGISTER MÚRU</span><h2 id="graffitiIndexTitle">Všetky odkazy</h2></div><button id="graffitiIndexClose" type="button" aria-label="Zavrieť zoznam odkazov">×</button></header>
      <ol id="graffitiIndexList"></ol>
      <p class="graffiti-index-empty" id="graffitiIndexEmpty">Na múre zatiaľ nie je žiadny odkaz.</p>
    </section>
    <audio id="backgroundMusic" preload="metadata" playsinline></audio>
    <div class="audio-control" id="audioControl" aria-label="Hudba na pozadí">
      <button class="audio-compact-toggle" id="audioCompactToggle" type="button" aria-expanded="false" aria-controls="audioPanel" aria-label="Otvoriť ovládanie hudby"><span aria-hidden="true">♪</span></button>
      <div class="audio-panel" id="audioPanel">
        <img class="track-art" src="/assets/audio/cover.png" alt="" width="52" height="52">
        <div class="track-info"><strong id="trackTitle"></strong><span id="trackArtist"></span></div>
        <div class="track-actions">
          <button class="track-skip" id="previousTrack" type="button" aria-label="Predchádzajúca skladba"><span aria-hidden="true">‹</span></button>
          <button id="musicToggle" type="button" aria-pressed="true" aria-label="Vypnúť hudbu"><span aria-hidden="true">♪</span></button>
          <button class="track-skip" id="nextTrack" type="button" aria-label="Ďalšia skladba"><span aria-hidden="true">›</span></button>
          <label for="musicVolume"><span>Hlasitosť</span><input id="musicVolume" type="range" min="0" max="1" step="0.05" value="0.45"></label>
        </div>
      </div>
    </div>
    <button class="write-button" id="writeButton" type="button"><span>＋</span> Zanechať odkaz</button>
    <div class="touch-controls" aria-label="Pohyb po chodníku">
      <button class="touch-direction touch-left" data-move-x="-1" aria-label="Kráčať doľava"><span aria-hidden="true">←</span></button>
      <button class="touch-direction touch-right" data-move-x="1" aria-label="Kráčať doprava"><span aria-hidden="true">→</span></button>
      <div class="touch-zoom" aria-label="Priblíženie múru">
        <button data-zoom="-0.15" type="button" aria-label="Oddialiť múr">−</button>
        <output data-zoom-value aria-live="polite">100%</output>
        <button data-zoom="0.15" type="button" aria-label="Priblížiť múr">＋</button>
      </div>
      <button class="touch-run" data-run type="button" aria-label="Držaním bežať" aria-pressed="false"><span aria-hidden="true">⇧</span><small>beh</small></button>
    </div>
    <div class="desktop-zoom" aria-label="Priblíženie múru">
      <button class="desktop-zoom-toggle" type="button" aria-label="Otvoriť zoom a čistý režim" aria-expanded="false" title="Zoom a čistý režim"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg></button>
      <div class="desktop-zoom-controls">
        <button data-zoom="-0.15" type="button" aria-label="Oddialiť múr">−</button>
        <output data-zoom-value aria-live="polite">100%</output>
        <button data-zoom="0.15" type="button" aria-label="Priblížiť múr">＋</button>
      </div>
    </div>
    <section class="editor" id="editor" aria-hidden="true">
      <button class="editor-close" id="editorClose" aria-label="Zatvoriť editor">×</button>
      <div class="editor-heading"><span>NÁPIS NA METRI</span><b id="editorMeter">0,0</b></div>
      <label for="message">Čo tu zostane?</label>
      <div class="text-row"><input id="message" maxlength="${MESSAGE_LIMIT}" autocomplete="off" placeholder="MAX ${MESSAGE_LIMIT} ZNAKOV"><output id="count">0/${MESSAGE_LIMIT}</output></div>
      <fieldset><legend>Písmo</legend><div class="font-list" id="fontList"></div></fieldset>
      <fieldset><legend>Farba nápisu</legend><label class="rgb-picker" for="messageColor"><input id="messageColor" type="color" value="#f2e8d5"><span>RGB farba</span><output id="messageColorValue">#F2E8D5</output></label></fieldset>
      <div class="graffiti-format-controls">
        <label class="graffiti-size-control" for="messageSize"><span>Veľkosť textu</span><output id="messageSizeValue">32 px</output><input id="messageSize" type="range" min="18" max="56" step="1" value="32"></label>
        <label class="graffiti-wrap-control" for="messageWrap"><input id="messageWrap" type="checkbox"><span>Zalomiť na 2 riadky</span></label>
      </div>
      <fieldset><legend>Umiestnenie v sekcii</legend><div class="preview-wall" id="positionPicker" role="button" tabindex="0" aria-label="Kliknutím vyber voľné miesto v sekcii múru"><span id="previewText">TVOJ ODKAZ</span></div></fieldset>
      <label class="angle-control" for="angle"><span>Uhol nápisu</span><output id="angleValue">0°</output><input id="angle" type="range" min="-12" max="12" value="0" step="1"></label>
      <p class="editor-tip">Klikni kamkoľvek v náhľade alebo priamo na plochu múru. Odkaz môžeš umiestniť voľne.</p>
      <button class="save-button" id="saveButton" disabled>Nechať na múre</button>
      <p class="editor-note" id="editorNote">V lokálnom režime zostane odkaz uložený v tomto prehliadači.</p>
    </section>
    <section class="entry" id="entry" aria-labelledby="entryTitle">
      <div class="entry-copy"><p class="entry-eyebrow" data-landing="eyebrow"></p><h1 id="entryTitle"><span data-landing="titleLine1"></span><br><em data-landing="titleLine2"></em></h1><p class="lead" data-landing="lead"></p><div class="entry-controls" aria-label="Ovládanie hry"><strong data-landing="controlsTitle"></strong><div><kbd>A</kbd><kbd>D</kbd><span data-landing="movementText"></span></div><div><kbd>Shift</kbd><span data-landing="runText"></span></div><div class="touch-hint"><span data-landing="mobileHint"></span></div></div></div>
      <form id="characterForm">
        <div class="character-preview" aria-label="Náhľad občana"><canvas id="avatar" width="180" height="220"></canvas></div>
        <fieldset><legend data-landing="skinLegend"></legend><div class="skin-list">${Object.keys(SKINS).map((s,i)=>`<label><input type="radio" name="skin" value="${s}" ${i===1?'checked':''}><span style="--skin:${SKINS[s]}"></span></label>`).join('')}</div></fieldset>
        <fieldset><legend><span data-landing="nameLegend"></span> <small data-landing="nameOptional"></small></legend><div class="identity-row"><label for="playerName"><span data-landing="nameLabel"></span><input id="playerName" name="playerName" maxlength="16" autocomplete="nickname" data-landing-placeholder="namePlaceholder"></label><label for="playerNameColor"><span data-landing="colorLabel"></span><input id="playerNameColor" name="playerNameColor" type="color" value="#f0c849"></label></div></fieldset>
        <button type="submit" class="enter-button"><span data-landing="submitButton"></span><span>→</span></button>
      </form>
      <p class="entry-foot" data-landing="footer"></p>
    </section>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  </main>`;

const canvas = document.querySelector('#world');
const ctx = canvas.getContext('2d');
const avatar = document.querySelector('#avatar');
const actx = avatar.getContext('2d');
const $ = s => document.querySelector(s);
const backgroundMusic = $('#backgroundMusic');
const audioControl = $('#audioControl');
const audioCompactToggle = $('#audioCompactToggle');
const musicToggle = $('#musicToggle');
const musicVolume = $('#musicVolume');
const previousTrack = $('#previousTrack');
const nextTrack = $('#nextTrack');
const trackArt = audioControl.querySelector('.track-art');
const trackTitle = $('#trackTitle');
const trackArtist = $('#trackArtist');
function applyLandingText(){
  document.querySelectorAll('[data-landing]').forEach(element=>{element.textContent=state.landing[element.dataset.landing]??'';});
  document.querySelectorAll('[data-landing-placeholder]').forEach(element=>{element.placeholder=state.landing[element.dataset.landingPlaceholder]??'';});
  const entry = $('#entry'), styles = state.landing.styles || {};
  const set = (name,value) => { if (value !== undefined && value !== '') entry.style.setProperty(name,value); };
  const rem = value => `${Number(value) / 16}rem`;
  const px = value => `${Number(value)}px`;
  set('--landing-display-font',LANDING_FONT_STACKS[styles.displayFont] || LANDING_FONT_STACKS['Archivo Black']);
  set('--landing-body-font',LANDING_FONT_STACKS[styles.bodyFont] || LANDING_FONT_STACKS['Barlow Condensed']);
  set('--landing-background',styles.backgroundColor); set('--landing-form-background',styles.formBackgroundColor);
  const backgroundFit = ['cover','contain','repeat'].includes(styles.backgroundFit) ? styles.backgroundFit : 'cover';
  set('--landing-background-image',styles.backgroundImage ? `url("${styles.backgroundImage}")` : 'none');
  set('--landing-background-size',backgroundFit === 'repeat' ? 'auto' : backgroundFit);
  set('--landing-background-repeat',backgroundFit === 'repeat' ? 'repeat' : 'no-repeat');
  set('--landing-background-offset-x',`${Number(styles.backgroundPositionX ?? 0)}%`);
  set('--landing-background-offset-y',`${Number(styles.backgroundPositionY ?? 0)}%`);
  set('--landing-background-opacity',String(Number(styles.backgroundOpacity ?? 100) / 100));
  set('--landing-text',styles.textColor); set('--landing-title',styles.titleColor); set('--landing-eyebrow',styles.eyebrowColor);
  set('--landing-accent',styles.accentColor); set('--landing-button-background',styles.buttonBackgroundColor); set('--landing-button-text',styles.buttonTextColor);
  set('--landing-title-desktop',rem(styles.titleSizeDesktop)); set('--landing-title-mobile',rem(styles.titleSizeMobile));
  set('--landing-lead-desktop',rem(styles.leadSizeDesktop)); set('--landing-lead-mobile',rem(styles.leadSizeMobile));
  ['desktopCopyX','desktopCopyY','desktopFormX','desktopFormY','mobileCopyX','mobileCopyY','mobileFormX','mobileFormY'].forEach(key=>set(`--landing-${key.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`)}`,px(styles[key])));
  Object.entries(styles.elements || {}).forEach(([element,values])=>{
    ['sizeDesktop','sizeMobile'].forEach(key=>set(`--landing-${element}-${key.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`)}`,rem(values[key])));
    ['xDesktop','yDesktop','xMobile','yMobile'].forEach(key=>set(`--landing-${element}-${key.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`)}`,px(values[key])));
  });
}
applyLandingText();
const savedMusicVolume = Number.parseFloat(storedValue(MUSIC_VOLUME_KEY));
const savedTrack = Number.parseInt(storedValue(MUSIC_TRACK_KEY),10);
let musicEnabled = storedValue(MUSIC_ENABLED_KEY) !== '0';
let currentTrack = Number.isInteger(savedTrack) && savedTrack >= 0 && savedTrack < TRACKS.length ? savedTrack : 0;
backgroundMusic.volume = Number.isFinite(savedMusicVolume) ? Math.min(1,Math.max(0,savedMusicVolume)) : .45;
musicVolume.value = String(backgroundMusic.volume);

function setAudioExpanded(expanded) {
  audioControl.classList.toggle('expanded',expanded);
  audioCompactToggle.setAttribute('aria-expanded',String(expanded));
  audioCompactToggle.setAttribute('aria-label',expanded?'Zavrieť ovládanie hudby':'Otvoriť ovládanie hudby');
}
function applyTrack(index,{ play = false } = {}) {
  currentTrack = (index + TRACKS.length) % TRACKS.length;
  const track = TRACKS[currentTrack];
  backgroundMusic.src = track.src;
  trackArt.src = track.cover;
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  storeValue(MUSIC_TRACK_KEY,String(currentTrack));
  if (play && musicEnabled) startMusic();
}
function updateMusicUI() {
  const playing = musicEnabled && !backgroundMusic.paused;
  audioControl.classList.toggle('off',!playing);
  musicToggle.setAttribute('aria-pressed',String(playing));
  musicToggle.setAttribute('aria-label',playing?'Vypnúť hudbu':'Zapnúť hudbu');
  audioCompactToggle.classList.toggle('playing',playing);
}
function startMusic() {
  if (!musicEnabled) { updateMusicUI(); return; }
  const attempt = backgroundMusic.play();
  if (attempt) attempt.then(updateMusicUI).catch(()=>{ musicEnabled=false; storeValue(MUSIC_ENABLED_KEY,'0'); updateMusicUI(); });
}
musicToggle.addEventListener('click',()=>{
  if (!backgroundMusic.paused) {
    backgroundMusic.pause(); musicEnabled=false; storeValue(MUSIC_ENABLED_KEY,'0'); updateMusicUI(); return;
  }
  musicEnabled=true; storeValue(MUSIC_ENABLED_KEY,'1'); startMusic();
});
musicVolume.addEventListener('input',()=>{
  backgroundMusic.volume=Number(musicVolume.value);
  storeValue(MUSIC_VOLUME_KEY,String(backgroundMusic.volume));
});
audioCompactToggle.addEventListener('click',()=>setAudioExpanded(!audioControl.classList.contains('expanded')));
previousTrack.addEventListener('click',()=>applyTrack(currentTrack-1,{play:musicEnabled && !backgroundMusic.paused}));
nextTrack.addEventListener('click',()=>applyTrack(currentTrack+1,{play:musicEnabled && !backgroundMusic.paused}));
backgroundMusic.addEventListener('ended',()=>applyTrack(currentTrack+1,{play:true}));
backgroundMusic.addEventListener('play',updateMusicUI);
backgroundMusic.addEventListener('pause',updateMusicUI);
document.addEventListener('keydown',event=>{ if (event.key === 'Escape') setAudioExpanded(false); });
applyTrack(currentTrack);
updateMusicUI();
let selectedFont = FONTS[0][1], selectedColor = '#f2e8d5', selectedSize = 32, selectedWrap = false, dpr = 1, skyGradient = null, skyGlow = null;
const sceneImages = new Map();
const wallSegmentImage = new Image();
const wallPillarImage = new Image();
const lowWallImage = new Image();
const grassImage = new Image();
wallSegmentImage.decoding = 'async';
wallPillarImage.decoding = 'async';
lowWallImage.decoding = 'async';
grassImage.decoding = 'async';
wallSegmentImage.src = '/assets/wall/brick-wall-segment.png';
wallPillarImage.src = '/assets/wall/brick-pillar.png';
lowWallImage.src = '/assets/wall/maly-murik.png';
grassImage.src = '/assets/wall/grass.png';

$('#fontList').innerHTML = FONTS.map((f,i)=>`<label><input type="radio" name="font" value="${i}" ${i?'':'checked'}><span style="font-family:${f[1]}">${f[0]}</span></label>`).join('');

function rebuildSkyPaint() {
  skyGradient=ctx.createLinearGradient(0,0,0,innerHeight*.72);
  skyGradient.addColorStop(0,'#87999a');skyGradient.addColorStop(.52,'#b8beb5');skyGradient.addColorStop(1,'#d8c9aa');
  skyGlow=ctx.createRadialGradient(innerWidth*.78,innerHeight*.19,0,innerWidth*.78,innerHeight*.19,innerWidth*.32);
  skyGlow.addColorStop(0,'rgba(238,220,174,.36)');skyGlow.addColorStop(1,'rgba(238,220,174,0)');
}
function resize() {
  const pixelBudget=5_000_000,ideal=Math.sqrt(pixelBudget/Math.max(1,innerWidth*innerHeight));
  dpr=Math.max(.8,Math.min(devicePixelRatio||1,2,ideal));
  canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);
  canvas.style.width=`${innerWidth}px`;canvas.style.height=`${innerHeight}px`;rebuildSkyPaint();
}
addEventListener('resize', resize); resize();

function sceneBands() {
  const lowWallHeight=Math.max(20,innerHeight*state.terrain.lowWallHeight);
  const grassHeight=Math.max(12,innerHeight*state.terrain.upperGrassHeight);
  const walkwayHeight=Math.max(36,innerHeight*state.terrain.walkwayHeight);
  const bottomGrassHeight=Math.max(24,innerHeight*state.terrain.bottomGrassHeight);
  const wallBottom=innerHeight-lowWallHeight-grassHeight-walkwayHeight-bottomGrassHeight;
  const wallHeight=Math.max(100,Math.min(innerHeight*state.terrain.wallHeight,wallBottom-100));
  const wallTop=wallBottom-wallHeight;
  const lowWallBottom=wallBottom+lowWallHeight;
  const walkwayTop=lowWallBottom+grassHeight;
  const walkwayBottom=walkwayTop+walkwayHeight;
  return { wallTop, wallBottom, lowWallHeight, lowWallBottom, grassHeight, walkwayTop, walkwayHeight, walkwayBottom };
}

function drawPerson(c, x, ground, scale, p, motion=0, stride=0, walkEnergy=Math.abs(motion)) {
  c.save();c.translate(x,ground);c.scale((p.dir||1)*scale,scale);
  const energy=reducedMotion.matches?0:Math.min(1,walkEnergy),phase=((stride%(Math.PI*2))+Math.PI*2)%(Math.PI*2),frame=energy?Math.floor(phase/(Math.PI/2))%4:0;
  const sway=[0,1,0,-1][frame]*energy,lift=[0,-2.4,0,-2.4][frame]*energy,skin=SKINS[p.skin]||SKINS.tan;
  c.translate(sway*2.4,lift);c.rotate(sway*.025-Math.sign(motion)*.012*energy);c.lineJoin='round';c.lineCap='round';

  const leftStep=frame===1?4:frame===3?-2:0,rightStep=frame===3?4:frame===1?-2:0;
  c.strokeStyle='#191816';c.lineWidth=5;c.beginPath();c.moveTo(-6,-35);c.lineTo(-7+leftStep*energy,-12);c.moveTo(6,-35);c.lineTo(7+rightStep*energy,-12);c.stroke();
  c.fillStyle='#191816';c.beginPath();c.ellipse(-8+leftStep*energy,-8,8,4,0,0,Math.PI*2);c.ellipse(8+rightStep*energy,-8,8,4,0,0,Math.PI*2);c.fill();

  const armShift=sway*3.5;
  c.strokeStyle=skin;c.lineWidth=7;c.beginPath();c.moveTo(-13,-67);c.lineTo(-19-armShift,-43);c.moveTo(13,-67);c.lineTo(19-armShift,-43);c.stroke();
  c.fillStyle='#171614';c.strokeStyle='#191816';c.lineWidth=2.5;c.beginPath();c.moveTo(-15,-74);c.lineTo(15,-74);c.lineTo(17,-34);c.lineTo(-17,-34);c.closePath();c.fill();c.stroke();

  c.fillStyle=skin;c.strokeStyle='#191816';c.lineWidth=2.5;c.beginPath();c.arc(0,-91,16,0,Math.PI*2);c.fill();c.stroke();
  c.fillStyle='#29221e';c.beginPath();c.arc(0,-97,16,Math.PI,Math.PI*2);c.fill();
  c.fillStyle='#eee9df';c.strokeStyle='#191816';c.lineWidth=1.5;
  [-4.7,4.7].forEach(eyeX=>{c.beginPath();c.ellipse(eyeX,-91,4.1,5.2,0,0,Math.PI*2);c.fill();c.stroke();});
  c.fillStyle='#171614';c.beginPath();c.arc(-3.8,-91,1.2,0,Math.PI*2);c.arc(5.6,-91,1.2,0,Math.PI*2);c.fill();c.restore();
}

function drawAvatar(){ actx.clearRect(0,0,180,220); drawPerson(actx,90,210,1.75,{...state,dir:1},0,0); }
drawAvatar();

function drawNameLabel(c, x, baseline, scale, name, color) {
  if (!name) return;
  c.save(); c.font = `600 ${Math.max(10, 11 * scale)}px "Barlow Condensed", sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'bottom'; c.lineJoin = 'round';
  c.strokeStyle = '#24211e'; c.lineWidth = 3; c.strokeText(name, x, baseline - 112 * scale);
  c.fillStyle = color || '#f0c849'; c.fillText(name, x, baseline - 112 * scale); c.restore();
}

function brickWall(c, offset, wallTop, ground) {
  const wallHeight = ground - wallTop, pillarTop = wallTop - 42, pillarHeight = ground - pillarTop;
  const firstSection = Math.floor((offset - SECTION_PX) / SECTION_PX) * SECTION_PX;
  c.fillStyle = '#302c29'; c.fillRect(0, wallTop, innerWidth, wallHeight);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'medium';
  for (let worldX = firstSection; worldX < offset + innerWidth + SECTION_PX; worldX += SECTION_PX) {
    const x = worldX - offset;
    if (wallSegmentImage.complete && wallSegmentImage.naturalWidth) {
      c.drawImage(wallSegmentImage, x + PILLAR_PX - 2, wallTop, SECTION_PX - PILLAR_PX + 4, wallHeight);
    }
    if (wallPillarImage.complete && wallPillarImage.naturalWidth) {
      c.drawImage(wallPillarImage, x, pillarTop, PILLAR_PX, pillarHeight);
    }
  }
}

function tiledBand(c, image, offset, y, height, fallback) {
  c.fillStyle=fallback;c.fillRect(0,y,innerWidth,height);
  if (!image.complete || !image.naturalWidth || height <= 0) return;
  const tileWidth=height*image.naturalWidth/image.naturalHeight;
  const first=Math.floor((offset-tileWidth)/tileWidth)*tileWidth;
  for(let worldX=first;worldX<offset+innerWidth+tileWidth;worldX+=tileWidth){
    c.drawImage(image,worldX-offset,y,tileWidth+1,height);
  }
}

function groundBands(c, offset, bands) {
  tiledBand(c,lowWallImage,offset,bands.wallBottom,bands.lowWallHeight,'#4d473e');
  tiledBand(c,grassImage,offset,bands.lowWallBottom,bands.grassHeight,'#405329');
  c.fillStyle='#858580';c.fillRect(0,bands.walkwayTop,innerWidth,bands.walkwayHeight);
  tiledBand(c,grassImage,offset,bands.walkwayBottom,Math.max(0,innerHeight-bands.walkwayBottom),'#405329');
}

const CLOUD_BANKS = [
  {x:80,y:.11,w:420,h:72,a:.22},{x:650,y:.2,w:520,h:86,a:.18},{x:1260,y:.09,w:360,h:64,a:.2},
  {x:1680,y:.25,w:600,h:92,a:.16},{x:2240,y:.15,w:460,h:78,a:.19}
];

function cloudShape(c,x,y,w,h,alpha) {
  c.save();c.translate(x,y);c.globalAlpha=alpha;c.fillStyle='#e5e2d7';c.beginPath();
  c.moveTo(-w*.52,h*.1);c.bezierCurveTo(-w*.46,-h*.35,-w*.29,-h*.4,-w*.2,-h*.12);
  c.bezierCurveTo(-w*.1,-h*.68,w*.12,-h*.7,w*.2,-h*.2);c.bezierCurveTo(w*.34,-h*.48,w*.52,-h*.2,w*.5,h*.12);
  c.bezierCurveTo(w*.34,h*.42,-w*.34,h*.46,-w*.52,h*.1);c.fill();c.restore();
}

function drawSky(c,offset) {
  c.fillStyle=skyGradient;c.fillRect(0,0,innerWidth,innerHeight);
  c.fillStyle=skyGlow;c.fillRect(0,0,innerWidth,innerHeight*.55);
  const drift=(offset*.045)%2600;
  for(let repeat=-1;repeat<=1;repeat++)CLOUD_BANKS.forEach(cloud=>cloudShape(c,cloud.x+repeat*2600-drift,innerHeight*cloud.y,cloud.w,cloud.h,cloud.a));
}

function sceneImage(src) {
  if (!sceneImages.has(src)) {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    sceneImages.set(src, image);
  }
  return sceneImages.get(src);
}

let sceneLayerCacheSource=null,sceneLayerCache={behind:[],front:[]};
function sceneLayerItems(layer) {
  if(sceneLayerCacheSource!==state.sceneItems){
    sceneLayerCacheSource=state.sceneItems;sceneLayerCache={behind:[],front:[]};
    state.sceneItems.forEach(item=>(sceneLayerCache[item.layer]||sceneLayerCache.front).push(item));
  }
  return sceneLayerCache[layer];
}

function drawSceneItem(c, item, offset, wallTop, ground, now) {
    const image = sceneImage(item.src), width = item.widthM * PX_PER_M;
    if (!image.complete || !image.naturalWidth) return;
    const frames = Math.max(2, Math.min(60, Math.round(Number(item.frames) || 5)));
    const animated = item.animated === true && frames > 1;
    const vertical = item.frameDirection === 'vertical';
    const sourceWidth = vertical ? image.naturalWidth : image.naturalWidth / frames;
    const sourceHeight = vertical ? image.naturalHeight / frames : image.naturalHeight;
    const fps = Math.max(.5, Math.min(30, Number(item.fps) || 6));
    const phase = Math.max(0, Math.min(1, Number(item.phase) || 0));
    const frame = animated && !reducedMotion.matches ? Math.floor(now * fps / 1000 + phase * frames) % frames : 0;
    const sourceX = animated && !vertical ? frame * sourceWidth : 0;
    const sourceY = animated && vertical ? frame * sourceHeight : 0;
    const displaySourceWidth = animated ? sourceWidth : image.naturalWidth;
    const displaySourceHeight = animated ? sourceHeight : image.naturalHeight;
    const height = width * displaySourceHeight / displaySourceWidth, x = item.x * PX_PER_M - offset;
    if (x + width / 2 < 0 || x - width / 2 > innerWidth) return;
    const baseline = wallTop + item.y * (ground - wallTop);
    c.save(); c.translate(x, baseline); c.rotate(item.rotation * Math.PI / 180);
    c.drawImage(image, sourceX, sourceY, displaySourceWidth, displaySourceHeight, -width / 2, -height, width, height);
    if (import.meta.env.DEV && state.sceneEditing && item.id === state.selectedSceneId) {
      c.strokeStyle = '#f0c849'; c.lineWidth = 2; c.setLineDash([7, 5]);
      c.strokeRect(-width / 2, -height, width, height); c.setLineDash([]);
      c.fillStyle = '#f0c849'; c.fillRect(-4, -4, 8, 8);
    }
    c.restore();
}

function drawSceneLayer(c, layer, offset, wallTop, ground, now) {
  sceneLayerItems(layer).forEach(item => drawSceneItem(c,item,offset,wallTop,ground,now));
}

function drawWallMountedAssets(c,offset,wallTop,ground,now) {
  sceneLayerItems('front').forEach(item=>{if(Number(item.y)<=1)drawSceneItem(c,item,offset,wallTop,ground,now);});
}

function graffitiLines(text,wrap) {
  const chars=[...String(text||'').trim()];
  if(!wrap||chars.length<2)return[chars.join('')];
  const half=Math.ceil(chars.length/2);let split=-1;
  for(let distance=0;distance<chars.length;distance++){
    const left=half-distance,right=half+distance;
    if(left>0&&/\s/.test(chars[left])){split=left;break;}
    if(right<chars.length-1&&/\s/.test(chars[right])){split=right;break;}
  }
  if(split<1)split=half;
  return[chars.slice(0,split).join('').trim(),chars.slice(split+(/\s/.test(chars[split])?1:0)).join('').trim()].filter(Boolean);
}

function drawGraffitiText(c,g,x,y,preview=false) {
  const text=String(g.text||'').trim();if(!text)return;
  const length=[...text].length,baseSize=Math.max(22,Math.min(40,innerWidth/28));
  const fallback=Math.max(18,baseSize*Math.min(1,12/length)),size=Math.max(18,Math.min(56,Number(g.size)||fallback));
  const lines=graffitiLines(text,g.wrap===true),lineHeight=size*.9,startY=-(lines.length-1)*lineHeight/2;
  c.save();c.translate(x,y);c.rotate(((Number.isFinite(g.angle)?g.angle:0)*Math.PI)/180);
  c.font=`bold ${size}px ${g.font}`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
  c.strokeStyle='rgba(15,13,12,.76)';c.lineWidth=Math.max(1.2,size*.065);c.fillStyle=g.color||'#f2e8d5';c.globalAlpha=preview ? .72 : .9;
  lines.forEach((line,index)=>{const lineY=startY+index*lineHeight;c.strokeText(line,0,lineY);c.fillText(line,0,lineY);});c.restore();
}

let renderedMeter=0;
function render(now) {
  const dt=Math.min((now-state.last)/1000,.05); state.last=now;
  const smooth=rate=>1-Math.exp(-rate*dt);
  state.zoom+=(state.targetZoom-state.zoom)*smooth(reducedMotion.matches?18:8);
  let inputX=(state.keys.has('ArrowRight')||state.keys.has('d')?1:0)-(state.keys.has('ArrowLeft')||state.keys.has('a')?1:0)+state.moving;
  inputX=Math.max(-1,Math.min(1,inputX));
  if(state.edit||state.sceneEditing)inputX=0;
  const inputLength=Math.abs(inputX);
  const reduced=reducedMotion.matches, running=state.running&&inputLength>0&&!state.edit&&!state.sceneEditing, horizontalSpeed=running?5.8*DEV_RUN_MULTIPLIER:3.2;
  const acceleration=reduced?18:(running&&import.meta.env.DEV?14:running?6.4:7.5), drag=reduced?22:10;
  state.velocity+=(inputX*horizontalSpeed-state.velocity)*smooth(inputX?acceleration:drag);
  if(Math.abs(state.velocity)<.015)state.velocity=0;
  const movementEnergy=Math.min(1,Math.abs(state.velocity/horizontalSpeed));
  if(state.started&&state.velocity){
    if(state.velocity)state.dir=Math.sign(state.velocity);
    state.x=Math.max(0,Math.min(700,state.x+state.velocity*dt));
    state.stride+=movementEnergy*dt*(running?7.4:4.6);
  }
  const playerScreen=.38*innerWidth, desired=state.x*PX_PER_M-playerScreen;
  state.camera+=(Math.max(0,Math.min(700*PX_PER_M-innerWidth,desired))-state.camera)*smooth(reduced?12:running&&import.meta.env.DEV?10:4.2);
  const currentMeter=Math.min(700,Math.floor(state.x)+1);
  if(currentMeter!==renderedMeter){renderedMeter=currentMeter;$('#meterValue').textContent=`${currentMeter} – 700`;}
  syncGraffitiIndex();
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,innerWidth,innerHeight);
  drawSky(ctx,state.camera);
  const bands=sceneBands(), ground=bands.wallBottom, wallTop=bands.wallTop, off=state.camera;
  ctx.save();
  ctx.translate(playerScreen,ground);ctx.scale(state.zoom,state.zoom);ctx.translate(-playerScreen,-ground);
  drawSceneLayer(ctx,'behind',off,wallTop,ground,now);
  brickWall(ctx,off,wallTop,ground);
  drawWallMountedAssets(ctx,off,wallTop,ground,now);
  graffitiOldestFirst().forEach(g=>{const x=g.x*PX_PER_M-off;if(x<-180||x>innerWidth+180)return;drawGraffitiText(ctx,g,x,wallTop+(ground-wallTop)*g.y);});
  if(state.edit&&msg.value.trim())drawGraffitiText(ctx,{text:msg.value,font:selectedFont,color:selectedColor,angle:state.angle,size:selectedSize,wrap:selectedWrap},state.targetX*PX_PER_M-off,wallTop+(ground-wallTop)*state.targetY,true);
  groundBands(ctx,off,bands);
  const baselineFor=lane=>bands.walkwayTop+8+Math.max(0,Math.min(1,lane))*(bands.walkwayHeight-16);
  const basePlayerScale=Math.max(.75,Math.min(1.05,innerHeight/760));
  const depthScale=lane=>Math.max(.65,Math.min(1.18,basePlayerScale*(.78+lane*.28)));
  const playerX=state.x*PX_PER_M-off,playerBaseline=baselineFor(state.lane),playerScale=depthScale(state.lane);
  const foreground=[];
  sceneLayerItems('front').forEach(item=>{if(Number(item.y)<=1)return;const width=item.widthM*PX_PER_M,x=item.x*PX_PER_M-off;if(x+width/2<0||x-width/2>innerWidth)return;foreground.push({y:wallTop+item.y*(ground-wallTop),draw:()=>drawSceneItem(ctx,item,off,wallTop,ground,now)});});
  foreground.push({y:playerBaseline,draw:()=>{drawPerson(ctx,playerX,playerBaseline,playerScale,state,state.velocity/3.2,state.stride,movementEnergy);drawNameLabel(ctx,playerX,playerBaseline,playerScale,state.name,state.nameColor);}});
  state.others.filter(p=>p.id!==uid).forEach(p=>{const x=p.x*PX_PER_M-off;if(x>-100&&x<innerWidth+100){const baseline=baselineFor(.5),scale=depthScale(.5);foreground.push({y:baseline,draw:()=>{drawPerson(ctx,x,baseline,scale,{...p,dir:p.dir||1},0,0);drawNameLabel(ctx,x,baseline,scale,p.name,p.nameColor);}});}});
  foreground.sort((a,b)=>a.y-b.y).forEach(entry=>entry.draw());
  if(state.edit){
    const sx=state.section*SECTION_PX-off+PILLAR_PX,sw=SECTION_PX-PILLAR_PX,tx=state.targetX*PX_PER_M-off,ty=wallTop+(ground-wallTop)*state.targetY;
    ctx.save();ctx.strokeStyle='#f0c849';ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.strokeRect(sx+1,wallTop+1,sw-2,ground-wallTop-2);ctx.setLineDash([]);ctx.fillStyle='#f0c849';ctx.beginPath();ctx.arc(tx,ty,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#211d19';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(tx-12,ty);ctx.lineTo(tx+12,ty);ctx.moveTo(tx,ty-12);ctx.lineTo(tx,ty+12);ctx.stroke();ctx.restore();
  }
  ctx.restore();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t.timer);t.timer=setTimeout(()=>t.classList.remove('show'),2800);}
let graffitiIndexSource=null,graffitiSortSource=null,graffitiSortCache=[];
function graffitiOldestFirst(){if(graffitiSortSource===state.graffiti)return graffitiSortCache;graffitiSortSource=state.graffiti;graffitiSortCache=state.graffiti.map((g,index)=>({g,index})).sort((a,b)=>(Number(a.g.createdAt)||0)-(Number(b.g.createdAt)||0)||b.index-a.index).map(entry=>entry.g);return graffitiSortCache;}
function syncGraffitiIndex(){
  if(graffitiIndexSource===state.graffiti)return;graffitiIndexSource=state.graffiti;
  $('#graffitiCount').textContent=String(state.graffiti.length);
  const list=$('#graffitiIndexList');list.replaceChildren();list.hidden=state.graffiti.length===0;
  graffitiOldestFirst().forEach((g,index)=>{const item=document.createElement('li'),number=document.createElement('span'),content=document.createElement('div'),name=document.createElement('strong'),message=document.createElement('span');number.className='graffiti-index-number';number.textContent=`${index+1}.`;name.textContent=String(g.name||'Anonym').trim()||'Anonym';message.textContent=String(g.text||'');content.append(name,message);item.append(number,content);list.append(item);});
  $('#graffitiIndexEmpty').hidden=state.graffiti.length>0;
}
function setGraffitiIndex(open){const panel=$('#graffitiIndex'),button=$('#graffitiCountButton');panel.classList.toggle('open',open);panel.setAttribute('aria-hidden',String(!open));panel.inert=!open;button.setAttribute('aria-expanded',String(open));if(open)syncGraffitiIndex();}
function localItems(){try{return JSON.parse(localStorage.getItem('mur:graffiti')||'[]')}catch{return[]}}
function saveLocal(items){try{localStorage.setItem('mur:graffiti',JSON.stringify(items));}catch{}channel?.postMessage({type:'graffiti',items});}
function markWritten() {
  if (!WRITE_LIMIT_ENABLED) return;
  state.hasWritten=true;storeValue(WRITTEN_KEY,'1');channel?.postMessage({type:'written'});updateWriteAccess();
}
function writeLimitReached() { return WRITE_LIMIT_ENABLED && state.hasWritten; }
function updateWriteAccess() {
  if(!WRITE_LIMIT_ENABLED)state.hasWritten=false;
  const limited=writeLimitReached(),button=$('#writeButton');button.disabled=limited||state.savingGraffiti;
  button.innerHTML=limited?'<span>✓</span> Len návštevník':state.savingGraffiti?'<span>…</span> Ukladám':'<span>＋</span> Zanechať odkaz';
  $('#saveButton').disabled=limited||state.savingGraffiti||!$('#message').value.trim();
  if(limited)$('#editorNote').textContent='Svoj jediný odkaz si už zanechal. Múr môžeš ďalej navštevovať a čítať.';
  else if(!WRITE_LIMIT_ENABLED)$('#editorNote').textContent='DEV režim: odkazy môžeš pridávať bez obmedzenia.';
}

async function loadWorld(){
  state.graffiti=localItems();
  try{const r=await fetch('/api/graffiti',{headers:{'X-Writer-Id':visitorId}});if(!r.ok)throw 0;const data=await r.json();state.mode='shared';state.graffiti=data.items;state.hasWritten=WRITE_LIMIT_ENABLED&&(state.hasWritten||data.hasWritten);if(state.hasWritten)storeValue(WRITTEN_KEY,'1');$('#statusText').textContent='spoločná stena';$('#statusDot').classList.add('online');if(!state.hasWritten)$('#editorNote').textContent=WRITE_LIMIT_ENABLED?'Máš jeden odkaz. Po uložení ho uvidia aj ďalší návštevníci.':'DEV režim: odkazy môžeš pridávať bez obmedzenia.';}catch{$('#statusText').textContent='lokálna stena';}finally{updateWriteAccess();}
}
loadWorld();
channel?.addEventListener('message',e=>{if(e.data.type==='graffiti')state.graffiti=e.data.items;if(e.data.type==='presence')state.others=e.data.players;if(WRITE_LIMIT_ENABLED&&e.data.type==='written'){state.hasWritten=true;if(state.edit)closeEditor();updateWriteAccess();}});

setInterval(async()=>{
  if(!state.started)return;
  const me={id:uid,x:state.x,lane:state.lane,skin:state.skin,name:state.name,nameColor:state.nameColor,dir:state.dir};
  channel?.postMessage({type:'presence',players:[me]});
  if(state.mode==='shared')try{const r=await fetch('/api/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(me)});if(r.ok)state.others=(await r.json()).players;}catch{}
},3000);

$('#characterForm').addEventListener('change',e=>{if(e.target.name==='skin')state.skin=e.target.value;drawAvatar();});
$('#characterForm').addEventListener('submit',e=>{e.preventDefault();startMusic();state.name=$('#playerName').value.trim().slice(0,16);state.nameColor=$('#playerNameColor').value;state.started=true;$('#entry').classList.add('gone');canvas.focus();});
addEventListener('keydown',e=>{if(e.target.matches?.('input, textarea, select')||e.target.isContentEditable)return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(e.key==='Shift'&&!state.edit&&!state.sceneEditing){e.preventDefault();state.running=true;}if(['ArrowLeft','ArrowRight','a','d'].includes(key)&&!state.edit){e.preventDefault();state.keys.add(key);}});
addEventListener('keyup',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(e.key==='Shift')state.running=false;state.keys.delete(key);});
addEventListener('blur',()=>{state.running=false;state.keys.clear();state.moving=0;});
document.querySelectorAll('[data-move-x]').forEach(b=>{const end=()=>state.moving=0;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);state.moving=Number(b.dataset.moveX)});b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);b.addEventListener('lostpointercapture',end);});
document.querySelectorAll('[data-run]').forEach(button=>{const set=value=>{state.running=value;button.setAttribute('aria-pressed',String(value));};button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);set(true)});button.addEventListener('pointerup',()=>set(false));button.addEventListener('pointercancel',()=>set(false));button.addEventListener('lostpointercapture',()=>set(false));});
function setZoom(value){state.targetZoom=Math.max(1,Math.min(1.6,value));document.querySelectorAll('[data-zoom-value]').forEach(output=>{output.textContent=`${Math.round(state.targetZoom*100)}%`;});document.querySelectorAll('[data-zoom]').forEach(button=>{const next=state.targetZoom+Number(button.dataset.zoom);button.disabled=next<.99||next>1.61;});}
document.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>setZoom(state.targetZoom+Number(button.dataset.zoom))));
setZoom(state.targetZoom);
const desktopZoom=$('.desktop-zoom'),desktopZoomToggle=$('.desktop-zoom-toggle');
function setDesktopZoomMode(active){desktopZoom.classList.toggle('active',active);document.documentElement.classList.toggle('desktop-zoom-mode',active);desktopZoomToggle.setAttribute('aria-expanded',String(active));desktopZoomToggle.setAttribute('aria-label',active?'Ukončiť zoom a čistý režim':'Otvoriť zoom a čistý režim');if(active)setGraffitiIndex(false);}
desktopZoomToggle.addEventListener('click',()=>setDesktopZoomMode(!desktopZoom.classList.contains('active')));
addEventListener('keydown',event=>{if(event.key==='Escape'&&desktopZoom.classList.contains('active'))setDesktopZoomMode(false);});
setZoom(1);

$('#graffitiCountButton').addEventListener('click',()=>setGraffitiIndex(!$('#graffitiIndex').classList.contains('open')));
$('#graffitiIndexClose').addEventListener('click',()=>setGraffitiIndex(false));
addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#graffitiIndex').classList.contains('open'))setGraffitiIndex(false);});

function setPlacement(section=state.section,u=state.positionU,y=state.targetY){
  state.section=Math.max(0,Math.min(Math.floor(700*PX_PER_M/SECTION_PX),section));state.positionU=Math.max(.04,Math.min(.96,u));state.targetY=Math.max(.08,Math.min(.88,y));
  const usable=SECTION_PX-PILLAR_PX;state.targetX=Math.min(700,(state.section*SECTION_PX+PILLAR_PX+state.positionU*usable)/PX_PER_M);
  $('#editorMeter').textContent=state.targetX.toFixed(1).replace('.',',')+' m';updatePreview();
}
function openEditor(){
  if(writeLimitReached()){toast('Svoj jediný odkaz si už zanechal. Teraz si návštevník.');return;}
  setGraffitiIndex(false);
  state.edit=true;state.angle=0;$('#angle').value='0';$('#angleValue').textContent='0°';
  const worldPx=state.x*PX_PER_M;state.section=Math.floor(worldPx/SECTION_PX);
  const within=worldPx-state.section*SECTION_PX-PILLAR_PX,u=within/(SECTION_PX-PILLAR_PX);
  setPlacement(state.section,u,.5);$('#editor').classList.add('open');$('#editor').setAttribute('aria-hidden','false');$('#message').focus();
}
function closeEditor(){state.edit=false;$('#editor').classList.remove('open');$('#editor').setAttribute('aria-hidden','true');canvas.focus();}
$('#writeButton').addEventListener('click',openEditor);$('#editorClose').addEventListener('click',closeEditor);
function placeFromPicker(clientX,clientY){const picker=$('#positionPicker'),rect=picker.getBoundingClientRect();setPlacement(state.section,(clientX-rect.left)/rect.width,(clientY-rect.top)/rect.height);}
$('#positionPicker').addEventListener('pointerdown',e=>{e.preventDefault();placeFromPicker(e.clientX,e.clientY);});
$('#positionPicker').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const dx=e.key==='ArrowLeft'?-.03:e.key==='ArrowRight'?.03:0,dy=e.key==='ArrowUp'?-.05:e.key==='ArrowDown'?.05:0;setPlacement(state.section,state.positionU+dx,state.targetY+dy);});
$('#angle').addEventListener('input',e=>{state.angle=Number(e.target.value);$('#angleValue').textContent=`${state.angle>0?'+':''}${state.angle}°`;updatePreview();});
canvas.addEventListener('pointerdown',e=>{
  if(!state.edit)return;const bands=sceneBands(),wallTop=bands.wallTop,ground=bands.wallBottom,playerScreen=.38*innerWidth;
  const unzoomedX=playerScreen+(e.clientX-playerScreen)/state.zoom,unzoomedY=ground+(e.clientY-ground)/state.zoom;if(unzoomedY<wallTop||unzoomedY>ground)return;
  const worldX=unzoomedX+state.camera,section=Math.floor(worldX/SECTION_PX),within=worldX-section*SECTION_PX;
  if(within<PILLAR_PX){toast('Toto je pilier — vyber plochu medzi piliermi.');return;}
  setPlacement(section,(within-PILLAR_PX)/(SECTION_PX-PILLAR_PX),(unzoomedY-wallTop)/(ground-wallTop));toast('Miesto odkazu je vybrané.');
});

const msg=$('#message'), preview=$('#previewText');
function updatePreview(){
  const len=[...msg.value].length;$('#count').textContent=`${len}/${MESSAGE_LIMIT}`;$('#saveButton').disabled=writeLimitReached()||state.savingGraffiti||!msg.value.trim();
  preview.textContent=graffitiLines(msg.value||'TVOJ ODKAZ',selectedWrap).join('\n');preview.style.fontFamily=selectedFont;preview.style.color=selectedColor;
  preview.style.fontSize=`${Math.max(.75,Math.min(2.25,selectedSize/24))}rem`;preview.style.whiteSpace='pre-line';preview.style.lineHeight='.88';preview.style.textAlign='center';
  preview.style.setProperty('--preview-left',`${state.positionU*100}%`);preview.style.setProperty('--preview-top',`${state.targetY*100}%`);preview.style.setProperty('--preview-angle',`${state.angle}deg`);
}
msg.addEventListener('input',updatePreview);
$('#fontList').addEventListener('change',e=>{selectedFont=FONTS[Number(e.target.value)][1];updatePreview();});
$('#messageColor').addEventListener('input',e=>{selectedColor=e.target.value;$('#messageColorValue').textContent=selectedColor.toUpperCase();updatePreview();});
$('#messageSize').addEventListener('input',e=>{selectedSize=Math.max(18,Math.min(56,Number(e.target.value)));$('#messageSizeValue').textContent=`${selectedSize} px`;updatePreview();});
$('#messageWrap').addEventListener('change',e=>{selectedWrap=e.target.checked;updatePreview();});
$('#saveButton').addEventListener('click',async()=>{
  if(writeLimitReached()||state.savingGraffiti){toast('Každý prehliadač môže zanechať iba jeden odkaz.');return;}
  state.savingGraffiti=true;updateWriteAccess();
  const item={id:uid+'-'+Date.now().toString(16),name:state.name.trim()||'Anonym',text:[...msg.value.trim()].slice(0,MESSAGE_LIMIT).join(''),x:Number(state.targetX.toFixed(2)),y:Number(state.targetY.toFixed(3)),color:selectedColor,font:selectedFont,angle:state.angle,size:selectedSize,wrap:selectedWrap,createdAt:Date.now()};
  try{
    let saved=item;
    if(state.mode==='shared'){
      const writerId=WRITE_LIMIT_ENABLED?visitorId:`${visitorId}-${crypto.randomUUID?.()||Date.now().toString(16)}`;
      const r=await fetch('/api/graffiti',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...item,writerId})});
      if(r.status===409){markWritten();closeEditor();toast('Svoj jediný odkaz si už zanechal. Teraz si návštevník.');return;}
      if(!r.ok)throw new Error('server');
      saved=(await r.json()).item;
    }else if(WRITE_LIMIT_ENABLED&&storedValue(WRITTEN_KEY)==='1'){markWritten();closeEditor();toast('Svoj jediný odkaz si už zanechal.');return;}
    state.graffiti=[saved,...state.graffiti];saveLocal(state.graffiti);markWritten();closeEditor();msg.value='';toast(WRITE_LIMIT_ENABLED?'Tvoj jediný odkaz zostal na múre.':'Odkaz zostal na múre.');
  }catch{toast('Odkaz sa neuložil. Skús to znova, keď bude stena pripojená.');}
  finally{state.savingGraffiti=false;updatePreview();updateWriteAccess();}
});

if (import.meta.env.DEV) {
  import('./sceneEditor.js').then(({ mountSceneEditor }) => mountSceneEditor({
    canvas,
    getItems: () => structuredClone(state.sceneItems),
    setItems: items => { state.sceneItems = structuredClone(items); },
    getTerrain: () => structuredClone(state.terrain),
    setTerrain: terrain => { state.terrain = structuredClone(terrain); },
    getLanding: () => structuredClone(state.landing),
    setLanding: landing => { state.landing = structuredClone(landing); applyLandingText(); },
    getPlayerX: () => state.x,
    setSelected: id => { state.selectedSceneId = id; },
    setEditing: value => { state.sceneEditing = value; if (value && state.edit) closeEditor(); },
    getGraffitiCount: () => state.graffiti.length,
    clearGraffiti: () => {
      const removed = state.graffiti.length;
      state.graffiti = [];
      saveLocal([]);
      return removed;
    },
    screenToScene: (clientX, clientY) => {
      const bands=sceneBands(),wallTop=bands.wallTop,ground=bands.wallBottom;
      return { x: Math.max(0, Math.min(700, (clientX + state.camera) / PX_PER_M)), y: Math.max(-2.5, Math.min(5, (clientY - wallTop) / (ground - wallTop))) };
    },
    notify: toast
  }));
}
