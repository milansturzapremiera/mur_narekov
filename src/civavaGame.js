import './civavaGame.css';

const WIDTH = 1000;
const HEIGHT = 560;
const GROUND = 486;
const SLING = { x: 178, y: 398, leftX: 143, rightX: 213, anchorY: 391 };
const LAUNCH_X = 6.2;
const LAUNCH_Y = 9.5;
const GRAVITY = 650;
const BEST_KEY = 'mur:civava-best';
const DOG_SRC = '/assets/scene/1784366828126-pes.webp';
const LEVELS = [
  {
    name: 'Základná nominácia', shots: 3,
    blocks: [[664,426,54,120,'FUNKCIA'],[822,426,54,120,'TENDER'],[743,354,230,34,'DOTÁCIA'],[705,291,48,92,'FLEK'],[785,291,48,92,'FLEK'],[745,231,176,30,'NAŠI ĽUDIA']],
    targets: [[744,419,27],[744,307,24],[744,194,25]]
  },
  {
    name: 'Trojkoalícia', shots: 3,
    blocks: [[650,426,44,120,'SĽUB'],[760,426,44,120,'DOHODA'],[870,426,44,120,'POST'],[760,350,270,32,'KOALÍCIA'],[700,285,44,98,'KRESLO'],[820,285,44,98,'KRESLO'],[760,222,190,30,'PROGRAM']],
    targets: [[705,420,26],[815,420,26],[760,307,24],[760,185,24]]
  },
  {
    name: 'Pyramída funkcií', shots: 4,
    blocks: [[680,449,125,28,'ÚRAD'],[820,449,125,28,'ÚRAD'],[750,392,46,86,'FUNKCIA'],[750,337,270,30,'SCHÉMA'],[695,280,44,84,'FLEK'],[805,280,44,84,'FLEK'],[750,225,190,28,'RODINA']],
    targets: [[680,405,25],[820,405,25],[750,290,24],[750,188,24]]
  },
  {
    name: 'Rezortná pevnosť', shots: 4,
    blocks: [[640,421,48,130,'REZORT'],[735,421,48,130,'ZMLUVA'],[830,421,48,130,'TENDER'],[925,421,48,130,'FIRMA'],[782,342,330,34,'ROZPOČET'],[700,274,46,102,'DOZOR'],[865,274,46,102,'DOZOR'],[782,212,230,30,'NOMINANT']],
    targets: [[687,420,25],[782,420,25],[877,420,25],[782,295,24],[782,175,24]]
  },
  {
    name: 'Nedobytný systém', shots: 5,
    blocks: [[620,428,44,116,'MY'],[700,428,44,116,'NAŠI'],[780,428,44,116,'ĽUDIA'],[860,428,44,116,'FLEKY'],[940,428,44,116,'ISTOTA'],[780,354,360,32,'SYSTÉM'],[660,290,44,96,'KŠEFT'],[780,290,44,96,'KŠEFT'],[900,290,44,96,'KŠEFT'],[780,228,300,30,'BEZ TRESTU'],[720,265,42,74,'POST'],[840,265,42,74,'POST']],
    targets: [[660,420,25],[740,420,25],[820,420,25],[900,420,25],[720,304,24],[840,304,24],[780,180,24]]
  }
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value)));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function createCivavaGame({ onOpen = () => {}, onClose = () => {} } = {}) {
  const host = document.createElement('div');
  host.innerHTML = `
    <button class="civava-prompt" type="button" hidden aria-label="Spustiť minihru Čivava na odstrel" aria-haspopup="dialog" aria-controls="civavaGame"></button>
    <button class="civava-mobile-action" type="button" hidden aria-haspopup="dialog" aria-controls="civavaGame">Hrať</button>
    <dialog class="civava-game" id="civavaGame" aria-labelledby="civavaTitle">
      <div class="civava-shell">
        <header class="civava-topbar">
          <div><span>MINIHRA Č. 02 · LEVEL <b data-level>1/5</b></span><strong id="civavaTitle">Čivava na odstrel</strong></div>
          <dl><div><dt>Čivavy</dt><dd data-shots>3</dd></div><div><dt>Skóre</dt><dd data-score>0</dd></div></dl>
          <button class="civava-close" type="button" aria-label="Späť k múru">×</button>
        </header>
        <main class="civava-stage">
          <canvas width="1000" height="560" aria-label="Hracia plocha. Potiahni čivavu dozadu a pusti ju smerom na konštrukciu."></canvas>
          <p class="civava-status" aria-live="polite">Potiahni čivavu dozadu a pusti.</p>
        </main>
        <section class="civava-cover civava-intro">
          <span>ODBOR BALISTICKEJ KYNOLÓGIE</span>
          <h2>Odisti čivavu.</h2>
          <p>Potiahni ju doľava od praku, namier a pusti. Prebi sa cez päť úrovní papalášskych konštrukcií.</p>
          <div class="civava-how"><b>1</b><span>Potiahni</span><b>2</b><span>Namier</span><b>3</b><span>Pusti</span></div>
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
  const canvas = host.querySelector('canvas');
  const context = canvas.getContext('2d');
  const status = host.querySelector('.civava-status');
  const shotsOutput = host.querySelector('[data-shots]');
  const scoreOutput = host.querySelector('[data-score]');
  const levelOutput = host.querySelector('[data-level]');
  const intro = host.querySelector('.civava-intro');
  const result = host.querySelector('.civava-result');
  const dog = new Image(); dog.src = DOG_SRC;
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
  let particles = [];

  function makeLevel() {
    const level = LEVELS[levelIndex];
    blocks = level.blocks.map(([x,y,w,h,label],index) => ({ x,y,w,h,label,hp:1,id:index,dead:false,shake:0 }));
    targets = level.targets.map(([x,y,r]) => ({ x,y,r,dead:false }));
    particles = [];
  }

  function resetProjectile() {
    projectile = { x: SLING.x, y: SLING.y, vx: 0, vy: 0, r: 27, flying: false, rest: 0, age: 0, angle: 0 };
    status.textContent = 'Potiahni čivavu doľava, namier a pusti.';
  }

  function resetGame() {
    levelIndex = 0; shots = LEVELS[0].shots; score = 0; resultTimer = 0; completedRun = false; phase = 'playing';
    makeLevel(); resetProjectile(); updateHud();
    status.textContent = `Level 1/5 · ${LEVELS[0].name}`;
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
    projectile.flying = true;
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

  function destroyBlock(block) {
    if (block.dead) return;
    block.dead = true; score += 120; burst(block.x, block.y, '#ffd500', 14);
    targets.forEach(target => { if (!target.dead && Math.hypot(target.x - block.x, target.y - block.y) < 82) destroyTarget(target); });
  }

  function destroyTarget(target) {
    if (target.dead) return;
    target.dead = true; score += 500; burst(target.x, target.y, '#f4efe5', 18);
  }

  function collideProjectile() {
    const speed = Math.hypot(projectile.vx, projectile.vy);
    targets.forEach(target => {
      if (target.dead || distance(projectile, target) > projectile.r + target.r) return;
      destroyTarget(target); projectile.vx *= .72; projectile.vy -= 80;
    });
    blocks.forEach(block => {
      if (block.dead) return;
      const left = block.x - block.w / 2, right = block.x + block.w / 2, top = block.y - block.h / 2, bottom = block.y + block.h / 2;
      const nearestX = clamp(projectile.x, left, right), nearestY = clamp(projectile.y, top, bottom);
      const dx = projectile.x - nearestX, dy = projectile.y - nearestY;
      if (dx * dx + dy * dy > projectile.r * projectile.r) return;
      block.shake = .22;
      if (speed > 245) {
        destroyBlock(block);
        projectile.vx *= .78; projectile.vy *= .9;
        projectile.x += Math.sign(projectile.vx || 1) * 10;
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) projectile.vx *= -.42;
      else projectile.vy *= -.42;
      projectile.x += Math.sign(dx || projectile.vx) * 5;
      projectile.y += Math.sign(dy || projectile.vy) * 5;
    });
  }

  function finishShot() {
    if (targets.every(target => target.dead)) return finishLevel();
    if (shots > 0) { resetProjectile(); return; }
    finishGame();
  }

  function finishLevel() {
    if (phase !== 'playing') return;
    score += 500 + levelIndex * 250 + shots * 300;
    if (levelIndex === LEVELS.length - 1) {
      completedRun = true; phase = 'ending'; resultTimer = 1;
      status.textContent = 'Systém padol. Vyhodnocujem škody.';
    } else {
      phase = 'level-clear'; resultTimer = 1.15;
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
    dialog.querySelector('[data-result-title]').textContent = completedRun ? 'Celý systém sa zosypal.' : 'Konštrukcia stále drží.';
    dialog.querySelector('[data-final-score]').textContent = String(score);
    const progress = `${completedRun ? LEVELS.length : levelIndex} z ${LEVELS.length} levelov dokončených.`;
    dialog.querySelector('[data-result-note]').textContent = score > best ? `${progress} Nový znalecký rekord.` : completedRun ? `${progress} Všetky funkcie boli otrasené.` : `${progress} Rozpočet prežil ďalšie obdobie.`;
    result.hidden = false;
    dialog.querySelector('.civava-replay').focus();
  }

  function update(dt) {
    blocks.forEach(block => { block.shake = Math.max(0, block.shake - dt); });
    particles.forEach(particle => { particle.vy += 620 * dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt; });
    particles = particles.filter(particle => particle.life > 0);
    if (phase === 'level-clear') { resultTimer -= dt; if (resultTimer <= 0) advanceLevel(); }
    if (phase === 'ending') { resultTimer -= dt; if (resultTimer <= 0) showResult(); }
    if (phase !== 'playing' || !projectile.flying) return;
    projectile.age += dt;
    projectile.vy += GRAVITY * dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.angle = Math.atan2(projectile.vy, projectile.vx);
    collideProjectile();
    if (projectile.y + projectile.r > GROUND) {
      projectile.y = GROUND - projectile.r;
      projectile.vy *= -.28; projectile.vx *= .78;
      if (Math.abs(projectile.vy) < 32) projectile.vy = 0;
    }
    const slow = Math.hypot(projectile.vx, projectile.vy) < 34 && projectile.y + projectile.r >= GROUND - 2;
    projectile.rest = slow ? projectile.rest + dt : 0;
    if (targets.every(target => target.dead)) finishLevel();
    else if (projectile.rest > .75 || projectile.age > 6 || projectile.x > WIDTH + 120 || projectile.y > HEIGHT + 120) finishShot();
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
    context.save(); context.translate(projectile.x, projectile.y); context.rotate(projectile.flying ? projectile.angle : 0);
    if (dog.complete && dog.naturalWidth) {
      const frameWidth = dog.naturalWidth / 5, frame = projectile.flying ? Math.floor(projectile.age * 10) % 5 : 0;
      const width = projectile.flying ? 76 : 68, height = projectile.flying ? 84 : 75;
      context.drawImage(dog, frame * frameWidth, 0, frameWidth, dog.naturalHeight, -width/2, -height/2, width, height);
    } else {
      context.fillStyle = '#b96f39'; context.beginPath(); context.arc(0, 0, projectile.r, 0, Math.PI * 2); context.fill();
    }
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
      context.save(); context.translate(block.x + shake, block.y); context.fillStyle = '#f4efe5'; context.strokeStyle = '#171512'; context.lineWidth = 4; context.fillRect(-block.w/2,-block.h/2,block.w,block.h); context.strokeRect(-block.w/2,-block.h/2,block.w,block.h);
      context.fillStyle = '#171512'; context.font = `700 ${Math.min(18,Math.max(11,block.w/7))}px "Barlow Condensed",sans-serif`; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(block.label,0,0,block.w-8); context.restore();
    });
    targets.forEach((target, index) => {
      if (target.dead) return;
      context.fillStyle = '#171512'; context.beginPath(); context.arc(target.x,target.y,target.r,0,Math.PI*2); context.fill();
      context.fillStyle = '#f7d400'; context.font = '700 24px "Archivo Black",sans-serif'; context.textAlign='center';context.textBaseline='middle';context.fillText(String(index+1),target.x,target.y+1);
    });
    particles.forEach(particle => { context.globalAlpha = clamp(particle.life * 1.8, 0, 1); context.fillStyle = particle.color; context.fillRect(particle.x, particle.y, particle.size, particle.size); }); context.globalAlpha = 1;
    drawDog();
  }

  function loop(now) {
    if (!dialog.open) return;
    const dt = Math.min(.033, Math.max(0, (now - previous) / 1000)); previous = now;
    update(dt); draw(now); animation = requestAnimationFrame(loop);
  }

  function startLoop() { cancelAnimationFrame(animation); previous = performance.now(); animation = requestAnimationFrame(loop); }
  function open() { if (!available || dialog.open) return; levelIndex=0;shots=LEVELS[0].shots;score=0;completedRun=false;phase='intro';intro.hidden=false;result.hidden=true;makeLevel();resetProjectile();updateHud();document.documentElement.classList.add('civava-game-open');dialog.showModal();onOpen();startLoop();dialog.querySelector('.civava-start').focus(); }
  function close() { if (dialog.open) dialog.close(); }
  function cleanup() { cancelAnimationFrame(animation); dragging=false; document.documentElement.classList.remove('civava-game-open'); prompt.hidden=!available; mobileAction.hidden=!available; onClose(); }

  canvas.addEventListener('pointerdown', event => { if (phase!=='playing'||projectile.flying||distance(canvasPoint(event),projectile)>76)return;event.preventDefault();dragging=true;pointerId=event.pointerId;canvas.setPointerCapture(pointerId);aimAt(canvasPoint(event));status.textContent='Ťahaj doľava. Pusti a leť.'; });
  canvas.addEventListener('pointermove', event => { if(!dragging||event.pointerId!==pointerId)return;event.preventDefault();aimAt(canvasPoint(event)); });
  canvas.addEventListener('pointerup', event => { if(event.pointerId!==pointerId)return;release();if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture(event.pointerId);pointerId=null; });
  canvas.addEventListener('pointercancel', () => { dragging=false;resetProjectile(); });
  prompt.addEventListener('click',open); mobileAction.addEventListener('click',open);
  dialog.querySelector('.civava-start').addEventListener('click',resetGame);
  dialog.querySelector('.civava-replay').addEventListener('click',resetGame);
  dialog.querySelector('.civava-return').addEventListener('click',close);
  dialog.querySelector('.civava-close').addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();}); dialog.addEventListener('close',cleanup);
  window.addEventListener('keydown', event => {
    if (!available || dialog.open || event.repeat || event.key.toLowerCase() !== 'e' || event.target.matches?.('input,textarea,select')) return;
    event.preventDefault(); open();
  });

  return { open, close, isOpen:()=>dialog.open, setAvailable(value,position){available=Boolean(value);if(Number.isFinite(position?.x)){prompt.style.left=`${position.x}px`;prompt.style.top=`${position.y}px`;}prompt.hidden=!available||dialog.open||position?.onScreen===false;mobileAction.hidden=!available||dialog.open;} };
}
