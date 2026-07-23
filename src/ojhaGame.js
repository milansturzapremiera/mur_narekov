import './ojhaGame.css';

const ASSETS = {
  run: '/assets/run/ojha.png',
  jump: '/assets/run/ojha-skok.png',
  corridor: '/assets/run/chodba.png',
  street: '/assets/run/chodnik.png',
  courtyard: '/assets/run/vnutroblok.png',
  book: '/assets/run/siskaci.jpg',
  audi: '/assets/run/audi.png'
};

const TOTAL_DISTANCE = 2100;
const CRASH_DISTANCE = 1370;
const VIEW_DISTANCE = 220;
const JUMP_DURATION = .92;
const BEST_KEY = 'mur:ojha-best-v1';
const SOUNDTRACK_SRC = '/assets/audio/run.mp3';
const QUESTIONS = [
  'Ako ste mysleli, že to mala byť priemyselná špionáž?',
  'Prosím vás, naozaj utekáte?',
  'Prosím vás, nebudete hádam pred nami utekať.',
  'Máme ísť výťahom?',
  'Môžete sa zastaviť.'
];
const SCENES = [
  { from: 0, to: 700, label: 'CHODBA FPU', image: 'corridor', horizon: .36, ground: .88, laneSpread: .245 },
  { from: 700, to: 1400, label: 'ULICA', image: 'street', horizon: .35, ground: .89, laneSpread: .215 },
  { from: 1400, to: TOTAL_DISTANCE, label: 'NÁVRAT DO BUDOVY', image: 'courtyard', horizon: .37, ground: .89, laneSpread: .225 }
];
const obstacleRun = (start, spacing, lanes, doubles = []) => lanes.map((lane, index) => [
  start + index * spacing,
  lane,
  doubles.includes(index) ? 2 : 1
]);
const OBSTACLES = [
  ...obstacleRun(92, 42, [-1,1,0,-1,1,0,1,-1,0,1,-1,0,1,-1], [4,9,12]),
  ...obstacleRun(758, 43, [0,-1,1,0,1,-1,0,-1,1,0,1,-1,0,1], [3,7,11]),
  ...obstacleRun(1460, 43, [1,-1,0,1,0,-1,1,-1,0,1,0,-1,1,0,-1], [2,6,10,13])
].map(([at,lane,stack], id) => ({ id, at, lane, stack, handled: false }));
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value)));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function readBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

function writeBest(value) {
  try { localStorage.setItem(BEST_KEY, String(value)); } catch {}
}

export function createOjhaGame({ onOpen = () => {}, onClose = () => {}, onBriefcaseUnlocked = () => {}, soundtrackVolume = () => .55 } = {}) {
  const host = document.createElement('div');
  host.innerHTML = `
    <button class="ojha-prompt" type="button" hidden aria-label="Spustiť minihru Ojha: Útek pred otázkami" aria-haspopup="dialog" aria-controls="ojhaGame"></button>
    <button class="ojha-mobile-action" type="button" hidden aria-haspopup="dialog" aria-controls="ojhaGame">Hrať</button>
    <dialog class="ojha-game" id="ojhaGame" aria-labelledby="ojhaTitle">
      <div class="ojha-shell" data-state="intro">
        <header class="ojha-topbar">
          <div class="ojha-title"><span>MINIHRA Č. 03 · <b data-scene>CHODBA FPU</b></span><strong id="ojhaTitle">OJHA: ÚTEK PRED OTÁZKAMI</strong></div>
          <dl>
            <div><dt>Čas</dt><dd data-time>0,0</dd></div>
            <div><dt>Skóre</dt><dd data-score>0</dd></div>
            <div><dt>Chyby</dt><dd data-errors>0/3</dd></div>
          </dl>
          <button class="ojha-close" type="button" aria-label="Späť k múru">×</button>
        </header>
        <main class="ojha-stage">
          <canvas aria-label="Trojpruhová bežecká hra. Uhýbaj doľava a doprava a preskakuj knihy."></canvas>
          <div class="ojha-bubble" role="status" aria-live="polite" hidden></div>
          <div class="ojha-stage-card" aria-live="polite" hidden></div>
          <div class="ojha-touch-controls" aria-label="Ovládanie minihry">
            <button type="button" data-ojha-move="-1" aria-label="Presunúť sa doľava">←</button>
            <button type="button" data-ojha-jump aria-label="Skočiť">↑<small>SKOK</small></button>
            <button type="button" data-ojha-move="1" aria-label="Presunúť sa doprava">→</button>
          </div>
        </main>
        <section class="ojha-cover ojha-intro">
          <span>TRI PRUHY · TRI ÚSEKY · PRIVEĽA OTÁZOK</span>
          <h2>Uteč bez odpovede.</h2>
          <p>Prebehni chodbou, obehni budovu a vráť sa dovnútra. Knihy preskoč alebo obíď. Každý náraz pustí novinárov bližšie.</p>
          <div class="ojha-how">
            <span><kbd>A</kbd><kbd>D</kbd> PRUHY</span>
            <span><kbd>SPACE</kbd> SKOK</span>
            <span class="ojha-touch-help">ŤAH DO STRANY ALEBO HORE</span>
          </div>
          <p class="ojha-loading" data-loading>Pripravujem chodbu…</p>
          <button class="ojha-start" type="button" disabled>Začať útek</button>
        </section>
        <section class="ojha-cover ojha-result" hidden>
          <span data-result-kicker>ÚTEK JE NA KONCI</span>
          <h2 data-result-title>Ojha sa vrátil.</h2>
          <strong data-final-score>0</strong>
          <p data-result-note>Bez odpovede, zato načas.</p>
          <div><button class="ojha-replay" type="button">Utekať znova</button><button class="ojha-return" type="button">Späť k múru</button></div>
        </section>
      </div>
    </dialog>`;

  const prompt = host.querySelector('.ojha-prompt');
  const mobileAction = host.querySelector('.ojha-mobile-action');
  const dialog = host.querySelector('.ojha-game');
  const shell = host.querySelector('.ojha-shell');
  const stage = host.querySelector('.ojha-stage');
  const canvas = host.querySelector('canvas');
  const context = canvas.getContext('2d');
  const bubble = host.querySelector('.ojha-bubble');
  const stageCard = host.querySelector('.ojha-stage-card');
  const intro = host.querySelector('.ojha-intro');
  const result = host.querySelector('.ojha-result');
  const startButton = host.querySelector('.ojha-start');
  const loading = host.querySelector('[data-loading]');
  const timeOutput = host.querySelector('[data-time]');
  const scoreOutput = host.querySelector('[data-score]');
  const errorOutput = host.querySelector('[data-errors]');
  const sceneOutput = host.querySelector('[data-scene]');
  const images = {};
  const soundtrack = new Audio();
  soundtrack.loop = true;
  soundtrack.preload = 'none';
  document.body.append(prompt, mobileAction, dialog);

  let available = false;
  let loadPromise = null;
  let ready = false;
  let active = false;
  let phase = 'intro';
  let frame = 0;
  let previous = performance.now();
  let startedAt = 0;
  let elapsed = 0;
  let distance = 0;
  let lane = 0;
  let targetLane = 0;
  let jumpTime = 0;
  let slowTime = 0;
  let crashTime = 0;
  let errors = 0;
  let score = 0;
  let combo = 0;
  let lastScene = 0;
  let nextQuestion = 0;
  let bubbleUntil = 0;
  let stageCardUntil = 0;
  let pointerStart = null;
  let obstacles = [];

  function loadImage(name, src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => { images[name] = image; resolve(image); };
      image.onerror = reject;
      image.src = src;
    });
  }

  function ensureAssets() {
    if (loadPromise) return loadPromise;
    loading.textContent = 'Pripravujem chodbu…';
    loadPromise = Promise.all(Object.entries(ASSETS).map(([name, src]) => loadImage(name, src)))
      .then(() => {
        ready = true;
        startButton.disabled = false;
        loading.textContent = 'Trasa je pripravená.';
      })
      .catch(() => {
        loading.textContent = 'Niektorý obraz sa nenačítal. Skús hru otvoriť znova.';
        loadPromise = null;
      });
    return loadPromise;
  }

  function resizeCanvas() {
    const rect = stage.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  new ResizeObserver(() => requestAnimationFrame(resizeCanvas)).observe(stage);

  function resetGame() {
    phase = 'playing';
    shell.dataset.state = 'playing';
    intro.hidden = true;
    result.hidden = true;
    distance = 0;
    lane = 0;
    targetLane = 0;
    jumpTime = 0;
    slowTime = 0;
    crashTime = 0;
    errors = 0;
    score = 0;
    combo = 0;
    lastScene = 0;
    nextQuestion = 0;
    bubbleUntil = 0;
    stageCardUntil = performance.now() + 1700;
    stageCard.textContent = '1 · CHODBA FPU';
    stageCard.hidden = false;
    bubble.hidden = true;
    obstacles = OBSTACLES.map(obstacle => ({ ...obstacle, handled: false }));
    startedAt = performance.now();
    elapsed = 0;
    updateHud();
  }

  function sceneIndexAt(value) {
    if (value >= 1400) return 2;
    if (value >= 700) return 1;
    return 0;
  }

  function updateHud() {
    timeOutput.textContent = (elapsed / 1000).toFixed(1).replace('.', ',');
    scoreOutput.textContent = String(score);
    errorOutput.textContent = `${errors}/3`;
    sceneOutput.textContent = SCENES[sceneIndexAt(distance)].label;
  }

  function sayQuestion(index, now = performance.now()) {
    if (!QUESTIONS[index]) return;
    bubble.textContent = QUESTIONS[index];
    bubble.hidden = false;
    bubbleUntil = now + 2850;
    nextQuestion = Math.max(nextQuestion, index + 1);
  }

  function move(direction) {
    if (phase !== 'playing') return;
    targetLane = clamp(targetLane + direction, -1, 1);
  }

  function jump() {
    if (phase !== 'playing' || jumpTime > 0) return;
    jumpTime = .001;
  }

  function hitObstacle(now) {
    errors += 1;
    combo = 0;
    slowTime = 1.15;
    score = Math.max(0, score - 450);
    sayQuestion(Math.min(nextQuestion, QUESTIONS.length - 1), now);
    if (errors >= 3) finish(false);
  }

  function clearObstacle() {
    combo += 1;
    score += 180 + Math.min(420, combo * 35);
  }

  function finish(won) {
    phase = won ? 'result' : 'caught';
    elapsed = performance.now() - startedAt;
    const timeBonus = won ? Math.max(0, Math.round(7000 - elapsed / 12)) : 0;
    const accuracyBonus = won ? (3 - errors) * 1200 : 0;
    score += timeBonus + accuracyBonus;
    const best = Math.max(readBest(), score);
    if (won) writeBest(best);
    const perfectEscape = won && errors === 0;
    if (perfectEscape) onBriefcaseUnlocked();
    dialog.querySelector('[data-result-kicker]').textContent = won ? 'ÚTEK JE NA KONCI' : 'NOVINÁRI BOLI RÝCHLEJŠÍ';
    dialog.querySelector('[data-result-title]').textContent = won ? 'Ojha sa vrátil.' : 'Ojha musel odpovedať.';
    dialog.querySelector('[data-final-score]').textContent = String(score);
    dialog.querySelector('[data-result-note]').textContent = won
      ? `${errors ? `Chyby: ${errors}.` : 'Bez jediného zaváhania. Kufrík bez komentára je odomknutý.'} Najlepší výsledok: ${best}.`
      : 'Tri nárazy. Päť otázok. Žiadny ďalší únik.';
    result.hidden = false;
    shell.dataset.state = 'result';
    updateHud();
    dialog.querySelector('.ojha-replay').focus();
  }

  function beginCrash(now) {
    phase = 'crash';
    crashTime = 0;
    targetLane = 0;
    sayQuestion(3, now);
  }

  function update(dt, now) {
    if (phase === 'playing') {
      elapsed = Math.max(0, now - startedAt);
      lane += (targetLane - lane) * (1 - Math.exp(-12 * dt));
      if (jumpTime > 0) {
        jumpTime += dt;
        if (jumpTime >= JUMP_DURATION) jumpTime = 0;
      }
      slowTime = Math.max(0, slowTime - dt);
      const scene = sceneIndexAt(distance);
      const baseSpeed = [35, 40, 45][scene];
      const oldDistance = distance;
      distance += baseSpeed * (slowTime > 0 ? .42 : 1) * dt;
      score += Math.round(baseSpeed * dt * (8 + Math.min(combo, 8)));

      if (nextQuestion === 0 && distance >= 135) sayQuestion(0, now);
      else if (nextQuestion === 1 && distance >= 560) sayQuestion(1, now);
      else if (nextQuestion === 2 && distance >= 1020) sayQuestion(2, now);
      else if (nextQuestion === 4 && distance >= 1850) sayQuestion(4, now);

      obstacles.forEach(obstacle => {
        if (obstacle.handled || oldDistance >= obstacle.at || distance < obstacle.at) return;
        obstacle.handled = true;
        const airborne = jumpTime >= .045 && jumpTime <= JUMP_DURATION - .08;
        if (Math.abs(lane - obstacle.lane) < .48 && !airborne) hitObstacle(now);
        else clearObstacle();
      });

      if (phase === 'playing' && oldDistance < CRASH_DISTANCE && distance >= CRASH_DISTANCE) beginCrash(now);
      if (phase === 'playing' && distance >= TOTAL_DISTANCE) finish(true);

      const currentScene = sceneIndexAt(distance);
      if (currentScene !== lastScene) {
        lastScene = currentScene;
        stageCard.textContent = `${currentScene + 1} · ${SCENES[currentScene].label}`;
        stageCard.hidden = false;
        stageCardUntil = now + 1500;
      }
      updateHud();
    } else if (phase === 'crash') {
      crashTime += dt;
      elapsed = Math.max(0, now - startedAt);
      lane += (0 - lane) * (1 - Math.exp(-9 * dt));
      if (crashTime >= 1.55) {
        phase = 'playing';
        distance = 1402;
        lastScene = 2;
        stageCard.textContent = '3 · NÁVRAT DO BUDOVY';
        stageCard.hidden = false;
        stageCardUntil = now + 1500;
      }
      updateHud();
    }
    if (!bubble.hidden && now >= bubbleUntil) bubble.hidden = true;
    if (!stageCard.hidden && now >= stageCardUntil) stageCard.hidden = true;
  }

  function drawCoverImage(image, width, height, progress = 0) {
    if (!image?.complete) {
      context.fillStyle = '#dfe8ef';
      context.fillRect(0, 0, width, height);
      return;
    }
    const zoom = 1 + progress * .055;
    const scale = Math.max(width / image.width, height / image.height) * zoom;
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (image.width - sourceWidth) * .5;
    const sourceY = clamp((image.height - sourceHeight) * (.48 + progress * .06), 0, image.height - sourceHeight);
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  }

  function drawBackground(width, height) {
    const sceneIndex = sceneIndexAt(distance);
    const scene = SCENES[sceneIndex];
    const local = clamp((distance - scene.from) / (scene.to - scene.from), 0, 1);
    drawCoverImage(images[scene.image], width, height, local);
    const vignette = context.createLinearGradient(0, 0, 0, height);
    vignette.addColorStop(0, 'rgba(18,16,13,.12)');
    vignette.addColorStop(.55, 'rgba(18,16,13,0)');
    vignette.addColorStop(1, 'rgba(18,16,13,.28)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, width, height);
  }

  function scenePerspective(width, height) {
    const scene = SCENES[sceneIndexAt(distance)];
    return {
      horizon: height * scene.horizon,
      ground: height * scene.ground,
      spread: width * scene.laneSpread
    };
  }

  function drawLaneGuides(width, height) {
    const { horizon, ground, spread } = scenePerspective(width, height);
    const startY = horizon + (ground - horizon) * .08;
    const activeLeft = targetLane - .5;
    const activeRight = targetLane + .5;
    context.save();
    context.beginPath();
    context.moveTo(width * .5 + activeLeft * spread * .08, startY);
    context.lineTo(width * .5 + activeRight * spread * .08, startY);
    context.lineTo(width * .5 + activeRight * spread, ground);
    context.lineTo(width * .5 + activeLeft * spread, ground);
    context.closePath();
    context.fillStyle = 'rgba(92,177,238,.075)';
    context.fill();
    context.strokeStyle = 'rgba(235,244,249,.62)';
    context.lineWidth = 1.25;
    context.setLineDash([9, 13]);
    context.lineDashOffset = -(distance * .9) % 22;
    [-1.5,-.5,.5,1.5].forEach(boundary => {
      context.beginPath();
      context.moveTo(width * .5 + boundary * spread * .08, startY);
      context.lineTo(width * .5 + boundary * spread, ground);
      context.stroke();
    });
    context.restore();
  }

  function obstaclePosition(obstacle, width, height) {
    const delta = obstacle.at - distance;
    const depth = clamp(1 - delta / VIEW_DISTANCE, 0, 1);
    const eased = depth * depth;
    const perspective = scenePerspective(width, height);
    const spread = perspective.spread * (.08 + eased * .92);
    return {
      visible: delta > -3 && delta < VIEW_DISTANCE,
      x: width * .5 + obstacle.lane * spread,
      y: perspective.horizon + eased * (perspective.ground - perspective.horizon),
      scale: .1 + eased * .82,
      alpha: clamp((delta + 3) / 3, 0, 1)
    };
  }

  function drawBook(obstacle, width, height) {
    const point = obstaclePosition(obstacle, width, height);
    if (!point.visible) return;
    const base = Math.min(width / 430, height / 720);
    const bookWidth = 92 * base * point.scale;
    const bookHeight = bookWidth;
    context.save();
    context.globalAlpha = point.alpha;
    context.translate(point.x, point.y);
    context.shadowColor = 'rgba(15,13,10,.45)';
    context.shadowBlur = 12 * point.scale;
    context.shadowOffsetY = 7 * point.scale;
    for (let index = 0; index < obstacle.stack; index += 1) {
      const offset = index * bookHeight * .62;
      context.save();
      context.translate((index % 2 ? 3 : -2) * point.scale, -offset);
      context.rotate((index % 2 ? 1 : -1) * .025);
      context.drawImage(images.book, -bookWidth / 2, -bookHeight, bookWidth, bookHeight);
      context.restore();
    }
    context.restore();
  }

  function drawPlayer(now, width, height) {
    const jumping = jumpTime > 0;
    const image = jumping ? images.jump : images.run;
    if (!image?.complete) return;
    const progress = jumping ? clamp(jumpTime / JUMP_DURATION, 0, .999) : (now / (slowTime > 0 ? 125 : 66)) % 5 / 5;
    const spriteFrame = jumping ? Math.min(4, Math.floor(progress * 5)) : Math.floor(progress * 5);
    const frameWidth = image.width / 5;
    const scale = clamp(Math.min(width / 620, height / 690), .52, 1.12);
    const drawHeight = 242 * scale;
    const drawWidth = drawHeight * frameWidth / image.height;
    const jumpLift = jumping ? Math.sin(Math.PI * progress) * height * .15 : 0;
    const laneSpread = scenePerspective(width, height).spread;
    const x = width * .5 + lane * laneSpread;
    const y = height * .885 - jumpLift;
    const crashJolt = phase === 'crash' && crashTime > .7
      ? Math.sin(Math.min(1, (crashTime - .7) / .35) * Math.PI) * width * .07
      : 0;
    context.save();
    context.translate(x - crashJolt, y);
    if (phase === 'crash' && crashTime > .7) context.rotate(-Math.min(.32, (crashTime - .7) * .55));
    context.drawImage(image, spriteFrame * frameWidth, 0, frameWidth, image.height, -drawWidth / 2, -drawHeight, drawWidth, drawHeight);
    context.restore();
  }

  function drawAudi(width, height) {
    if (phase !== 'crash' || !images.audi?.complete) return;
    const approach = clamp(crashTime / .78, 0, 1);
    const impact = clamp((crashTime - .72) / .25, 0, 1);
    const carWidth = width * (.18 + approach * .64);
    const carHeight = carWidth * images.audi.height / images.audi.width;
    const x = width * .5 + width * .07;
    const y = height * .88 + (1 - approach) * height * .22;
    context.save();
    if (impact > 0 && !reducedMotion.matches) context.translate((Math.random() - .5) * 12 * (1 - impact), (Math.random() - .5) * 7 * (1 - impact));
    context.drawImage(images.audi, x - carWidth * .5, y - carHeight, carWidth, carHeight);
    context.restore();
  }

  function draw(now) {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const width = canvas.width / ratio;
    const height = canvas.height / ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    drawBackground(width, height);
    drawLaneGuides(width, height);
    obstacles
      .filter(obstacle => obstacle.at - distance > -3)
      .sort((a, b) => b.at - a.at)
      .forEach(obstacle => drawBook(obstacle, width, height));
    drawPlayer(now, width, height);
    drawAudi(width, height);
    if (phase === 'crash' && crashTime > .7 && crashTime < 1.05) {
      context.fillStyle = `rgba(92,177,238,${Math.sin((crashTime - .7) / .35 * Math.PI) * .62})`;
      context.fillRect(0, 0, width, height);
    }
  }

  function loop(now) {
    if (!dialog.open || !active) return;
    const dt = Math.min(.04, Math.max(0, (now - previous) / 1000));
    previous = now;
    update(dt, now);
    draw(now);
    frame = requestAnimationFrame(loop);
  }

  function startLoop() {
    cancelAnimationFrame(frame);
    previous = performance.now();
    active = true;
    frame = requestAnimationFrame(loop);
  }

  function startSoundtrack() {
    if (!soundtrack.src) soundtrack.src = SOUNDTRACK_SRC;
    soundtrack.volume = clamp(soundtrackVolume(), 0, 1);
    soundtrack.currentTime = 0;
    soundtrack.play().catch(() => {});
  }

  function stopSoundtrack() {
    soundtrack.pause();
    soundtrack.currentTime = 0;
  }

  function open() {
    if (!available || dialog.open) return;
    shell.dataset.state = 'intro';
    phase = 'intro';
    intro.hidden = false;
    result.hidden = true;
    document.documentElement.classList.add('ojha-game-open');
    dialog.showModal();
    requestAnimationFrame(resizeCanvas);
    ensureAssets();
    onOpen();
    startSoundtrack();
    startLoop();
    (ready ? startButton : dialog.querySelector('.ojha-close')).focus();
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  function cleanup() {
    active = false;
    cancelAnimationFrame(frame);
    pointerStart = null;
    stopSoundtrack();
    document.documentElement.classList.remove('ojha-game-open');
    prompt.hidden = !available;
    mobileAction.hidden = !available;
    onClose();
  }

  canvas.addEventListener('pointerdown', event => {
    if (phase !== 'playing') return;
    event.preventDefault();
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', event => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    if (dy < -34 && Math.abs(dy) > Math.abs(dx)) jump();
    else if (Math.abs(dx) > 30) move(Math.sign(dx));
    else move(event.clientX < innerWidth / 2 ? -1 : 1);
    pointerStart = null;
  });
  canvas.addEventListener('pointercancel', () => { pointerStart = null; });
  dialog.querySelectorAll('[data-ojha-move]').forEach(button => button.addEventListener('click', () => move(Number(button.dataset.ojhaMove))));
  dialog.querySelector('[data-ojha-jump]').addEventListener('click', jump);
  prompt.addEventListener('click', open);
  mobileAction.addEventListener('click', open);
  startButton.addEventListener('click', () => { if (ready) resetGame(); });
  dialog.querySelector('.ojha-replay').addEventListener('click', resetGame);
  dialog.querySelector('.ojha-return').addEventListener('click', close);
  dialog.querySelector('.ojha-close').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', cleanup);
  document.addEventListener('visibilitychange', () => {
    if (!dialog.open || !active) return;
    if (document.hidden) {
      active = false;
      cancelAnimationFrame(frame);
    } else {
      previous = performance.now();
      if (phase === 'playing' || phase === 'crash') startedAt = previous - elapsed;
      startLoop();
    }
  });
  window.addEventListener('keydown', event => {
    if (!dialog.open) {
      if (available && !event.repeat && event.key.toLowerCase() === 'e' && !event.target.matches?.('input,textarea,select')) {
        event.preventDefault();
        open();
      }
      return;
    }
    if (phase !== 'playing') return;
    if (['arrowleft', 'a'].includes(event.key.toLowerCase())) { event.preventDefault(); event.stopImmediatePropagation(); move(-1); }
    else if (['arrowright', 'd'].includes(event.key.toLowerCase())) { event.preventDefault(); event.stopImmediatePropagation(); move(1); }
    else if (event.code === 'Space' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') { event.preventDefault(); event.stopImmediatePropagation(); jump(); }
  }, true);

  return {
    open,
    close,
    isOpen: () => dialog.open,
    setAvailable(value, position) {
      available = Boolean(value);
      if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) {
        prompt.style.left = `${position.x}px`;
        prompt.style.top = `${position.y}px`;
      }
      prompt.hidden = !available || dialog.open || position?.onScreen === false;
      mobileAction.hidden = !available || dialog.open;
    }
  };
}
