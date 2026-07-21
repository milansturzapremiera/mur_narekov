import './civavaGame.css';

const WIDTH = 1000;
const HEIGHT = 560;
const GROUND = 486;
const SLING = { x: 178, y: 398, leftX: 143, rightX: 213, anchorY: 391 };
const LAUNCH_X = 6.2;
const LAUNCH_Y = 9.5;
const GRAVITY = 650;
const BEST_KEY = 'mur:civava-best';
const COMPANION_SCORE = 60000;
const DOG_SRC = '/assets/scene/1784366828126-pes.webp';
const BRICK_SRC = '/assets/wall/brick-wall-segment.webp';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const LEVELS = [
  {
    name: 'Základná nominácia', shots: 3,
    blocks: [[664,426,54,120,'FUNKCIA'],[822,426,54,120,'TENDER'],[743,354,230,34,'DOTÁCIA'],[705,291,48,92,'FLEK'],[785,291,48,92,'FLEK'],[745,231,176,30,'NAŠI ĽUDIA']],
    targets: [[744,419,27],[744,307,24],[744,194,25]]
  },
  {
    name: 'Trojkoalícia', shots: 3,
    blocks: [[650,426,44,120,'SĽUB'],[760,426,44,120,'DOHODA'],[870,426,44,120,'POST'],[760,350,270,32,'KOALÍCIA'],[700,285,44,98,'KRESLO'],[820,285,44,98,'KRESLO'],[760,222,190,30,'PROGRAM']],
    targets: [[705,420,26],[815,420,26],[760,307,24],[760,185,24]],
    barrels: [[930,456,24]]
  },
  {
    name: 'Pyramída funkcií', shots: 4,
    blocks: [[680,449,125,28,'ÚRAD'],[820,449,125,28,'ÚRAD'],[750,392,46,86,'FUNKCIA'],[750,337,270,30,'SCHÉMA'],[695,280,44,84,'FLEK'],[805,280,44,84,'FLEK'],[750,225,190,28,'RODINA']],
    targets: [[680,405,25],[820,405,25],[750,290,24],[750,188,24]],
    barrels: [[900,456,24]]
  },
  {
    name: 'Rezortná pevnosť', shots: 4,
    blocks: [[640,421,48,130,'REZORT'],[735,421,48,130,'ZMLUVA'],[830,421,48,130,'TENDER'],[925,421,48,130,'FIRMA'],[782,342,330,34,'ROZPOČET'],[700,274,46,102,'DOZOR'],[865,274,46,102,'DOZOR'],[782,212,230,30,'NOMINANT']],
    targets: [[687,420,25],[782,420,25],[877,420,25],[782,295,24],[782,175,24]],
    barrels: [[600,456,24],[965,456,24]]
  },
  {
    name: 'Nedobytný systém', shots: 5,
    blocks: [[620,428,44,116,'MY'],[700,428,44,116,'NAŠI'],[780,428,44,116,'ĽUDIA'],[860,428,44,116,'FLEKY'],[940,428,44,116,'ISTOTA'],[780,354,360,32,'SYSTÉM'],[660,290,44,96,'KŠEFT'],[780,290,44,96,'KŠEFT'],[900,290,44,96,'KŠEFT'],[780,228,300,30,'BEZ TRESTU'],[720,265,42,74,'POST'],[840,265,42,74,'POST']],
    targets: [[660,420,25],[740,420,25],[820,420,25],[900,420,25],[720,304,24],[840,304,24],[780,180,24]],
    barrels: [[580,456,24],[980,456,24]]
  },
  {
    name: 'Tichá privatizácia', shots: 4,
    blocks: [[620,438,52,96,'PODPIS'],[710,438,52,96,'PEČIATKA'],[800,438,52,96,'KÚPNA'],[890,438,52,96,'ZMLUVA'],[755,370,330,34,'ŠTÁTNY MAJETOK'],[675,300,48,106,'ZA EURO'],[835,300,48,106,'ZA EURO'],[755,230,250,32,'TAJNÉ']],
    targets: [[665,433,25],[755,433,25],[845,433,25],[755,318,25],[755,192,25]],
    barrels: [[955,456,24]]
  },
  {
    name: 'Rodinný podnik', shots: 4,
    blocks: [[635,432,54,108,'SVOKOR'],[725,432,54,108,'SYN'],[815,432,54,108,'KMOTOR'],[905,432,54,108,'BRAT'],[770,356,340,34,'VÝBEROVÁ KOMISIA'],[690,286,46,104,'RODINA'],[850,286,46,104,'RODINA'],[770,218,248,30,'VÍŤAZ']],
    targets: [[680,426,25],[770,426,25],[860,426,25],[770,302,25],[770,180,25]],
    barrels: [[590,456,24],[950,456,24]]
  },
  {
    name: 'Výberové konanie', shots: 5,
    blocks: [[610,430,42,112,'1%'],[680,430,42,112,'5%'],[750,430,42,112,'10%'],[820,430,42,112,'20%'],[890,430,42,112,'VÍŤAZ'],[750,354,330,32,'NAJLEPŠIA PONUKA'],[650,288,44,100,'BOD'],[750,288,44,100,'BOD'],[850,288,44,100,'BOD'],[750,224,280,30,'KRITÉRIÁ']],
    targets: [[645,424,24],[715,424,24],[785,424,24],[855,424,24],[700,305,24],[800,305,24],[750,186,25]],
    barrels: [[950,456,24]]
  },
  {
    name: 'Betónová istota', shots: 5,
    blocks: [[590,420,48,132,'PILIER'],[670,420,48,132,'PILIER'],[750,420,48,132,'PILIER'],[830,420,48,132,'PILIER'],[910,420,48,132,'PILIER'],[750,338,390,34,'ISTOTA'],[635,270,48,104,'DOŽIVOTNE'],[750,270,48,104,'DOŽIVOTNE'],[865,270,48,104,'DOŽIVOTNE'],[750,202,330,30,'NEODVOLATEĽNÍ']],
    targets: [[630,414,25],[710,414,25],[790,414,25],[870,414,25],[692,287,24],[808,287,24],[750,164,25]],
    barrels: [[550,456,24],[950,456,24]]
  },
  {
    name: 'Večný systém', shots: 6,
    blocks: [[570,430,42,112,'POST'],[635,430,42,112,'FLEK'],[700,430,42,112,'KŠEFT'],[765,430,42,112,'FIRMA'],[830,430,42,112,'TENDER'],[895,430,42,112,'ISTOTA'],[960,430,42,112,'MY'],[765,354,420,34,'SYSTÉM'],[620,286,44,102,'NAŠI'],[715,286,44,102,'NAŠI'],[815,286,44,102,'NAŠI'],[910,286,44,102,'NAŠI'],[765,218,360,32,'BEZ NÁS TO NEJDE'],[680,164,46,82,'ŠÉF'],[850,164,46,82,'ŠÉF'],[765,108,250,30,'VEČNÁ FUNKCIA']],
    targets: [[610,424,24],[675,424,24],[740,424,24],[805,424,24],[870,424,24],[665,303,24],[765,303,24],[865,303,24],[720,178,24],[810,178,24],[765,70,25]],
    barrels: [[535,456,24],[990,456,24],[765,324,22]]
  }
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value)));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function createCivavaGame({ onOpen = () => {}, onClose = () => {}, onCompanionUnlocked = () => {} } = {}) {
  const host = document.createElement('div');
  host.innerHTML = `
    <button class="civava-prompt" type="button" hidden aria-label="Spustiť minihru Angry Čivava" aria-haspopup="dialog" aria-controls="civavaGame"></button>
    <button class="civava-mobile-action" type="button" hidden aria-haspopup="dialog" aria-controls="civavaGame">Hrať</button>
    <dialog class="civava-game" id="civavaGame" aria-labelledby="civavaTitle">
      <div class="civava-shell">
        <header class="civava-topbar">
          <div><span>MINIHRA Č. 02 · LEVEL <b data-level>1/10</b></span><strong id="civavaTitle">Angry Čivava</strong></div>
          <dl><div><dt>Čivavy</dt><dd data-shots>3</dd></div><div><dt>Skóre</dt><dd data-score>0</dd></div></dl>
          <button class="civava-close" type="button" aria-label="Späť k múru">×</button>
        </header>
        <main class="civava-stage">
          <canvas width="1000" height="560" aria-label="Hracia plocha. Potiahni čivavu dozadu a pusti ju smerom na konštrukciu."></canvas>
          <p class="civava-rotate-hint">Pre lepší zážitok otoč mobil</p>
          <p class="civava-status" aria-live="polite">Potiahni čivavu dozadu a pusti.</p>
        </main>
        <section class="civava-cover civava-intro">
          <span>ODBOR BALISTICKEJ KYNOLÓGIE</span>
          <h2>Odisti čivavu.</h2>
          <p>Zhoď všetkých papalášov v desiatich konštrukciách. Počas letu ťukni do plochy alebo stlač medzerník — čivava raz za výstrel štekne a tlakovou vlnou odpáli okolie. Za 60 000 bodov odomkneš Papalášskeho plašiča, ktorý ťa bude sprevádzať pri múre.</p>
          <div class="civava-how"><b>1</b><span>Potiahni</span><b>2</b><span>Namier</span><b>3</b><span>Pusti</span><b>4</b><span>Štekni</span></div>
          <button class="civava-start" type="button">Nabiť čivavu</button>
        </section>
        <section class="civava-cover civava-result" hidden>
          <span>VÝSLEDOK ODBORNÉHO POSUDKU</span>
          <h2 data-result-title>Konštrukcia stojí.</h2>
          <strong data-final-score>0</strong>
          <p data-result-note>Rozpočet prežil bez ujmy.</p>
          <div><button class="civava-replay" type="button">Hrať znova</button><button class="civava-return" type="button">Späť k múru</button></div>
        </section>
      </div>
    </dialog>`;

  const prompt = host.querySelector('.civava-prompt');
  const mobileAction = host.querySelector('.civava-mobile-action');
  const dialog = host.querySelector('.civava-game');
  const stage = host.querySelector('.civava-stage');
  const canvas = host.querySelector('canvas');
  const context = canvas.getContext('2d');
  const status = host.querySelector('.civava-status');
  const shotsOutput = host.querySelector('[data-shots]');
  const scoreOutput = host.querySelector('[data-score]');
  const levelOutput = host.querySelector('[data-level]');
  const intro = host.querySelector('.civava-intro');
  const result = host.querySelector('.civava-result');
  const dog = new Image(); dog.src = DOG_SRC;
  const brickWall = new Image(); brickWall.src = BRICK_SRC;
  document.body.append(prompt, mobileAction, dialog);

  let available = false;
  let phase = 'intro';
  let animation = 0;
  let previous = performance.now();
  let shots = LEVELS[0].shots;
  let score = 0;
  let dragging = false;
  let pointerId = null;
  let resultTimer = 0;
  let levelIndex = 0;
  let completedRun = false;
  let projectile;
  let blocks = [];
  let targets = [];
  let barrels = [];
  let particles = [];
  let shockwaves = [];

  function fitCanvasToStage() {
    const rect=stage.getBoundingClientRect();
    if(rect.width<1||rect.height<1)return;
    const touchDevice=matchMedia('(pointer:coarse), (any-pointer:coarse)').matches;
    const widePhone=rect.width/rect.height>1.9&&(touchDevice||innerHeight<=560);
    const scale=widePhone?Math.min(rect.width*.96/WIDTH,rect.height/(HEIGHT-120)):Math.min(rect.width/WIDTH,rect.height/HEIGHT);
    canvas.style.width=`${Math.max(1,Math.floor(WIDTH*scale))}px`;
    canvas.style.height=`${Math.max(1,Math.floor(HEIGHT*scale))}px`;
    canvas.style.transform=widePhone?`translateY(${Math.round(rect.height*.018)}px)`:'';
  }

  function scheduleCanvasFit() {
    requestAnimationFrame(()=>requestAnimationFrame(fitCanvasToStage));
  }

  new ResizeObserver(scheduleCanvasFit).observe(stage);

  function makeLevel() {
    const level = LEVELS[levelIndex];
    blocks = level.blocks.map(([x,y,w,h,label],index) => ({ x,y,w,h,label,hp:1,id:index,dead:false,broken:false,shake:0,vx:0,vy:0,angle:0,angularVelocity:0,rest:0,unstableIn:null }));
    targets = level.targets.map(([x,y,r]) => ({ x,y,r,dead:false }));
    barrels = (level.barrels || []).map(([x,y,r=24],index) => ({ x,y,r,id:index,dead:false,flash:0 }));
    particles = [];
    shockwaves = [];
  }

  function resetProjectile() {
    projectile = { x: SLING.x, y: SLING.y, vx: 0, vy: 0, r: 27, flying: false, rest: 0, age: 0, angle: 0, angularVelocity: 0, tumble: 0, impact: 0, launchStretch: 0, direction: 1, barkUsed: false };
    status.textContent = 'Potiahni čivavu, namier a počas letu raz štekni.';
  }

  function resetGame() {
    levelIndex = 0; shots = LEVELS[0].shots; score = 0; resultTimer = 0; completedRun = false; phase = 'playing';
    makeLevel(); resetProjectile(); updateHud();
    status.textContent = `Level 1/${LEVELS.length} · ${LEVELS[0].name}`;
    intro.hidden = true; result.hidden = true;
  }

  function updateHud() {
    shotsOutput.textContent = String(shots);
    scoreOutput.textContent = String(score);
    levelOutput.textContent = `${levelIndex + 1}/${LEVELS.length}`;
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height };
  }

  function aimAt(point) {
    const dx = point.x - SLING.x, dy = point.y - SLING.y;
    const length = Math.hypot(dx, dy) || 1, limit = 126, scale = Math.min(1, limit / length);
    projectile.x = Math.min(SLING.x - 8, SLING.x + dx * scale);
    projectile.y = clamp(SLING.y + dy * scale, SLING.y - 104, GROUND - projectile.r - 2);
  }

  function release() {
    if (!dragging || phase !== 'playing') return;
    dragging = false;
    const pullX = SLING.x - projectile.x, pullY = SLING.y - projectile.y, power = Math.hypot(pullX, pullY);
    if (power < 14) return resetProjectile();
    projectile.vx = pullX * LAUNCH_X;
    projectile.vy = pullY * LAUNCH_Y;
    projectile.direction = Math.sign(projectile.vx) || 1;
    projectile.flying = true;
    projectile.angularVelocity = reducedMotion.matches ? 0 : 1.15;
    projectile.launchStretch = reducedMotion.matches ? 0 : 1;
    projectile.x += 4;
    projectile.age = 0;
    shots -= 1;
    status.textContent = 'Čivava je vo vzduchu.';
    updateHud();
  }

  function burst(x, y, color, count = 10) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2, speed = 80 + Math.random() * 250;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 80, life: .45 + Math.random() * .5, color, size: 3 + Math.random() * 7 });
    }
  }

  function scheduleCollapseAbove(block,delay=.1,seen=new Set()) {
    if(seen.has(block.id))return;seen.add(block.id);
    const supportTop=block.y-block.h/2;
    blocks.forEach(candidate=>{
      if(candidate.dead||candidate.broken||seen.has(candidate.id))return;
      const candidateBottom=candidate.y+candidate.h/2,horizontalOverlap=Math.min(block.x+block.w/2,candidate.x+candidate.w/2)-Math.max(block.x-block.w/2,candidate.x-candidate.w/2);
      if(Math.abs(candidateBottom-supportTop)>18||horizontalOverlap<Math.min(24,candidate.w*.24))return;
      candidate.unstableIn=Math.min(Number.isFinite(candidate.unstableIn)?candidate.unstableIn:Infinity,delay);
      scheduleCollapseAbove(candidate,delay+.09,seen);
    });
  }

  function loosenBlock(block) {
    if(block.dead||block.broken)return;
    const motionScale=reducedMotion.matches ? .28 : 1;block.broken=true;block.unstableIn=null;block.vx=((Math.random()-.5)*80)*motionScale;block.vy=(-20-Math.random()*45)*motionScale;block.angularVelocity=reducedMotion.matches?0:(Math.random()-.5)*2.8;
    burst(block.x,block.y,'#a84b32',6);targets.forEach(target=>{if(!target.dead&&Math.hypot(target.x-block.x,target.y-block.y)<82)destroyTarget(target);});
  }

  function forceBlock(block, origin, strength = 1, points = 90) {
    if (block.dead || block.broken) return;
    const dx = block.x - origin.x, dy = block.y - origin.y, length = Math.hypot(dx, dy) || 1;
    const motionScale = reducedMotion.matches ? .3 : 1, force = (180 + Math.random() * 110) * strength;
    block.broken = true; block.unstableIn = null; block.shake = 0;
    block.vx = dx / length * force * motionScale;
    block.vy = (dy / length * force - 95) * motionScale;
    block.angularVelocity = reducedMotion.matches ? 0 : (Math.random() - .5) * 5 * strength;
    score += points; burst(block.x, block.y, '#a84b32', 12); scheduleCollapseAbove(block);
  }

  function detonateBarrel(barrel, chain = 0) {
    if (barrel.dead) return;
    barrel.dead = true;
    const radius = 178;
    score += 300 + chain * 100;
    shockwaves.push({ x: barrel.x, y: barrel.y, radius: 12, max: radius, life: .55, color: '#f7d400' });
    burst(barrel.x, barrel.y, '#171512', 20); burst(barrel.x, barrel.y, '#f7d400', 28);
    blocks.forEach(block => {
      const range = Math.hypot(block.x - barrel.x, block.y - barrel.y);
      if (!block.dead && !block.broken && range < radius) forceBlock(block, barrel, 1.25 - range / radius * .45, 130 + chain * 20);
    });
    targets.forEach(target => { if (!target.dead && distance(target, barrel) < radius - 18) destroyTarget(target); });
    barrels.forEach(other => { if (!other.dead && distance(other, barrel) < radius + 26) detonateBarrel(other, chain + 1); });
    status.textContent = chain ? `Reťazová reakcia ×${chain + 1}.` : 'Výbuch. Verejné financie sa rozleteli.';
    updateHud();
  }

  function activateBark() {
    if (phase !== 'playing' || !projectile.flying || projectile.barkUsed) return false;
    projectile.barkUsed = true;
    const radius = 150, origin = { x: projectile.x, y: projectile.y };
    shockwaves.push({ ...origin, radius: 8, max: radius, life: .5, color: '#f4efe5' });
    burst(origin.x, origin.y, '#f4efe5', 18);
    blocks.forEach(block => {
      const range = distance(block, origin);
      if (!block.dead && !block.broken && range < radius) forceBlock(block, origin, .95 - range / radius * .28, 90);
    });
    targets.forEach(target => { if (!target.dead && distance(target, origin) < radius - 28) destroyTarget(target); });
    barrels.forEach(barrel => { if (!barrel.dead && distance(barrel, origin) < radius) detonateBarrel(barrel); });
    projectile.vx *= 1.04; projectile.vy -= 42; projectile.impact = .65;
    score += 50; status.textContent = 'HAV! Tlaková vlna odpálila okolie.'; updateHud();
    return true;
  }

  function destroyBlock(block) {
    if (block.dead || block.broken) return;
    const motionScale=reducedMotion.matches ? .22 : 1,side=Math.sign(projectile.vx||1);
    block.broken=true;block.shake=0;block.vx=(projectile.vx*.34+side*(45+Math.random()*75))*motionScale;block.vy=(projectile.vy*.24-80-Math.random()*90)*motionScale;
    block.angularVelocity=(reducedMotion.matches?0:clamp((projectile.y-block.y)*projectile.vx*.00022+(Math.random()-.5)*4.2,-6,6));
    score += 120; burst(block.x, block.y, '#a84b32', 16);
    targets.forEach(target => { if (!target.dead && Math.hypot(target.x - block.x, target.y - block.y) < 82) destroyTarget(target); });
    scheduleCollapseAbove(block);status.textContent='Zásah. Statika sa vzdala.';updateHud();
  }

  function destroyTarget(target) {
    if (target.dead) return;
    target.dead = true; score += 500; burst(target.x, target.y, '#f4efe5', 18);updateHud();
  }

  function levelCleared() {
    return targets.length > 0 && targets.every(target => target.dead);
  }

  function collideProjectile() {
    const speed = Math.hypot(projectile.vx, projectile.vy);
    targets.forEach(target => {
      if (target.dead || distance(projectile, target) > projectile.r + target.r) return;
      destroyTarget(target);projectile.vx*=.72;projectile.vy-=80;projectile.impact=1;projectile.tumble=reducedMotion.matches?0:.65;projectile.angularVelocity+=reducedMotion.matches?0:3.2;
    });
    barrels.forEach(barrel => {
      if (barrel.dead || distance(projectile, barrel) > projectile.r + barrel.r) return;
      detonateBarrel(barrel); projectile.vx *= .82; projectile.vy -= 65; projectile.impact = 1;
    });
    blocks.forEach(block => {
      if (block.dead || block.broken) return;
      const left = block.x - block.w / 2, right = block.x + block.w / 2, top = block.y - block.h / 2, bottom = block.y + block.h / 2;
      const nearestX = clamp(projectile.x, left, right), nearestY = clamp(projectile.y, top, bottom);
      const dx = projectile.x - nearestX, dy = projectile.y - nearestY;
      if (dx * dx + dy * dy > projectile.r * projectile.r) return;
      block.shake = .22;
      if (speed > 245) {
        destroyBlock(block);
        projectile.vx*=.78;projectile.vy=projectile.vy*.82-45;projectile.impact=1;projectile.tumble=reducedMotion.matches?0:.78;projectile.angularVelocity+=reducedMotion.matches?0:clamp(speed/150,2,5);
        projectile.x += Math.sign(projectile.vx || 1) * 10;
        return;
      }
      projectile.impact=1;projectile.tumble=reducedMotion.matches?0:.4;projectile.angularVelocity+=reducedMotion.matches?0:1.8;
      if (Math.abs(dx) > Math.abs(dy)) projectile.vx *= -.42;
      else projectile.vy *= -.42;
      projectile.x += Math.sign(dx || projectile.vx) * 5;
      projectile.y += Math.sign(dy || projectile.vy) * 5;
    });
  }

  function finishShot() {
    if (levelCleared()) return finishLevel();
    if (shots > 0) { resetProjectile(); return; }
    finishGame();
  }

  function finishLevel() {
    if (phase !== 'playing') return;
    score += 500 + levelIndex * 250 + shots * 300;
    if (levelIndex === LEVELS.length - 1) {
      completedRun = true; phase = 'ending'; resultTimer = 1.3;
      status.textContent = 'Systém padol. Vyhodnocujem škody.';
    } else {
      phase = 'level-clear'; resultTimer = 1.45;
      status.textContent = `Level ${levelIndex + 1} hotový · pripravujem ďalší.`;
    }
    updateHud();
  }

  function finishGame() {
    if (phase !== 'playing') return;
    completedRun = false; phase = 'ending'; resultTimer = .85;
    updateHud();
  }

  function advanceLevel() {
    levelIndex += 1;
    shots = LEVELS[levelIndex].shots;
    makeLevel(); resetProjectile(); phase = 'playing'; updateHud();
    status.textContent = `Level ${levelIndex + 1}/${LEVELS.length} · ${LEVELS[levelIndex].name}`;
  }

  function showResult() {
    phase = 'result';
    let best = 0; try { best = Number(localStorage.getItem(BEST_KEY)) || 0; if (score > best) localStorage.setItem(BEST_KEY, String(score)); } catch {}
    const companionUnlocked = score >= COMPANION_SCORE;
    if (companionUnlocked) onCompanionUnlocked(score);
    dialog.querySelector('[data-result-title]').textContent = companionUnlocked ? 'Papalášsky plašič odomknutý.' : completedRun ? 'Celý systém sa zosypal.' : 'Konštrukcia stále drží.';
    dialog.querySelector('[data-final-score]').textContent = String(score);
    const progress = `${completedRun ? LEVELS.length : levelIndex} z ${LEVELS.length} levelov dokončených.`;
    dialog.querySelector('[data-result-note]').textContent = companionUnlocked ? `${progress} Angry Čivava ťa odteraz sprevádza pri múre a uvidia ju aj ostatní hráči.` : score > best ? `${progress} Nový znalecký rekord.` : completedRun ? `${progress} Všetky funkcie boli otrasené.` : `${progress} Rozpočet prežil ďalšie obdobie.`;
    result.hidden = false;
    dialog.querySelector('.civava-replay').focus();
  }

  function update(dt) {
    blocks.forEach(block => {
      block.shake=Math.max(0,block.shake-dt);
      if(!block.broken&&Number.isFinite(block.unstableIn)){block.unstableIn-=dt;if(block.unstableIn<=0)loosenBlock(block);}
      if(!block.broken||block.dead)return;
      block.vy+=GRAVITY*.92*dt;block.x+=block.vx*dt;block.y+=block.vy*dt;block.angle+=block.angularVelocity*dt;
      const halfHeight=Math.abs(Math.cos(block.angle))*block.h/2+Math.abs(Math.sin(block.angle))*block.w/2;
      if(block.y+halfHeight>=GROUND){
        block.y=GROUND-halfHeight;
        if(block.vy>28){block.vy*=-.24;block.vx*=.76;block.angularVelocity*=.68;}
        else{block.vy=0;block.vx*=Math.exp(-5*dt);block.angularVelocity*=Math.exp(-6*dt);}
        block.rest+=dt;
      }else block.rest=0;
      const blockSpeed = Math.hypot(block.vx, block.vy);
      if (blockSpeed > 70) {
        const collisionRadius = Math.min(74, Math.max(block.w, block.h) * .48);
        targets.forEach(target => { if (!target.dead && distance(block, target) < collisionRadius + target.r) destroyTarget(target); });
        barrels.forEach(barrel => { if (!barrel.dead && distance(block, barrel) < collisionRadius + barrel.r) detonateBarrel(barrel); });
      }
      if(Math.abs(block.vx)<2)block.vx=0;if(Math.abs(block.angularVelocity)<.035)block.angularVelocity=0;
    });
    particles.forEach(particle => { particle.vy += 620 * dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt; });
    particles = particles.filter(particle => particle.life > 0);
    shockwaves.forEach(wave => { wave.radius += (wave.max - wave.radius) * Math.min(1, dt * 12); wave.life -= dt; });
    shockwaves = shockwaves.filter(wave => wave.life > 0);
    if (phase === 'level-clear') { resultTimer -= dt; if (resultTimer <= 0) advanceLevel(); }
    if (phase === 'ending') { resultTimer -= dt; if (resultTimer <= 0) showResult(); }
    if(phase==='playing'&&levelCleared()){finishLevel();return;}
    if (phase !== 'playing' || !projectile.flying) return;
    projectile.age += dt;
    projectile.impact=Math.max(0,projectile.impact-dt*4.8);projectile.launchStretch=Math.max(0,projectile.launchStretch-dt*3.6);projectile.tumble=Math.max(0,projectile.tumble-dt);
    projectile.vy += GRAVITY * dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    const flightAngle=clamp(Math.atan2(projectile.vy,Math.max(80,Math.abs(projectile.vx)))*.34,-.48,.58);
    if(projectile.tumble>0)projectile.angle+=projectile.angularVelocity*dt;
    else{const angleDelta=Math.atan2(Math.sin(flightAngle-projectile.angle),Math.cos(flightAngle-projectile.angle));projectile.angle+=angleDelta*(1-Math.exp(-4.2*dt));}
    projectile.angularVelocity*=Math.exp(-.55*dt);
    collideProjectile();
    if (projectile.y + projectile.r > GROUND) {
      projectile.y = GROUND - projectile.r;
      if(projectile.vy>55){projectile.impact=1;projectile.tumble=reducedMotion.matches?0:.55;projectile.angularVelocity+=(reducedMotion.matches?0:2.1)*Math.sign(projectile.vx||1);}
      projectile.vy *= -.28; projectile.vx *= .78;
      if (Math.abs(projectile.vy) < 32) projectile.vy = 0;
    }
    if(Math.abs(projectile.vx)>45)projectile.direction=Math.sign(projectile.vx);
    const slow = Math.hypot(projectile.vx, projectile.vy) < 34 && projectile.y + projectile.r >= GROUND - 2;
    projectile.rest = slow ? projectile.rest + dt : 0;
    if (projectile.rest > .75 || projectile.age > 6 || projectile.x > WIDTH + 120 || projectile.y > HEIGHT + 120) finishShot();
  }

  function drawTrajectory() {
    if (!dragging) return;
    const vx = (SLING.x - projectile.x) * LAUNCH_X, vy = (SLING.y - projectile.y) * LAUNCH_Y;
    context.fillStyle = '#171512';
    for (let t = .12; t <= 1.32; t += .12) {
      const x = projectile.x + vx * t, y = projectile.y + vy * t + GRAVITY * .5 * t * t;
      context.beginPath(); context.arc(x, y, Math.max(2, 5 - t * 2), 0, Math.PI * 2); context.fill();
    }
  }

  function drawDog() {
    context.save();context.translate(projectile.x,projectile.y);context.rotate(projectile.flying?projectile.angle:0);
    const scaleX=1+projectile.launchStretch*.08+projectile.impact*.2,scaleY=1-projectile.launchStretch*.05-projectile.impact*.2,mirror=projectile.direction>=0?-1:1;context.scale(scaleX*mirror,scaleY);
    if (dog.complete && dog.naturalWidth) {
      const frameWidth = dog.naturalWidth / 5, frame = projectile.flying ? 2 : 0;
      const width = projectile.flying ? 76 : 68, height = projectile.flying ? 84 : 75;
      context.drawImage(dog, frame * frameWidth, 0, frameWidth, dog.naturalHeight, -width/2, -height/2, width, height);
    } else {
      context.fillStyle = '#b96f39'; context.beginPath(); context.arc(0, 0, projectile.r, 0, Math.PI * 2); context.fill();
    }
    context.restore();
  }

  function drawBrickBlock(block) {
    const left=-block.w/2,top=-block.h/2,tileWidth=200,tileHeight=154;
    context.save();context.beginPath();context.rect(left,top,block.w,block.h);context.clip();
    if(brickWall.complete&&brickWall.naturalWidth){
      const offsetX=(block.id*47)%tileWidth,offsetY=(block.id*29)%tileHeight;
      for(let x=left-offsetX;x<left+block.w;x+=tileWidth){
        for(let y=top-offsetY;y<top+block.h;y+=tileHeight)context.drawImage(brickWall,4,4,brickWall.naturalWidth-8,brickWall.naturalHeight-8,x,y,tileWidth,tileHeight);
      }
    }else{
      context.fillStyle='#a84b32';context.fillRect(left,top,block.w,block.h);
    }
    context.fillStyle='rgba(18,15,13,.12)';context.fillRect(left,top,block.w,block.h);context.restore();
    context.strokeStyle='#171512';context.lineWidth=4;context.strokeRect(left,top,block.w,block.h);
    const fontSize=Math.min(17,Math.max(10,block.w/7));context.font=`700 ${fontSize}px "Barlow Condensed",sans-serif`;
    const labelWidth=Math.min(block.w-6,Math.max(30,context.measureText(block.label).width+12)),labelHeight=Math.min(24,Math.max(16,fontSize+6));
    context.fillStyle='rgba(18,15,13,.82)';context.fillRect(-labelWidth/2,-labelHeight/2,labelWidth,labelHeight);
    context.fillStyle='#f4efe5';context.textAlign='center';context.textBaseline='middle';context.fillText(block.label,0,1,block.w-10);
  }

  function drawBarrel(barrel, now) {
    if (barrel.dead) return;
    const pulse = reducedMotion.matches ? 0 : Math.sin(now * .008 + barrel.id) * 2;
    context.save(); context.translate(barrel.x, barrel.y);
    context.fillStyle = '#171512'; context.fillRect(-barrel.r, -barrel.r - 5, barrel.r * 2, barrel.r * 2 + 10);
    context.fillStyle = '#f4efe5'; context.fillRect(-barrel.r + 4, -barrel.r + 1, barrel.r * 2 - 8, barrel.r * 2 - 2);
    context.fillStyle = '#f7d400'; context.fillRect(-barrel.r + 4, -8, barrel.r * 2 - 8, 16);
    context.strokeStyle = '#171512'; context.lineWidth = 4; context.strokeRect(-barrel.r, -barrel.r - 5, barrel.r * 2, barrel.r * 2 + 10);
    context.fillStyle = '#171512'; context.font = `700 ${16 + pulse}px "Archivo Black",sans-serif`; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText('!', 0, 1);
    context.restore();
  }

  function drawTarget(target, index) {
    if (target.dead) return;
    context.save(); context.translate(target.x, target.y);
    context.fillStyle = '#171512'; context.beginPath(); context.arc(0, 0, target.r + 4, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#e6b48f'; context.beginPath(); context.arc(0, -3, target.r - 3, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#171512'; context.fillRect(-target.r + 4, target.r * .35, target.r * 2 - 8, target.r * .75);
    context.fillStyle = '#f4efe5'; context.beginPath(); context.arc(-7, -5, 4, 0, Math.PI * 2); context.arc(7, -5, 4, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#171512'; context.beginPath(); context.arc(-6, -5, 2, 0, Math.PI * 2); context.arc(8, -5, 2, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#f7d400'; context.beginPath(); context.arc(target.r * .72, -target.r * .72, 11, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#171512'; context.font = '700 11px "Archivo Black",sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(String(index + 1), target.r * .72, -target.r * .72 + 1);
    context.restore();
  }

  function drawAbility() {
    if (phase !== 'playing') return;
    const ready = projectile.flying && !projectile.barkUsed;
    context.save(); context.translate(24, 22);
    context.fillStyle = ready ? '#171512' : 'rgba(23,21,18,.72)'; context.fillRect(0, 0, 196, 42);
    context.strokeStyle = ready ? '#f4efe5' : 'rgba(244,239,229,.55)'; context.lineWidth = 2; context.strokeRect(0, 0, 196, 42);
    context.fillStyle = '#f7d400'; context.font = '700 12px "Archivo Black",sans-serif'; context.textAlign = 'left'; context.textBaseline = 'middle';
    context.fillText(ready ? 'ŤUKNI / SPACE: ŠTEK' : projectile.barkUsed ? 'ŠTEK POUŽITÝ' : 'ŠTEK POČAS LETU', 13, 22);
    context.restore();
  }

  function draw(now) {
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = '#f7d400'; context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = '#f4efe5'; context.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
    context.strokeStyle = '#171512'; context.lineWidth = 5; context.beginPath(); context.moveTo(0, GROUND); context.lineTo(WIDTH, GROUND); context.stroke();
    context.fillStyle = '#171512';
    context.fillRect(SLING.leftX - 8, SLING.anchorY, 16, GROUND - SLING.anchorY);
    context.fillRect(SLING.rightX - 8, SLING.anchorY, 16, GROUND - SLING.anchorY);
    context.strokeStyle = '#7a3827'; context.lineWidth = 8; context.lineCap = 'round';
    context.beginPath(); context.moveTo(SLING.leftX, SLING.anchorY);
    if (projectile.flying) context.quadraticCurveTo(SLING.x, SLING.anchorY + 18, SLING.rightX, SLING.anchorY);
    else { context.lineTo(projectile.x, projectile.y); context.lineTo(SLING.rightX, SLING.anchorY); }
    context.stroke(); context.lineCap = 'butt';
    drawTrajectory();
    blocks.forEach(block => {
      if (block.dead) return;
      const shake = block.shake ? Math.sin(now * .09) * 5 : 0;
      context.save();context.translate(block.x+shake,block.y);context.rotate(block.angle||0);drawBrickBlock(block);context.restore();
    });
    barrels.forEach(barrel => drawBarrel(barrel, now));
    targets.forEach(drawTarget);
    shockwaves.forEach(wave => {
      context.save(); context.globalAlpha = clamp(wave.life * 1.9, 0, 1); context.strokeStyle = wave.color; context.lineWidth = 9 * clamp(wave.life * 2, .25, 1);
      context.beginPath(); context.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2); context.stroke(); context.restore();
    });
    particles.forEach(particle => { context.globalAlpha = clamp(particle.life * 1.8, 0, 1); context.fillStyle = particle.color; context.fillRect(particle.x, particle.y, particle.size, particle.size); }); context.globalAlpha = 1;
    drawDog();
    drawAbility();
  }

  function loop(now) {
    if (!dialog.open) return;
    const dt = Math.min(.033, Math.max(0, (now - previous) / 1000)); previous = now;
    update(dt); draw(now); animation = requestAnimationFrame(loop);
  }

  function startLoop() { cancelAnimationFrame(animation); previous = performance.now(); animation = requestAnimationFrame(loop); }
  function open() { if (!available || dialog.open) return; levelIndex=0;shots=LEVELS[0].shots;score=0;completedRun=false;phase='intro';intro.hidden=false;result.hidden=true;makeLevel();resetProjectile();updateHud();document.documentElement.classList.add('civava-game-open');dialog.showModal();scheduleCanvasFit();onOpen();startLoop();dialog.querySelector('.civava-start').focus(); }
  function close() { if (dialog.open) dialog.close(); }
  function releaseGamePointer(reset=false) { if(pointerId!==null&&canvas.hasPointerCapture?.(pointerId))canvas.releasePointerCapture(pointerId);pointerId=null;dragging=false;if(reset&&phase==='playing'&&!projectile.flying)resetProjectile(); }
  function cleanup() { cancelAnimationFrame(animation); releaseGamePointer(); document.documentElement.classList.remove('civava-game-open'); prompt.hidden=!available; mobileAction.hidden=!available; onClose(); }

  canvas.addEventListener('pointerdown', event => { if (phase!=='playing')return;if(projectile.flying){event.preventDefault();activateBark();return;}if(distance(canvasPoint(event),projectile)>76)return;event.preventDefault();dragging=true;pointerId=event.pointerId;canvas.setPointerCapture(pointerId);aimAt(canvasPoint(event));status.textContent='Ťahaj doľava. Pusti a leť.'; });
  canvas.addEventListener('pointermove', event => { if(!dragging||event.pointerId!==pointerId)return;event.preventDefault();aimAt(canvasPoint(event)); });
  canvas.addEventListener('pointerup', event => { if(event.pointerId!==pointerId)return;release();if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture(event.pointerId);pointerId=null; });
  canvas.addEventListener('pointercancel', () => { releaseGamePointer(true); });
  prompt.addEventListener('click',open); mobileAction.addEventListener('click',open);
  dialog.querySelector('.civava-start').addEventListener('click',resetGame);
  dialog.querySelector('.civava-replay').addEventListener('click',resetGame);
  dialog.querySelector('.civava-return').addEventListener('click',close);
  dialog.querySelector('.civava-close').addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();}); dialog.addEventListener('close',cleanup);
  window.addEventListener('orientationchange',()=>{releaseGamePointer(true);scheduleCanvasFit();});
  window.visualViewport?.addEventListener('resize',scheduleCanvasFit);
  window.addEventListener('keydown', event => {
    if (dialog.open && phase === 'playing' && projectile.flying && (event.code === 'Space' || event.key === ' ')) { event.preventDefault(); activateBark(); return; }
    if (!available || dialog.open || event.repeat || event.key.toLowerCase() !== 'e' || event.target.matches?.('input,textarea,select')) return;
    event.preventDefault(); open();
  });

  return { open, close, isOpen:()=>dialog.open, setAvailable(value,position){available=Boolean(value);if(Number.isFinite(position?.x)){prompt.style.left=`${position.x}px`;prompt.style.top=`${position.y}px`;}prompt.hidden=!available||dialog.open||position?.onScreen===false;mobileAction.hidden=!available||dialog.open;} };
}
