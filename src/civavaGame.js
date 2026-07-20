import './civavaGame.css';

const WIDTH = 1000;
const HEIGHT = 560;
const GROUND = 486;
const SLING = { x: 172, y: 402 };
const SHOTS = 3;
const BEST_KEY = 'mur:civava-best';
const DOG_SRC = '/assets/scene/1784366828126-pes.webp';

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
          <div><span>MINIHRA Č. 02</span><strong id="civavaTitle">Čivava na odstrel</strong></div>
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
          <p>Potiahni ju dozadu, namier na papalášsku konštrukciu a pusti. Máš tri pokusy.</p>
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
  const intro = host.querySelector('.civava-intro');
  const result = host.querySelector('.civava-result');
  const dog = new Image(); dog.src = DOG_SRC;
  document.body.append(prompt, mobileAction, dialog);

  let available = false;
  let phase = 'intro';
  let animation = 0;
  let previous = performance.now();
  let shots = SHOTS;
  let score = 0;
  let dragging = false;
  let pointerId = null;
  let resultTimer = 0;
  let projectile;
  let blocks = [];
  let targets = [];
  let particles = [];

  function makeLevel() {
    blocks = [
      { x: 664, y: 426, w: 54, h: 120, label: 'FUNKCIA', hp: 1 },
      { x: 822, y: 426, w: 54, h: 120, label: 'TENDER', hp: 1 },
      { x: 743, y: 354, w: 230, h: 34, label: 'DOTÁCIA', hp: 1 },
      { x: 705, y: 291, w: 48, h: 92, label: 'FLEK', hp: 1 },
      { x: 785, y: 291, w: 48, h: 92, label: 'FLEK', hp: 1 },
      { x: 745, y: 231, w: 176, h: 30, label: 'NAŠI ĽUDIA', hp: 1 }
    ].map((block, index) => ({ ...block, id: index, dead: false, shake: 0 }));
    targets = [
      { x: 744, y: 419, r: 27, dead: false },
      { x: 744, y: 307, r: 24, dead: false },
      { x: 744, y: 194, r: 25, dead: false }
    ];
    particles = [];
  }

  function resetProjectile() {
    projectile = { x: SLING.x, y: SLING.y, vx: 0, vy: 0, r: 30, flying: false, rest: 0, age: 0, angle: 0 };
    status.textContent = 'Potiahni čivavu dozadu a pusti.';
  }

  function resetGame() {
    shots = SHOTS; score = 0; resultTimer = 0; phase = 'playing';
    makeLevel(); resetProjectile(); updateHud();
    intro.hidden = true; result.hidden = true;
  }

  function updateHud() {
    shotsOutput.textContent = String(shots);
    scoreOutput.textContent = String(score);
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height };
  }

  function aimAt(point) {
    const dx = point.x - SLING.x, dy = point.y - SLING.y;
    const length = Math.hypot(dx, dy) || 1, limit = 126, scale = Math.min(1, limit / length);
    projectile.x = SLING.x + Math.min(12, dx * scale);
    projectile.y = SLING.y + dy * scale;
  }

  function release() {
    if (!dragging || phase !== 'playing') return;
    dragging = false;
    const pullX = SLING.x - projectile.x, pullY = SLING.y - projectile.y, power = Math.hypot(pullX, pullY);
    if (power < 14) return resetProjectile();
    projectile.vx = pullX * 5.65;
    projectile.vy = pullY * 5.65;
    projectile.flying = true;
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
      if (speed > 245) destroyBlock(block);
      if (Math.abs(dx) > Math.abs(dy)) projectile.vx *= -.42;
      else projectile.vy *= -.42;
      projectile.x += Math.sign(dx || projectile.vx) * 5;
      projectile.y += Math.sign(dy || projectile.vy) * 5;
    });
  }

  function finishShot() {
    if (targets.every(target => target.dead)) return finishGame(true);
    if (shots > 0) { resetProjectile(); return; }
    finishGame(false);
  }

  function finishGame(won) {
    if (phase !== 'playing') return;
    phase = 'ending'; resultTimer = .85;
    if (won) score += shots * 750;
    updateHud();
  }

  function showResult() {
    phase = 'result';
    const won = targets.every(target => target.dead);
    let best = 0; try { best = Number(localStorage.getItem(BEST_KEY)) || 0; if (score > best) localStorage.setItem(BEST_KEY, String(score)); } catch {}
    dialog.querySelector('[data-result-title]').textContent = won ? 'Papalášska statika zlyhala.' : 'Konštrukcia stále drží.';
    dialog.querySelector('[data-final-score]').textContent = String(score);
    dialog.querySelector('[data-result-note]').textContent = score > best ? 'Nový znalecký rekord.' : won ? 'Všetky funkcie boli otrasené.' : 'Rozpočet prežil ďalšie obdobie.';
    result.hidden = false;
    dialog.querySelector('.civava-replay').focus();
  }

  function update(dt) {
    blocks.forEach(block => { block.shake = Math.max(0, block.shake - dt); });
    particles.forEach(particle => { particle.vy += 620 * dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt; });
    particles = particles.filter(particle => particle.life > 0);
    if (phase === 'ending') { resultTimer -= dt; if (resultTimer <= 0) showResult(); }
    if (phase !== 'playing' || !projectile.flying) return;
    projectile.age += dt;
    projectile.vy += 760 * dt;
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
    if (targets.every(target => target.dead)) finishGame(true);
    else if (projectile.rest > .75 || projectile.age > 6 || projectile.x > WIDTH + 120 || projectile.y > HEIGHT + 120) finishShot();
  }

  function drawTrajectory() {
    if (!dragging) return;
    const vx = (SLING.x - projectile.x) * 5.65, vy = (SLING.y - projectile.y) * 5.65;
    context.fillStyle = '#171512';
    for (let t = .15; t <= 1.2; t += .15) {
      const x = SLING.x + vx * t, y = SLING.y + vy * t + 380 * t * t;
      context.beginPath(); context.arc(x, y, Math.max(2, 5 - t * 2), 0, Math.PI * 2); context.fill();
    }
  }

  function drawDog() {
    context.save(); context.translate(projectile.x, projectile.y); context.rotate(projectile.flying ? projectile.angle : 0);
    if (dog.complete && dog.naturalWidth) {
      const frameWidth = dog.naturalWidth / 5, frame = projectile.flying ? Math.floor(projectile.age * 10) % 5 : 0;
      context.drawImage(dog, frame * frameWidth, 0, frameWidth, dog.naturalHeight, -41, -45, 82, 90);
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
    context.fillStyle = '#171512'; context.fillRect(SLING.x - 38, SLING.y + 22, 18, GROUND - SLING.y - 22); context.fillRect(SLING.x + 20, SLING.y + 22, 18, GROUND - SLING.y - 22);
    context.strokeStyle = '#7a3827'; context.lineWidth = 9; context.beginPath(); context.moveTo(SLING.x - 29, SLING.y + 28); context.lineTo(projectile.x, projectile.y); context.lineTo(SLING.x + 29, SLING.y + 28); context.stroke();
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
  function open() { if (!available || dialog.open) return; phase='intro'; intro.hidden=false; result.hidden=true; makeLevel(); resetProjectile(); updateHud(); document.documentElement.classList.add('civava-game-open'); dialog.showModal(); onOpen(); startLoop(); dialog.querySelector('.civava-start').focus(); }
  function close() { if (dialog.open) dialog.close(); }
  function cleanup() { cancelAnimationFrame(animation); dragging=false; document.documentElement.classList.remove('civava-game-open'); prompt.hidden=!available; mobileAction.hidden=!available; onClose(); }

  canvas.addEventListener('pointerdown', event => { if (phase!=='playing'||projectile.flying||distance(canvasPoint(event),projectile)>76)return;event.preventDefault();dragging=true;pointerId=event.pointerId;canvas.setPointerCapture(pointerId);aimAt(canvasPoint(event));status.textContent='Pusti a leť.'; });
  canvas.addEventListener('pointermove', event => { if(!dragging||event.pointerId!==pointerId)return;event.preventDefault();aimAt(canvasPoint(event)); });
  canvas.addEventListener('pointerup', event => { if(event.pointerId===pointerId)release(); });
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
