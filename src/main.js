import './style.css';
import initialScene from './data/scene.json';
import initialTerrain from './data/terrain.json';
import initialLanding from './data/landing.json';
import initialLights from './data/lights.json';
import initialEvents from './data/events.json';

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
const NIGHT_LAMP_SRC = '/assets/scene/lampa_noc.png';
const isLampItem = item => String(item?.name||'').toLocaleLowerCase('sk').startsWith('lampa') || String(item?.src||'').toLowerCase().includes('lampa');
function automaticNightAmount(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 20 || hour < 5.5) return 1;
  if (hour >= 18) return (hour - 18) / 2;
  if (hour < 7.5) return (7.5 - hour) / 2;
  return 0;
}
function storedValue(key) { try { return localStorage.getItem(key); } catch { return null; } }
function storeValue(key,value) { try { localStorage.setItem(key,value); } catch {} }
function removeStoredValue(key) { try { localStorage.removeItem(key); } catch {} }
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
  sceneItems: structuredClone(initialScene), lightSources: structuredClone(initialLights), events: structuredClone(initialEvents), selectedSceneId: null, selectedLightId: null, selectedEventId: null, followedEventId: null, followCameraX: null, followCameraSnap: false, editorLayer: 'assets', sceneEditing: false,
  terrain: structuredClone(initialTerrain),
  landing: structuredClone(initialLanding),
  hasWritten: WRITE_LIMIT_ENABLED && storedValue(WRITTEN_KEY) === '1', savingGraffiti: false,
  mode: 'local', keys: new Set(), last: performance.now(), environmentMode: 'auto', nightMix: automaticNightAmount(), accessGranted: false
};
const uid = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const EVENT_SESSION_START = Date.now();
const EVENT_PREVIEW_STARTS = new Map();
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('mur-narekov') : null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileViewport = matchMedia('(max-width: 760px), (pointer: coarse), (any-pointer: coarse)');
const gameMotionReduced = () => reducedMotion.matches && !mobileViewport.matches;
const playerScreenX = () => innerWidth * (mobileViewport.matches ? .5 : .38);
document.documentElement.classList.add('access-locked');

document.querySelector('#app').innerHTML = `
  <main id="game" aria-label="Múr nárekov, interaktívna prechádzka">
    <section class="access-gate" id="accessGate" aria-label="Vstup s heslom">
      <img class="access-gate-poster" src="/assets/access/p_01.png" alt="Múr nárekov 0.01 beta">
      <form class="access-gate-form" id="accessGateForm" aria-label="Prihlásenie">
        <label class="sr-only" for="accessPassword">Heslo</label>
        <div><input id="accessPassword" name="password" type="password" maxlength="128" autocomplete="current-password" placeholder="Heslo" required><button type="submit" aria-label="Vstúpiť">→</button></div>
        <output id="accessGateStatus" role="status" aria-live="polite"></output>
      </form>
    </section>
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
    <button class="mobile-ui-toggle" id="mobileUiToggle" type="button" aria-pressed="false" aria-label="Skryť spodné ovládanie">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.6"></circle><path class="eye-slash" d="m4 4 16 16"></path></svg>
    </button>
    <button class="write-button" id="writeButton" type="button"><span>＋</span> Zanechať odkaz</button>
    <div class="touch-controls" aria-label="Pohyb po chodníku">
      <button class="touch-direction touch-left" data-move-x="-1" aria-label="Kráčať doľava"></button>
      <button class="touch-direction touch-right" data-move-x="1" aria-label="Kráčať doprava"></button>
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
      <footer class="entry-footer">
        <p class="entry-foot" data-landing="footer"></p>
        <a class="entry-instagram" href="https://www.instagram.com/lazy_carpathian_dev/" target="_blank" rel="noopener noreferrer" aria-label="Instagram Lazy Carpathian Dev">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4.25"></circle><circle class="entry-instagram-dot" cx="17.4" cy="6.7" r="1"></circle></svg>
          <span>Lazy Carpathian Dev</span>
        </a>
      </footer>
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
const accessGate = $('#accessGate');
const accessGateForm = $('#accessGateForm');
const accessPassword = $('#accessPassword');
const accessGateStatus = $('#accessGateStatus');
const gatedElements = [...$('#game').children].filter(element=>element!==accessGate);

function setAccessGranted(granted) {
  state.accessGranted=granted;
  document.documentElement.classList.toggle('access-granted',granted);
  document.documentElement.classList.toggle('access-locked',!granted);
  gatedElements.forEach(element=>{element.inert=!granted;});
  if(granted){accessGate.classList.add('unlocked');accessGate.setAttribute('aria-hidden','true');setTimeout(()=>{accessGate.hidden=true;},460);}
  else{accessGate.hidden=false;accessGate.classList.remove('unlocked');accessGate.removeAttribute('aria-hidden');accessPassword.focus();}
}

async function verifyStoredAccess() {
  try{const response=await fetch('/api/access',{credentials:'same-origin',cache:'no-store'}),data=await response.json().catch(()=>({}));if(response.ok&&data.authenticated)return setAccessGranted(true);accessGateStatus.textContent=data.error||'';accessGateForm.classList.toggle('has-error',Boolean(data.error));}
  catch{accessGateForm.classList.add('has-error');accessGateStatus.textContent='Prístup sa nepodarilo overiť. Skús to znova.';}
  accessGateForm.querySelector('button').disabled=false;setAccessGranted(false);
}

accessGateForm.addEventListener('submit',async event=>{
  event.preventDefault();const button=accessGateForm.querySelector('button');button.disabled=true;accessGateStatus.textContent='Overujem heslo…';accessGateForm.classList.remove('has-error');
  try{const response=await fetch('/api/access',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:accessPassword.value})}),data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Heslo sa nepodarilo overiť.');accessPassword.value='';setAccessGranted(true);}
  catch(error){accessGateForm.classList.add('has-error');accessGateStatus.textContent=error.message;accessPassword.select();button.disabled=false;}
});
accessGateForm.querySelector('button').disabled=true;
verifyStoredAccess();

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
let selectedFont = FONTS[0][1], selectedColor = '#f2e8d5', selectedSize = 32, selectedWrap = false, dpr = 1;
let daySkyGradient = null, daySkyGlow = null, nightSkyGradient = null, nightSkyGlow = null;
let lastEnvironmentClockCheck = 0, automaticNightTarget = automaticNightAmount();
const sceneImages = new Map();
const sceneImageQueue = [];
const networkInfo = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const sceneImageConcurrency = networkInfo?.saveData || /(^|-)2g$/.test(networkInfo?.effectiveType || '') ? 2 : mobileViewport.matches ? 3 : 4;
let activeSceneImageLoads = 0, sceneImagePumpScheduled = false;
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
  daySkyGradient=ctx.createLinearGradient(0,0,0,innerHeight*.72);
  daySkyGradient.addColorStop(0,'#87999a');daySkyGradient.addColorStop(.52,'#b8beb5');daySkyGradient.addColorStop(1,'#d8c9aa');
  daySkyGlow=ctx.createRadialGradient(innerWidth*.78,innerHeight*.19,0,innerWidth*.78,innerHeight*.19,innerWidth*.32);
  daySkyGlow.addColorStop(0,'rgba(238,220,174,.36)');daySkyGlow.addColorStop(1,'rgba(238,220,174,0)');
  nightSkyGradient=ctx.createLinearGradient(0,0,0,innerHeight*.72);
  nightSkyGradient.addColorStop(0,'#111827');nightSkyGradient.addColorStop(.58,'#283245');nightSkyGradient.addColorStop(1,'#51535b');
  nightSkyGlow=ctx.createRadialGradient(innerWidth*.76,innerHeight*.16,0,innerWidth*.76,innerHeight*.16,innerWidth*.24);
  nightSkyGlow.addColorStop(0,'rgba(215,219,198,.14)');nightSkyGlow.addColorStop(1,'rgba(215,219,198,0)');
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
  // Chôdza je dôležitá spätná väzba ovládania. Pri obmedzenom pohybe ju iba
  // stlmíme; úplné vypnutie nechávalo hráča na niektorých tabletoch kĺzať.
  const rawEnergy=Math.min(1,walkEnergy),energy=rawEnergy*(gameMotionReduced()?.45:1),phase=((stride%(Math.PI*2))+Math.PI*2)%(Math.PI*2),frame=rawEnergy>.015?Math.floor(phase/(Math.PI/2))%4:0;
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
const STAR_FIELD = Array.from({length:96},(_,index)=>({
  x:(index*197.3+(index%7)*83.1)%2600,
  y:.025+((index*47)%440)/1000,
  radius:.55+(index%5)*.18,
  phase:(index*1.73)%(Math.PI*2)
}));

function cloudShape(c,x,y,w,h,alpha) {
  c.save();c.translate(x,y);c.globalAlpha=alpha;c.fillStyle='#e5e2d7';c.beginPath();
  c.moveTo(-w*.52,h*.1);c.bezierCurveTo(-w*.46,-h*.35,-w*.29,-h*.4,-w*.2,-h*.12);
  c.bezierCurveTo(-w*.1,-h*.68,w*.12,-h*.7,w*.2,-h*.2);c.bezierCurveTo(w*.34,-h*.48,w*.52,-h*.2,w*.5,h*.12);
  c.bezierCurveTo(w*.34,h*.42,-w*.34,h*.46,-w*.52,h*.1);c.fill();c.restore();
}

function drawSky(c,offset,now) {
  const night=state.nightMix;
  c.fillStyle=daySkyGradient;c.fillRect(0,0,innerWidth,innerHeight);
  c.fillStyle=daySkyGlow;c.fillRect(0,0,innerWidth,innerHeight*.55);
  if(night>.001){c.save();c.globalAlpha=night;c.fillStyle=nightSkyGradient;c.fillRect(0,0,innerWidth,innerHeight);c.fillStyle=nightSkyGlow;c.fillRect(0,0,innerWidth,innerHeight*.5);c.restore();}
  if(night>.02){
    const starDrift=(offset*.018)%2600;c.save();c.fillStyle='#f1ecd8';
    for(let repeat=-1;repeat<=1;repeat++)STAR_FIELD.forEach(star=>{const x=star.x+repeat*2600-starDrift;if(x<-3||x>innerWidth+3)return;const twinkle=gameMotionReduced()?.82:.72+Math.sin(now*.0015+star.phase)*.18;c.globalAlpha=night*twinkle;c.beginPath();c.arc(x,innerHeight*star.y,star.radius,0,Math.PI*2);c.fill();});
    c.restore();
  }
  const drift=(offset*.045)%2600;
  for(let repeat=-1;repeat<=1;repeat++)CLOUD_BANKS.forEach(cloud=>cloudShape(c,cloud.x+repeat*2600-drift,innerHeight*cloud.y,cloud.w,cloud.h,cloud.a*(1-night*.82)));
}

function environmentTarget(now) {
  if(state.environmentMode==='day')return 0;
  if(state.environmentMode==='night')return 1;
  if(now-lastEnvironmentClockCheck>30000){lastEnvironmentClockCheck=now;automaticNightTarget=automaticNightAmount();}
  return automaticNightTarget;
}
function visibilityAmount(mode) { return mode==='day'?1-state.nightMix:mode==='night'?state.nightMix:1; }

function drawNightShade(c,amount) {
  if(amount<=.001)return;
  c.save();c.globalCompositeOperation='multiply';c.fillStyle=`rgba(20,25,39,${(.46*amount).toFixed(3)})`;c.fillRect(-innerWidth*2,-innerHeight*2,innerWidth*5,innerHeight*5);c.restore();
}

function lampBulbPoint(item,offset,wallTop,ground) {
  const image=loadedSceneImage(item.src),ratio=image?.naturalWidth?image.naturalHeight/image.naturalWidth:500/333;
  const width=item.widthM*PX_PER_M,height=width*ratio,baseline=wallTop+item.y*(ground-wallTop),angle=(Number(item.rotation)||0)*Math.PI/180;
  const localX=-width*.12,localY=-height*.955,x=item.x*PX_PER_M-offset;
  return {x:x+localX*Math.cos(angle)-localY*Math.sin(angle),y:baseline+localX*Math.sin(angle)+localY*Math.cos(angle)};
}

function resolveLightPoint(light,offset,wallTop,ground) {
  const lamp=light.lampId&&state.sceneItems.find(item=>item.id===light.lampId&&isLampItem(item));
  if(lamp){const point=lampBulbPoint(lamp,offset,wallTop,ground);return{x:point.x+(Number(light.offsetX)||0)*PX_PER_M,y:point.y+(Number(light.offsetY)||0)*PX_PER_M};}
  return{x:(Number(light.x)||0)*PX_PER_M-offset,y:wallTop+(Number(light.y)||0)*(ground-wallTop)};
}

function flickerAmount(light,now) {
  if(light.flicker!==true)return 1;
  if(gameMotionReduced())return .72;
  const seed=[...String(light.id||'')].reduce((sum,char)=>sum+char.charCodeAt(0),0),step=Math.floor(now/82);
  const raw=Math.sin((step+seed)*12.9898)*43758.5453,noise=raw-Math.floor(raw);
  if(noise>.94)return .05;if(noise>.84)return .38;return .9+noise*.1;
}

function lightStrength(light,now) { return state.nightMix*Math.max(0,Math.min(2,Number(light.intensity)||0))*flickerAmount(light,now); }
function lampNightFactor(item,now) {
  return state.lightSources.filter(light=>light.lampId===item.id).reduce((strongest,light)=>Math.max(strongest,lightStrength(light,now)),0);
}
function lightRgb(value) { const match=/^#([0-9a-f]{6})$/i.exec(String(value||'')),hex=match?match[1]:'ffd080';return[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]; }
function lightConePath(c,length,width) { c.beginPath();c.moveTo(-7,3);c.quadraticCurveTo(-width*.34,length*.43,-width*.5,length);c.lineTo(width*.5,length);c.quadraticCurveTo(width*.34,length*.43,7,3);c.closePath(); }

function drawLightSources(c,offset,wallTop,ground,now) {
  if(state.nightMix<=.02)return;
  c.save();c.globalCompositeOperation='screen';
  state.lightSources.forEach(light=>{
    const amount=lightStrength(light,now);if(amount<=.01)return;
    const point=resolveLightPoint(light,offset,wallTop,ground),angle=(Number(light.angle)||0)*Math.PI/180;
    if(point.x<-500||point.x>innerWidth+500||point.y<-600||point.y>innerHeight+300)return;
    const coneLength=Math.max(48,Math.min(1440,(Number(light.lengthM)||10)*PX_PER_M)),coneWidth=Math.max(24,Math.min(960,(Number(light.widthM)||7)*PX_PER_M)),radius=Math.max(10,Math.min(280,(Number(light.haloM)||2.4)*PX_PER_M));
    const [red,green,blue]=lightRgb(light.color),alpha=Math.min(1.5,amount);
    const softness=Math.max(0,Math.min(1,Number(light.softness??.72))),layers=softness>.01?Math.max(4,Math.round(4+softness*8)):1;
    c.save();c.translate(point.x,point.y);c.rotate(angle);
    for(let layer=0;layer<layers;layer++){
      const progress=layers===1?1:layer/(layers-1),widthScale=layers===1?1:1-progress*softness*.68,weight=layers===1?1:.055+progress*.075;
      lightConePath(c,coneLength,coneWidth*widthScale);
      const exposure=c.createRadialGradient(0,coneLength*.04,2,0,coneLength*.3,coneLength*.92);exposure.addColorStop(0,`rgba(255,250,232,${Math.min(.82,.52*alpha)*weight})`);exposure.addColorStop(.38,`rgba(255,248,224,${Math.min(.58,.34*alpha)*weight})`);exposure.addColorStop(.76,`rgba(255,245,218,${Math.min(.3,.16*alpha)*weight})`);exposure.addColorStop(1,'rgba(255,245,218,0)');c.fillStyle=exposure;c.fill();
      lightConePath(c,coneLength,coneWidth*widthScale);const beam=c.createRadialGradient(0,0,3,0,coneLength*.34,coneLength*.94);beam.addColorStop(0,`rgba(${red},${green},${blue},${Math.min(.72,.48*alpha)*weight})`);beam.addColorStop(.4,`rgba(${red},${green},${blue},${Math.min(.48,.27*alpha)*weight})`);beam.addColorStop(1,`rgba(${red},${green},${blue},0)`);c.fillStyle=beam;c.fill();
    }c.restore();
    c.save();c.translate(point.x,point.y);c.scale(1,1.15);const glow=c.createRadialGradient(0,0,2,0,0,radius);glow.addColorStop(0,`rgba(255,252,235,${Math.min(.98,.82*alpha)})`);glow.addColorStop(.16,`rgba(${red},${green},${blue},${Math.min(.78,.56*alpha)})`);glow.addColorStop(.48,`rgba(${red},${green},${blue},${Math.min(.45,.28*alpha)})`);glow.addColorStop(1,`rgba(${red},${green},${blue},0)`);c.fillStyle=glow;c.beginPath();c.arc(0,0,radius,0,Math.PI*2);c.fill();c.restore();
  });c.restore();
}

function drawLightGizmos(c,offset,wallTop,ground) {
  if(!import.meta.env.DEV||!state.sceneEditing||state.editorLayer!=='lights')return;
  state.lightSources.forEach(light=>{const point=resolveLightPoint(light,offset,wallTop,ground),selected=light.id===state.selectedLightId,length=Math.max(48,(Number(light.lengthM)||10)*PX_PER_M),width=Math.max(24,(Number(light.widthM)||7)*PX_PER_M),angle=(Number(light.angle)||0)*Math.PI/180;c.save();c.translate(point.x,point.y);c.rotate(angle);c.strokeStyle=selected?'#f0c849':'rgba(240,201,73,.55)';c.lineWidth=selected?2:1;c.setLineDash(selected?[7,5]:[3,5]);c.beginPath();c.moveTo(0,0);c.lineTo(-width*.5,length);c.moveTo(0,0);c.lineTo(width*.5,length);c.stroke();c.setLineDash([]);c.fillStyle=selected?'#f0c849':'rgba(240,201,73,.72)';c.beginPath();c.arc(0,0,selected?7:4,0,Math.PI*2);c.fill();c.restore();});
}

function eventStartTime(event) {
  if(import.meta.env.DEV&&state.sceneEditing&&EVENT_PREVIEW_STARTS.has(event.id))return EVENT_PREVIEW_STARTS.get(event.id);
  const scheduled=Date.parse(String(event.startAt||''));
  return Number.isFinite(scheduled)?scheduled:EVENT_SESSION_START+Math.max(0,Number(event.startDelaySec)||0)*1000;
}

function walkerEventState(event,wallNow) {
  const elapsed=(wallNow-eventStartTime(event))/1000;if(elapsed<0)return null;
  const left=Math.min(Number.isFinite(Number(event.startX))?Number(event.startX):0,Number.isFinite(Number(event.endX))?Number(event.endX):700),rightEdge=Math.max(Number.isFinite(Number(event.startX))?Number(event.startX):0,Number.isFinite(Number(event.endX))?Number(event.endX):700),movesRight=event.direction!=='left',from=movesRight?left:rightEdge,to=movesRight?rightEdge:left,speed=Math.max(.2,Number(event.speedMps)||4),travel=Math.max(.05,Math.abs(to-from)/speed),cycle=travel+Math.max(0,Number(event.loopDelaySec)||0),run=Math.floor(elapsed/cycle);
  const runCount=Math.max(0,Math.round(Number(event.runCount)||0));if(runCount&&run>=runCount)return null;
  const within=elapsed-run*cycle;if(within>travel)return null;
  const progress=gameMotionReduced()?.5:within/travel;
  return{x:from+(to-from)*progress,dir:to>=from?1:-1,progress};
}

function activeWalkerSpeech(event,wallNow) {
  if(event.speechEnabled!==true)return null;const messages=(Array.isArray(event.speechMessages)?event.speechMessages:[]).map(String).filter(Boolean);if(!messages.length)return null;
  const elapsed=(wallNow-eventStartTime(event))/1000-Math.max(0,Number(event.speechDelaySec)||0),duration=Math.max(.5,Number(event.speechDurationSec)||3),every=Math.max(duration+.25,Number(event.speechEverySec)||12);if(elapsed<0)return null;const slot=Math.floor(elapsed/every),age=elapsed-slot*every;if(age>duration)return null;const edge=Math.min(.2,duration*.2),opacity=gameMotionReduced()?1:Math.min(1,age/edge,(duration-age)/edge);return{text:messages[slot%messages.length],opacity};
}

function drawWalkerSpeech(c,event,speech,x,anchorY) {
  if(!speech)return;const fontSize=Math.max(12,Math.min(42,Number(event.speechFontSize)||20)),maxWidth=Math.max(120,Math.min(520,(Number(event.speechWidthM)||5)*PX_PER_M)),padding=Math.max(10,fontSize*.65);c.save();c.globalAlpha=visibilityAmount(event.visibility)*speech.opacity;c.font=`700 ${fontSize}px "Barlow Condensed",sans-serif`;c.textBaseline='middle';c.textAlign='left';const lines=wrapBubbleText(c,speech.text,maxWidth-padding*2),lineHeight=fontSize*1.16,textWidth=Math.max(...lines.map(line=>c.measureText(line).width),40),width=Math.min(maxWidth,textWidth+padding*2),height=lines.length*lineHeight+padding*1.5,left=x-width/2,top=anchorY-height-14;c.fillStyle=event.speechBackgroundColor||'#f2eadb';c.strokeStyle=event.speechTextColor||'#25211d';c.lineWidth=2;c.beginPath();c.roundRect(left,top,width,height,Math.min(14,fontSize*.55));c.fill();c.stroke();c.beginPath();c.moveTo(x-10,top+height-1);c.lineTo(x,anchorY);c.lineTo(x+12,top+height-1);c.closePath();c.fill();c.stroke();c.fillStyle=event.speechTextColor||'#25211d';lines.forEach((line,index)=>c.fillText(line,left+padding,top+padding*.75+lineHeight*(index+.5)));c.restore();
}

function drawEventWalker(c,event,x,baseline,offset,now,direction=1,speech=null) {
  const visibility=visibilityAmount(event.visibility);if(visibility<=.001)return;
  const distance=Math.abs(x*PX_PER_M-offset-innerWidth*.5),image=sceneImage(event.src,distance);if(!image.complete||!image.naturalWidth)return;
  const frames=Math.max(2,Math.min(60,Math.round(Number(event.frames)||5))),animated=event.animated===true&&frames>1,vertical=event.frameDirection==='vertical';
  const sourceWidth=animated&&!vertical?image.naturalWidth/frames:image.naturalWidth,sourceHeight=animated&&vertical?image.naturalHeight/frames:image.naturalHeight;
  const frame=animated&&!gameMotionReduced()?Math.floor(now*Math.max(.5,Number(event.fps)||6)/1000)%frames:0,sourceX=animated&&!vertical?frame*sourceWidth:0,sourceY=animated&&vertical?frame*sourceHeight:0;
  const width=Math.max(.2,Number(event.widthM)||3)*PX_PER_M,height=width*sourceHeight/sourceWidth,screenX=x*PX_PER_M-offset,dir=direction<0?1:-1;
  if(screenX+width<0||screenX-width>innerWidth)return;c.save();c.globalAlpha=visibility;c.translate(screenX,baseline);c.scale(dir,1);c.drawImage(image,sourceX,sourceY,sourceWidth,sourceHeight,-width/2,-height,width,height);
  if(import.meta.env.DEV&&state.sceneEditing&&!state.followedEventId&&state.editorLayer==='events'&&event.id===state.selectedEventId){c.strokeStyle='#f0c849';c.lineWidth=2;c.setLineDash([7,5]);c.strokeRect(-width/2,-height,width,height);c.setLineDash([]);}c.restore();drawWalkerSpeech(c,event,speech,screenX,baseline-height-8);
}

function activeTextBubbles(event,wallNow) {
  const start=eventStartTime(event),elapsed=(wallNow-start)/1000;if(elapsed<0)return[];
  const count=Math.max(1,Math.min(20,Math.round(Number(event.bubblesPerSequence)||1))),interval=Math.max(.2,Number(event.bubbleIntervalSec)||3),duration=Math.max(.5,Number(event.bubbleDurationSec)||2.5),span=(count-1)*interval+duration,repeat=Math.max(span,Number(event.repeatEverySec)||span),sequence=Math.floor(elapsed/repeat),sequenceCount=Math.max(1,Math.round(Number(event.sequenceCount)||1));if(event.repeatEvent===false&&sequence>=sequenceCount)return[];
  const within=elapsed-sequence*repeat,legacy=(Array.isArray(event.messages)?event.messages:[]).map(String),configured=Array.isArray(event.sequences)?event.sequences:[],messages=configured.length?(configured[sequence%configured.length]||[]):legacy;if(!messages.some(Boolean))return[];
  const active=[];for(let index=0;index<count;index++){const age=within-index*interval,text=String(messages[index]??legacy[(sequence*count+index)%Math.max(1,legacy.length)]??'').trim();if(age<0||age>duration||!text)continue;const edge=Math.min(.18,duration*.2),opacity=gameMotionReduced()?1:Math.min(1,age/edge,(duration-age)/edge);active.push({text,opacity,index});}return active;
}

function wrapBubbleText(c,text,maxWidth) {
  const words=String(text).trim().split(/\s+/),lines=[];let line='';words.forEach(word=>{const candidate=line?`${line} ${word}`:word;if(line&&c.measureText(candidate).width>maxWidth){lines.push(line);line=word;}else line=candidate;});if(line)lines.push(line);return lines.slice(0,6);
}

function drawTextBubble(c,event,bubble,offset,wallTop,ground) {
  const visibility=visibilityAmount(event.visibility),x=(Number(event.x)||0)*PX_PER_M-offset,y=wallTop+(Number(event.y)||0)*(ground-wallTop)-bubble.index*8;if(x<-500||x>innerWidth+500||visibility<=.001)return;
  const fontSize=Math.max(12,Math.min(42,Number(event.fontSize)||20)),maxWidth=Math.max(120,Math.min(520,(Number(event.widthM)||5)*PX_PER_M)),padding=Math.max(10,fontSize*.65);c.save();c.globalAlpha=visibility*bubble.opacity;c.font=`700 ${fontSize}px "Barlow Condensed",sans-serif`;c.textBaseline='middle';c.textAlign='left';const lines=wrapBubbleText(c,bubble.text,maxWidth-padding*2),lineHeight=fontSize*1.16,textWidth=Math.max(...lines.map(line=>c.measureText(line).width),40),width=Math.min(maxWidth,textWidth+padding*2),height=lines.length*lineHeight+padding*1.5,left=x-width/2,top=y-height;
  c.fillStyle=event.backgroundColor||'#f2eadb';c.strokeStyle=event.textColor||'#25211d';c.lineWidth=2;c.beginPath();c.roundRect(left,top,width,height,Math.min(14,fontSize*.55));c.fill();c.stroke();c.beginPath();c.moveTo(x-10,y-1);c.lineTo(x,y+14);c.lineTo(x+12,y-1);c.closePath();c.fill();c.stroke();c.fillStyle=event.textColor||'#25211d';lines.forEach((line,index)=>c.fillText(line,left+padding,top+padding*.75+lineHeight*(index+.5)));c.restore();
}

function drawEventGizmos(c,offset,wallTop,ground) {
  if(!import.meta.env.DEV||!state.sceneEditing||state.followedEventId||state.editorLayer!=='events')return;state.events.forEach(event=>{const selected=event.id===state.selectedEventId;c.save();c.fillStyle=selected?'#f0c849':'rgba(240,201,73,.72)';c.strokeStyle='#25211d';c.lineWidth=2;if(event.type==='text'){const x=(Number(event.x)||0)*PX_PER_M-offset,y=wallTop+(Number(event.y)||0)*(ground-wallTop);c.beginPath();c.arc(x,y,selected?7:4,0,Math.PI*2);c.fill();if(selected)c.stroke();}else{const start=(Number.isFinite(Number(event.startX))?Number(event.startX):0)*PX_PER_M-offset,end=(Number.isFinite(Number(event.endX))?Number(event.endX):700)*PX_PER_M-offset,pathY=Number.isFinite(Number(event.pathY))?Number(event.pathY):1.35,y=wallTop+pathY*(ground-wallTop);c.setLineDash([7,5]);c.beginPath();c.moveTo(start,y);c.lineTo(end,y);c.stroke();c.setLineDash([]);[start,end].forEach((x,index)=>{c.beginPath();c.arc(x,y,selected?7:4,0,Math.PI*2);c.fill();if(selected)c.stroke();c.fillStyle='#25211d';c.font='700 10px sans-serif';c.textAlign='center';c.fillText(index?'B':'A',x,y-11);c.fillStyle=selected?'#f0c849':'rgba(240,201,73,.72)';});}c.restore();});
}

function pumpSceneImageQueue() {
  sceneImageQueue.sort((a,b)=>a.priority-b.priority);
  while(activeSceneImageLoads<sceneImageConcurrency&&sceneImageQueue.length){
    const record=sceneImageQueue.shift();
    if(record.status!=='queued')continue;
    record.status='loading';activeSceneImageLoads++;
    record.image.fetchPriority=record.priority<=innerWidth?'high':'low';
    const settle=status=>{if(record.status!=='loading')return;record.status=status;activeSceneImageLoads--;pumpSceneImageQueue();};
    record.image.onload=()=>settle('loaded');record.image.onerror=()=>settle('error');record.image.src=record.src;
  }
}

function scheduleSceneImagePump() {
  if(sceneImagePumpScheduled)return;
  sceneImagePumpScheduled=true;
  queueMicrotask(()=>{sceneImagePumpScheduled=false;pumpSceneImageQueue();});
}

function sceneImage(src,priority=Infinity) {
  let record=sceneImages.get(src);
  if(!record){
    const image=new Image();image.decoding='async';
    record={src,image,status:'queued',priority};sceneImages.set(src,record);sceneImageQueue.push(record);scheduleSceneImagePump();
  }else if(record.status==='queued'&&priority<record.priority){record.priority=priority;scheduleSceneImagePump();}
  return record.image;
}

function loadedSceneImage(src) {
  const record=sceneImages.get(src);
  return record?.status==='loaded'?record.image:null;
}

function scenePreloadPadding() {
  if(networkInfo?.saveData||/(^|-)2g$/.test(networkInfo?.effectiveType||''))return Math.max(innerWidth*.5,20*PX_PER_M);
  return Math.max(innerWidth,mobileViewport.matches?35*PX_PER_M:48*PX_PER_M);
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
    if (mobileViewport.matches && item.src.includes('1784285163468-duha')) return;
    const visibility=visibilityAmount(item.visibility);if(visibility<=.001)return;
    let width = item.widthM * PX_PER_M;
    const x = item.x * PX_PER_M - offset;
    const distanceFromViewport=x+width/2<0?-(x+width/2):x-width/2>innerWidth?x-width/2-innerWidth:0;
    if(distanceFromViewport>scenePreloadPadding())return;
    const dayImage=sceneImage(item.src,distanceFromViewport),lamp=isLampItem(item),nightFactor=lamp?Math.min(1,lampNightFactor(item,now)):0;
    const nightImage=lamp&&nightFactor>.001?sceneImage(NIGHT_LAMP_SRC,distanceFromViewport):null;
    const dayReady=dayImage.complete&&dayImage.naturalWidth,nightReady=nightImage?.complete&&nightImage.naturalWidth;
    const image=dayReady?dayImage:nightReady?nightImage:null;
    if (!image) return;
    const frames = Math.max(2, Math.min(60, Math.round(Number(item.frames) || 5)));
    const animated = item.animated === true && frames > 1;
    const vertical = item.frameDirection === 'vertical';
    const sourceWidth = vertical ? image.naturalWidth : image.naturalWidth / frames;
    const sourceHeight = vertical ? image.naturalHeight / frames : image.naturalHeight;
    const fps = Math.max(.5, Math.min(30, Number(item.fps) || 6));
    const phase = Math.max(0, Math.min(1, Number(item.phase) || 0));
    const frame = animated && !gameMotionReduced() ? Math.floor(now * fps / 1000 + phase * frames) % frames : 0;
    const sourceX = animated && !vertical ? frame * sourceWidth : 0;
    const sourceY = animated && vertical ? frame * sourceHeight : 0;
    const displaySourceWidth = animated ? sourceWidth : image.naturalWidth;
    const displaySourceHeight = animated ? sourceHeight : image.naturalHeight;
    const baseline = wallTop + item.y * (ground - wallTop);
    const originalHeight = width * displaySourceHeight / displaySourceWidth;
    if (mobileViewport.matches && item.layer === 'behind') {
      const availableHeight = Math.max(120, baseline - 12);
      if (originalHeight > availableHeight) width *= availableHeight / originalHeight;
    }
    const height = width * displaySourceHeight / displaySourceWidth;
    if (x + width / 2 < 0 || x - width / 2 > innerWidth) return;
    c.save(); c.translate(x, baseline); c.rotate(item.rotation * Math.PI / 180);
    if(lamp&&nightReady){
      if(dayReady&&nightFactor<.999){c.globalAlpha=visibility*(1-nightFactor);c.drawImage(dayImage,sourceX,sourceY,displaySourceWidth,displaySourceHeight,-width/2,-height,width,height);}
      c.globalAlpha=visibility*(dayReady?nightFactor:1);c.drawImage(nightImage,sourceX,sourceY,displaySourceWidth,displaySourceHeight,-width/2,-height,width,height);c.globalAlpha=1;
    }else{c.globalAlpha=visibility;c.drawImage(image, sourceX, sourceY, displaySourceWidth, displaySourceHeight, -width / 2, -height, width, height);c.globalAlpha=1;}
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

function screenToWorldPoint(clientX,clientY) {
  const bands=sceneBands(),ground=bands.wallBottom,playerScreen=playerScreenX();
  const screenX=playerScreen+(clientX-playerScreen)/state.zoom;
  const screenY=ground+(clientY-ground)/state.zoom;
  return {bands,screenX,screenY,x:(screenX+state.camera)/PX_PER_M,y:(screenY-bands.wallTop)/(ground-bands.wallTop)};
}

function pickSceneItem(clientX,clientY) {
  const point=screenToWorldPoint(clientX,clientY),wallTop=point.bands.wallTop,ground=point.bands.wallBottom;
  const foreground=state.sceneItems.filter(item=>item.layer==='front'&&Number(item.y)>1).sort((a,b)=>Number(a.y)-Number(b.y)).reverse();
  const wallItems=state.sceneItems.filter(item=>item.layer==='front'&&Number(item.y)<=1).reverse();
  const behind=state.sceneItems.filter(item=>item.layer==='behind').reverse();
  for(const item of [...foreground,...wallItems,...behind]){
    if(mobileViewport.matches&&item.src.includes('1784285163468-duha'))continue;
    if(item.layer==='behind'&&point.screenY>wallTop)continue;
    const image=loadedSceneImage(item.src);if(!image)continue;
    const frames=Math.max(2,Math.min(60,Math.round(Number(item.frames)||5))),animated=item.animated===true&&frames>1,vertical=item.frameDirection==='vertical';
    const sourceWidth=animated&&!vertical?image.naturalWidth/frames:image.naturalWidth;
    const sourceHeight=animated&&vertical?image.naturalHeight/frames:image.naturalHeight;
    let width=item.widthM*PX_PER_M;
    const baseline=wallTop+item.y*(ground-wallTop),originalHeight=width*sourceHeight/sourceWidth;
    if(mobileViewport.matches&&item.layer==='behind'){
      const availableHeight=Math.max(120,baseline-12);
      if(originalHeight>availableHeight)width*=availableHeight/originalHeight;
    }
    const height=width*sourceHeight/sourceWidth,centerX=item.x*PX_PER_M-state.camera;
    const angle=(Number(item.rotation)||0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
    const dx=point.screenX-centerX,dy=point.screenY-baseline;
    const localX=dx*cos+dy*sin,localY=-dx*sin+dy*cos;
    if(localX>=-width/2&&localX<=width/2&&localY>=-height&&localY<=0)return item.id;
  }
  return null;
}

function pickLightAt(clientX,clientY) {
  const point=screenToWorldPoint(clientX,clientY),wallTop=point.bands.wallTop,ground=point.bands.wallBottom;
  for(const light of [...state.lightSources].reverse()){
    const source=resolveLightPoint(light,state.camera,wallTop,ground);
    if(Math.hypot(point.screenX-source.x,point.screenY-source.y)<=18)return light.id;
  }
  return null;
}

function moveLightFromScreen(light,clientX,clientY) {
  const point=screenToWorldPoint(clientX,clientY),wallTop=point.bands.wallTop,ground=point.bands.wallBottom;
  const lamp=light.lampId&&state.sceneItems.find(item=>item.id===light.lampId&&isLampItem(item));
  if(lamp){const base=lampBulbPoint(lamp,state.camera,wallTop,ground);return{offsetX:(point.screenX-base.x)/PX_PER_M,offsetY:(point.screenY-base.y)/PX_PER_M};}
  return{x:point.x,y:point.y};
}

function resolvedLightPosition(light) {
  const bands=sceneBands(),point=resolveLightPoint(light,state.camera,bands.wallTop,bands.wallBottom);
  return{x:(point.x+state.camera)/PX_PER_M,y:(point.y-bands.wallTop)/(bands.wallBottom-bands.wallTop)};
}

function pickEventAt(clientX,clientY) {
  const point=screenToWorldPoint(clientX,clientY);for(const event of [...state.events].reverse()){if(event.type==='text'){const x=(Number(event.x)||0)*PX_PER_M-state.camera,y=point.bands.wallTop+(Number(event.y)||0)*(point.bands.wallBottom-point.bands.wallTop),width=Math.max(120,Math.min(520,(Number(event.widthM)||5)*PX_PER_M));if(Math.hypot(point.screenX-x,point.screenY-y)<=20||(Math.abs(point.screenX-x)<=width*.5&&point.screenY>=y-190&&point.screenY<=y+20))return event.id;}else{const start=(Number.isFinite(Number(event.startX))?Number(event.startX):0)*PX_PER_M-state.camera,end=(Number.isFinite(Number(event.endX))?Number(event.endX):700)*PX_PER_M-state.camera,pathY=Number.isFinite(Number(event.pathY))?Number(event.pathY):1.35,y=point.bands.wallTop+pathY*(point.bands.wallBottom-point.bands.wallTop);if(Math.hypot(point.screenX-start,point.screenY-y)<=24||Math.hypot(point.screenX-end,point.screenY-y)<=24)return event.id;}}return null;
}
function moveEventFromScreen(clientX,clientY) { const point=screenToWorldPoint(clientX,clientY);return{x:Math.max(0,Math.min(700,point.x)),y:Math.max(-3,Math.min(5,point.y))}; }

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
  const wallNow=Date.now();
  const dt=Math.min((now-state.last)/1000,.05); state.last=now;
  const smooth=rate=>1-Math.exp(-rate*dt);
  state.zoom+=(state.targetZoom-state.zoom)*smooth(gameMotionReduced()?18:8);
  state.nightMix+=(environmentTarget(now)-state.nightMix)*smooth(gameMotionReduced()?18:1.8);
  let inputX=(state.keys.has('ArrowRight')||state.keys.has('d')?1:0)-(state.keys.has('ArrowLeft')||state.keys.has('a')?1:0)+state.moving;
  inputX=Math.max(-1,Math.min(1,inputX));
  if(state.edit||state.sceneEditing)inputX=0;
  const inputLength=Math.abs(inputX);
  const reduced=gameMotionReduced(), running=state.running&&inputLength>0&&!state.edit&&!state.sceneEditing, horizontalSpeed=running?9.2*DEV_RUN_MULTIPLIER:5.8;
  const acceleration=reduced?18:(running&&import.meta.env.DEV?14:running?6.4:7.5), drag=reduced?22:10;
  state.velocity+=(inputX*horizontalSpeed-state.velocity)*smooth(inputX?acceleration:drag);
  if(Math.abs(state.velocity)<.015)state.velocity=0;
  const movementEnergy=Math.min(1,Math.abs(state.velocity/horizontalSpeed));
  if(state.started&&state.velocity){
    if(state.velocity)state.dir=Math.sign(state.velocity);
    state.x=Math.max(0,Math.min(700,state.x+state.velocity*dt));
    state.stride+=movementEnergy*dt*(running?7.4:4.6);
  }
  const playerScreen=playerScreenX(),followedEvent=import.meta.env.DEV&&state.sceneEditing&&state.followedEventId?state.events.find(event=>event.id===state.followedEventId&&event.type==='walker'):null,followedState=followedEvent?walkerEventState(followedEvent,wallNow):null;if(followedState)state.followCameraX=followedState.x;else if(followedEvent&&state.followCameraX===null){const a=Number.isFinite(Number(followedEvent.startX))?Number(followedEvent.startX):0,b=Number.isFinite(Number(followedEvent.endX))?Number(followedEvent.endX):700;state.followCameraX=followedEvent.direction==='left'?Math.max(a,b):Math.min(a,b);}const followedX=followedEvent?state.followCameraX:null,viewCenter=innerWidth*.5,viewAnchor=followedX!==null?viewCenter:playerScreen,desired=followedX!==null?followedX*PX_PER_M-viewCenter:state.x*PX_PER_M-playerScreen,worldWidth=700*PX_PER_M,safeZoom=Math.max(1,state.zoom),cameraMin=viewAnchor/safeZoom-viewAnchor,cameraMax=Math.max(cameraMin,worldWidth-viewAnchor-(innerWidth-viewAnchor)/safeZoom),cameraTarget=Math.max(cameraMin,Math.min(cameraMax,desired));
  const cameraAtBoundary=desired<=cameraMin+.01||desired>=cameraMax-.01;
  if((followedX!==null&&state.followCameraSnap)||cameraAtBoundary){state.camera=cameraTarget;state.followCameraSnap=false;}else state.camera+=(cameraTarget-state.camera)*smooth(followedX!==null?(reduced?18:7.5):reduced?12:running&&import.meta.env.DEV?10:4.2);
  const currentMeter=Math.min(700,Math.floor(followedX??state.x)+1);
  if(currentMeter!==renderedMeter){renderedMeter=currentMeter;$('#meterValue').textContent=`${currentMeter} – 700`;}
  if(!state.accessGranted){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);requestAnimationFrame(render);return;}
  syncGraffitiIndex();
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,innerWidth,innerHeight);
  drawSky(ctx,state.camera,now);
  const bands=sceneBands(), ground=bands.wallBottom, wallTop=bands.wallTop, off=state.camera;
  ctx.save();
  const viewAnchorX=viewAnchor;ctx.translate(viewAnchorX,ground);ctx.scale(state.zoom,state.zoom);ctx.translate(-viewAnchorX,-ground);
  ctx.save();ctx.beginPath();ctx.rect(0,0,innerWidth,wallTop);ctx.clip();drawSceneLayer(ctx,'behind',off,wallTop,ground,now);ctx.restore();
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
  state.events.filter(event=>event.type==='walker').forEach(event=>{const active=walkerEventState(event,wallNow);if(!active)return;const pathY=Number(event.pathY),lane=Math.max(0,Math.min(1,Number(event.lane)||.5)),baseline=Number.isFinite(pathY)?wallTop+pathY*(ground-wallTop):baselineFor(lane),speech=activeWalkerSpeech(event,wallNow);foreground.push({y:baseline,draw:()=>drawEventWalker(ctx,event,active.x,baseline,off,now,active.dir,speech)});});
  if(followedX===null)foreground.push({y:playerBaseline,draw:()=>{drawPerson(ctx,playerX,playerBaseline,playerScale,state,state.velocity/3.2,state.stride,movementEnergy);drawNameLabel(ctx,playerX,playerBaseline,playerScale,state.name,state.nameColor);}});
  if(followedX===null)state.others.forEach(p=>{
    const predictionAge=Math.max(0,Math.min(1.25,(now-p.receivedAt)/1000));
    const predictedX=Math.max(0,Math.min(700,p.targetX+p.velocity*predictionAge));
    const correction=predictedX-p.displayX;
    p.displayX=Math.abs(correction)>12?predictedX:p.displayX+correction*smooth(reduced?18:9);
    const remoteEnergy=Math.min(1,Math.max(Math.abs(p.velocity)/5.8,Math.min(1,Math.abs(correction)*.75)));
    p.stride+=remoteEnergy*dt*(p.running?7.4:4.6);
    const x=p.displayX*PX_PER_M-off;
    if(x>-100&&x<innerWidth+100){const laneValue=Number(p.lane),lane=Number.isFinite(laneValue)?Math.max(0,Math.min(1,laneValue)):.5,baseline=baselineFor(lane),scale=depthScale(lane);foreground.push({y:baseline,draw:()=>{drawPerson(ctx,x,baseline,scale,{...p,dir:p.dir||1},p.velocity/3.2,p.stride,remoteEnergy);drawNameLabel(ctx,x,baseline,scale,p.name,p.nameColor);}});}
  });
  foreground.sort((a,b)=>a.y-b.y).forEach(entry=>entry.draw());
  drawNightShade(ctx,state.nightMix);
  drawLightSources(ctx,off,wallTop,ground,now);
  drawLightGizmos(ctx,off,wallTop,ground);
  state.events.filter(event=>event.type==='text').forEach(event=>{const bubbles=activeTextBubbles(event,wallNow);if(!bubbles.length&&import.meta.env.DEV&&state.sceneEditing&&state.editorLayer==='events'&&event.id===state.selectedEventId)bubbles.push({text:event.sequences?.[0]?.[0]||event.messages?.[0]||'TEXTOVÁ BUBLINA',opacity:.82,index:0});bubbles.forEach(bubble=>drawTextBubble(ctx,event,bubble,off,wallTop,ground));});
  drawEventGizmos(ctx,off,wallTop,ground);
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
  try{const r=await fetch('/api/graffiti',{headers:{'X-Writer-Id':visitorId}});if(!r.ok)throw 0;const data=await r.json();state.mode='shared';state.graffiti=data.items;state.hasWritten=WRITE_LIMIT_ENABLED&&Boolean(data.hasWritten);if(state.hasWritten)storeValue(WRITTEN_KEY,'1');else removeStoredValue(WRITTEN_KEY);$('#statusText').textContent='spoločná stena';$('#statusDot').classList.add('online');if(!state.hasWritten)$('#editorNote').textContent=WRITE_LIMIT_ENABLED?'Máš jeden odkaz. Po uložení ho uvidia aj ďalší návštevníci.':'DEV režim: odkazy môžeš pridávať bez obmedzenia.';}catch{$('#statusText').textContent='lokálna stena';}finally{updateWriteAccess();}
}
loadWorld();
function receivePresence(players,{replace=false}={}){
  const receivedAt=performance.now(),current=new Map(state.others.map(player=>[player.id,player])),incoming=new Set();
  (Array.isArray(players)?players:[]).forEach(packet=>{
    const id=String(packet?.id||'');if(!id||id===uid)return;incoming.add(id);
    const previous=current.get(id),packetTime=Number(packet.t)||Date.now();
    if(previous&&packetTime<previous.packetTime)return;
    const targetX=Math.max(0,Math.min(700,Number(packet.x)||0));
    current.set(id,{...packet,id,targetX,displayX:Number.isFinite(previous?.displayX)?previous.displayX:targetX,velocity:Math.max(-60,Math.min(60,Number(packet.velocity)||0)),running:packet.running===true,packetTime,receivedAt,stride:previous?.stride||0});
  });
  if(replace)for(const id of current.keys())if(!incoming.has(id))current.delete(id);
  state.others=[...current.values()].filter(player=>receivedAt-player.receivedAt<16000);
}
channel?.addEventListener('message',e=>{if(e.data.type==='graffiti')state.graffiti=e.data.items;if(e.data.type==='presence')receivePresence(e.data.players);if(WRITE_LIMIT_ENABLED&&e.data.type==='written'){state.hasWritten=true;if(state.edit)closeEditor();updateWriteAccess();}});

let presenceRequestPending=false;
setInterval(async()=>{
  if(!state.started)return;
  const me={id:uid,x:state.x,lane:state.lane,skin:state.skin,name:state.name,nameColor:state.nameColor,dir:state.dir,velocity:state.velocity,running:state.running,t:Date.now()};
  channel?.postMessage({type:'presence',players:[me]});
  if(state.mode==='shared'&&!presenceRequestPending){presenceRequestPending=true;try{const r=await fetch('/api/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(me)});if(r.ok)receivePresence((await r.json()).players,{replace:true});}catch{}finally{presenceRequestPending=false;}}
},1000);

$('#characterForm').addEventListener('change',e=>{if(e.target.name==='skin')state.skin=e.target.value;drawAvatar();});
$('#characterForm').addEventListener('submit',e=>{e.preventDefault();if(!state.accessGranted)return;startMusic();state.name=$('#playerName').value.trim().slice(0,16);state.nameColor=$('#playerNameColor').value;state.started=true;$('#entry').classList.add('gone');canvas.focus();});
addEventListener('keydown',e=>{if(e.target.matches?.('input, textarea, select')||e.target.isContentEditable)return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(e.key==='Shift'&&!state.edit&&!state.sceneEditing){e.preventDefault();state.running=true;}if(['ArrowLeft','ArrowRight','a','d'].includes(key)&&!state.edit){e.preventDefault();state.keys.add(key);}});
addEventListener('keyup',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(e.key==='Shift')state.running=false;state.keys.delete(key);});
addEventListener('blur',()=>{state.running=false;state.keys.clear();state.moving=0;});
document.querySelectorAll('[data-move-x]').forEach(b=>{const end=()=>state.moving=0;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);state.moving=Number(b.dataset.moveX)});b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);b.addEventListener('lostpointercapture',end);b.addEventListener('contextmenu',e=>e.preventDefault());b.addEventListener('selectstart',e=>e.preventDefault());b.addEventListener('dragstart',e=>e.preventDefault());});
document.querySelectorAll('[data-run]').forEach(button=>{const set=value=>{state.running=value;button.setAttribute('aria-pressed',String(value));};button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);set(true)});button.addEventListener('pointerup',()=>set(false));button.addEventListener('pointercancel',()=>set(false));button.addEventListener('lostpointercapture',()=>set(false));});
function releaseTouchInput(){state.moving=0;state.running=false;document.querySelectorAll('[data-run]').forEach(button=>button.setAttribute('aria-pressed','false'));}
addEventListener('orientationchange',releaseTouchInput);
mobileViewport.addEventListener?.('change',releaseTouchInput);
function setZoom(value){state.targetZoom=Math.round(Math.max(1,Math.min(1.6,Number(value)||1))*100)/100;if(Math.abs(state.zoom-state.targetZoom)<.002)state.zoom=state.targetZoom;document.querySelectorAll('[data-zoom-value]').forEach(output=>{output.textContent=`${Math.round(state.targetZoom*100)}%`;});document.querySelectorAll('[data-zoom]').forEach(button=>{const next=state.targetZoom+Number(button.dataset.zoom);button.disabled=next<.999||next>1.601;});}
document.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>setZoom(state.targetZoom+Number(button.dataset.zoom))));
setZoom(state.targetZoom);
const desktopZoom=$('.desktop-zoom'),desktopZoomToggle=$('.desktop-zoom-toggle');
const mobileUiToggle=$('#mobileUiToggle');
function setMobileUiHidden(hidden){document.documentElement.classList.toggle('mobile-ui-hidden',hidden);mobileUiToggle.setAttribute('aria-pressed',String(hidden));mobileUiToggle.setAttribute('aria-label',hidden?'Zobraziť spodné ovládanie':'Skryť spodné ovládanie');}
mobileUiToggle.addEventListener('click',()=>setMobileUiHidden(!document.documentElement.classList.contains('mobile-ui-hidden')));
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
  setMobileUiHidden(false);
  state.edit=true;state.angle=0;$('#angle').value='0';$('#angleValue').textContent='0°';
  const worldPx=state.x*PX_PER_M;state.section=Math.floor(worldPx/SECTION_PX);
  const within=worldPx-state.section*SECTION_PX-PILLAR_PX,u=within/(SECTION_PX-PILLAR_PX);
  setPlacement(state.section,u,.5);document.documentElement.classList.add('graffiti-edit-mode');$('#editor').classList.add('open');$('#editor').setAttribute('aria-hidden','false');if(!mobileViewport.matches)$('#message').focus();
}
function closeEditor(){state.edit=false;document.documentElement.classList.remove('graffiti-edit-mode');setMobileUiHidden(false);$('#editor').classList.remove('open');$('#editor').setAttribute('aria-hidden','true');canvas.focus();}
$('#writeButton').addEventListener('click',openEditor);$('#editorClose').addEventListener('click',closeEditor);
function placeFromPicker(clientX,clientY){const picker=$('#positionPicker'),rect=picker.getBoundingClientRect();setPlacement(state.section,(clientX-rect.left)/rect.width,(clientY-rect.top)/rect.height);}
$('#positionPicker').addEventListener('pointerdown',e=>{e.preventDefault();placeFromPicker(e.clientX,e.clientY);});
$('#positionPicker').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const dx=e.key==='ArrowLeft'?-.03:e.key==='ArrowRight'?.03:0,dy=e.key==='ArrowUp'?-.05:e.key==='ArrowDown'?.05:0;setPlacement(state.section,state.positionU+dx,state.targetY+dy);});
$('#angle').addEventListener('input',e=>{state.angle=Number(e.target.value);$('#angleValue').textContent=`${state.angle>0?'+':''}${state.angle}°`;updatePreview();});
canvas.addEventListener('pointerdown',e=>{
  if(!state.edit)return;const bands=sceneBands(),wallTop=bands.wallTop,ground=bands.wallBottom,playerScreen=playerScreenX();
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
    getLights: () => structuredClone(state.lightSources),
    setLights: lights => { state.lightSources = structuredClone(lights); },
    getEvents: () => structuredClone(state.events),
    setEvents: events => { state.events = structuredClone(events); },
    getTerrain: () => structuredClone(state.terrain),
    setTerrain: terrain => { state.terrain = structuredClone(terrain); },
    getLanding: () => structuredClone(state.landing),
    setLanding: landing => { state.landing = structuredClone(landing); applyLandingText(); },
    getEnvironmentMode: () => state.environmentMode,
    setEnvironmentMode: mode => { state.environmentMode = ['auto','day','night'].includes(mode) ? mode : 'auto'; },
    getPlayerX: () => state.x,
    getViewCenterX: () => Math.max(0,Math.min(700,(state.camera+innerWidth*.5)/PX_PER_M)),
    getDefaultEventY: () => { const bands=sceneBands();return Number(((bands.walkwayTop+bands.walkwayHeight*.5-bands.wallTop)/(bands.wallBottom-bands.wallTop)).toFixed(3)); },
    setSelected: id => { state.selectedSceneId = id; },
    setSelectedLight: id => { state.selectedLightId = id; },
    setSelectedEvent: id => { state.selectedEventId = id; },
    getFollowedEventId: () => state.followedEventId,
    setFollowedEvent: id => { state.followedEventId=state.events.some(event=>event.id===id&&event.type==='walker')?id:null;state.followCameraX=null;state.followCameraSnap=Boolean(state.followedEventId); },
    previewEvent: id => { if(id)EVENT_PREVIEW_STARTS.set(id,Date.now()); },
    setEditorLayer: layer => { state.editorLayer = ['lights','events'].includes(layer) ? layer : 'assets'; },
    setEditing: value => { state.sceneEditing = value; if(!value){state.followedEventId=null;state.followCameraX=null;state.followCameraSnap=false;} if (value && state.edit) closeEditor(); },
    getGraffitiCount: () => state.graffiti.length,
    clearGraffiti: () => {
      const removed = state.graffiti.length;
      state.graffiti = [];
      saveLocal([]);
      return removed;
    },
    screenToScene: (clientX, clientY) => { const point=screenToWorldPoint(clientX,clientY);return {x:Math.max(0,Math.min(700,point.x)),y:Math.max(-2.5,Math.min(5,point.y))}; },
    pickItemAt: pickSceneItem,
    pickLightAt,
    moveLightFromScreen,
    getResolvedLightPosition: resolvedLightPosition,
    pickEventAt,
    moveEventFromScreen,
    notify: toast
  }));
}
