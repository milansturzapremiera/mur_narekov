import './segedinGame.css';

const GAME_LENGTH_MS = 45_000;
const MAX_INGREDIENT = 5;
const BEST_SCORE_KEY = 'mur:segedin-best';

const INGREDIENTS = {
  meat: { label: 'Mäso', key: 'A' },
  cabbage: { label: 'Kapusta', key: 'S' },
  cream: { label: 'Smotana', key: 'D' }
};

const ORDERS = [
  { text: 'Vyvážený segedín bez extrémov.', meat: 2, cabbage: 2, cream: 1 },
  { text: 'Veľa kapusty, málo rozumu.', meat: 1, cabbage: 4, cream: 1 },
  { text: 'Dvojité mäso. Otázky neskôr.', meat: 4, cabbage: 1, cream: 1 },
  { text: 'Nech je to poriadne kyslé.', meat: 2, cabbage: 3, cream: 1 },
  { text: 'Smotany ako z verejných zdrojov.', meat: 1, cabbage: 2, cream: 3 },
  { text: 'Klasika. Nič nevymýšľaj.', meat: 2, cabbage: 2, cream: 2 },
  { text: 'Kapustu tam iba ukáž.', meat: 3, cabbage: 1, cream: 2 },
  { text: 'Jemný, ale stále podozrivý.', meat: 1, cabbage: 2, cream: 4 }
];

function readBestScore() {
  try { return Math.max(0, Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) || '0', 10) || 0); }
  catch { return 0; }
}

function writeBestScore(score) {
  try { localStorage.setItem(BEST_SCORE_KEY, String(score)); } catch {}
}

export function createSegedinGame({ onOpen = () => {}, onClose = () => {}, onBagUnlocked = () => {} } = {}) {
  const host = document.createElement('div');
  host.innerHTML = `
    <button class="segedin-prompt" type="button" hidden aria-label="Spustiť minihru Segedínový algoritmus" aria-haspopup="dialog" aria-controls="segedinGame"></button>
    <button class="segedin-mobile-action" type="button" hidden aria-haspopup="dialog" aria-controls="segedinGame">Hrať</button>
    <dialog class="segedin-game" id="segedinGame" aria-labelledby="segedinGameTitle">
      <div class="segedin-shell" data-state="intro">
        <header class="segedin-topbar">
          <div><span>Stánok č. 03</span><strong id="segedinGameTitle">Segedínový algoritmus</strong></div>
          <dl>
            <div><dt>Čas</dt><dd id="segedinTime">45</dd></div>
            <div><dt>Skóre</dt><dd id="segedinScore">0</dd></div>
            <div><dt>Kombo</dt><dd id="segedinCombo">×0</dd></div>
          </dl>
          <button class="segedin-close" type="button" aria-label="Vrátiť sa k múru">×</button>
        </header>

        <div class="segedin-time-track" aria-hidden="true"><i></i></div>

        <main class="segedin-board">
          <section class="segedin-cast" aria-label="Traja členovia obsluhujú stánok"><div></div><span>Tri ruky. Jeden hrniec. Žiadna zodpovednosť.</span></section>

          <section class="segedin-ticket" aria-labelledby="segedinOrderLabel">
            <span id="segedinOrderLabel">Aktuálna objednávka</span>
            <blockquote id="segedinOrderText">Priprav sa na obednú špičku.</blockquote>
            <p id="segedinOrderTarget">MÄSO 0 · KAPUSTA 0 · SMOTANA 0</p>
          </section>

          <section class="segedin-pot-zone" aria-label="Obsah hrnca">
            <div class="segedin-pot" aria-hidden="true"><div class="segedin-stew"><i></i><i></i><i></i></div><span></span></div>
            <div class="segedin-meters">
              <div class="segedin-meter" data-meter="meat"><span>Mäso</span><i></i><output>0 / 0</output></div>
              <div class="segedin-meter" data-meter="cabbage"><span>Kapusta</span><i></i><output>0 / 0</output></div>
              <div class="segedin-meter" data-meter="cream"><span>Smotana</span><i></i><output>0 / 0</output></div>
            </div>
            <output class="segedin-feedback" id="segedinFeedback" aria-live="polite">Hrniec čaká.</output>
          </section>

          <section class="segedin-controls" aria-label="Prísady">
            <div class="segedin-ingredients">
              <button type="button" data-ingredient="meat"><kbd>A</kbd><strong>Mäso</strong><small>Pridať porciu</small></button>
              <button type="button" data-ingredient="cabbage"><kbd>S</kbd><strong>Kapusta</strong><small>Pridať porciu</small></button>
              <button type="button" data-ingredient="cream"><kbd>D</kbd><strong>Smotana</strong><small>Pridať porciu</small></button>
            </div>
            <div class="segedin-actions">
              <button class="segedin-empty" type="button">Vyliať hrniec <kbd>R</kbd></button>
              <button class="segedin-serve" type="button">Vydať porciu <kbd>MEDZERNÍK</kbd></button>
            </div>
          </section>
        </main>

        <section class="segedin-cover segedin-intro" aria-labelledby="segedinIntroTitle">
          <h2 id="segedinIntroTitle">Nakŕm dav.</h2>
          <p>Namiešaj presný pomer mäsa, kapusty a smotany podľa zákazníka. Zlé porcie stoja tri sekundy.</p>
          <div class="segedin-how"><span><kbd>A</kbd><b>Mäso</b></span><span><kbd>S</kbd><b>Kapusta</b></span><span><kbd>D</kbd><b>Smotana</b></span><span><kbd>SPACE</kbd><b>Vydať</b></span></div>
          <p class="segedin-best-line">Najlepší výsledok: <strong id="segedinBest">0</strong></p>
          <button class="segedin-start" type="button">Otvoriť stánok</button>
        </section>

        <section class="segedin-cover segedin-result" aria-labelledby="segedinResultTitle">
          <span>Koniec obednej špičky</span>
          <h2 id="segedinResultTitle">Kapustový praktikant</h2>
          <p>Výsledné skóre</p><strong class="segedin-final-score">0</strong>
          <p class="segedin-result-note">Stánok prežil. To sa počíta.</p>
          <div><button class="segedin-replay" type="button">Hrať znova</button><button class="segedin-return" type="button">Späť k múru</button></div>
        </section>
      </div>
    </dialog>`;

  const prompt = host.querySelector('.segedin-prompt');
  const mobileAction = host.querySelector('.segedin-mobile-action');
  const dialog = host.querySelector('.segedin-game');
  document.body.append(prompt, mobileAction, dialog);

  const shell = dialog.querySelector('.segedin-shell');
  const timeOutput = dialog.querySelector('#segedinTime');
  const scoreOutput = dialog.querySelector('#segedinScore');
  const comboOutput = dialog.querySelector('#segedinCombo');
  const bestOutput = dialog.querySelector('#segedinBest');
  const orderText = dialog.querySelector('#segedinOrderText');
  const orderTarget = dialog.querySelector('#segedinOrderTarget');
  const feedback = dialog.querySelector('#segedinFeedback');
  const cast = dialog.querySelector('.segedin-cast');
  const timeBar = dialog.querySelector('.segedin-time-track i');
  const ingredientButtons = [...dialog.querySelectorAll('[data-ingredient]')];
  const serveButton = dialog.querySelector('.segedin-serve');
  const emptyButton = dialog.querySelector('.segedin-empty');
  const startButton = dialog.querySelector('.segedin-start');
  const replayButton = dialog.querySelector('.segedin-replay');
  const returnButton = dialog.querySelector('.segedin-return');
  const closeButton = dialog.querySelector('.segedin-close');

  let available = false;
  let active = false;
  let phase = 'intro';
  let frame = 0;
  let deadline = 0;
  let remaining = GAME_LENGTH_MS;
  let pausedRemaining = null;
  let score = 0;
  let combo = 0;
  let bestScore = readBestScore();
  let orderIndex = -1;
  let orderLocked = false;
  let order = ORDERS[0];
  let current = { meat: 0, cabbage: 0, cream: 0 };

  const setPhase = value => { phase = value; shell.dataset.state = value; };

  function selectOrder() {
    let next = orderIndex;
    while (next === orderIndex) next = Math.floor(Math.random() * ORDERS.length);
    orderIndex = next;
    order = ORDERS[orderIndex];
    orderLocked = false;
    current = { meat: 0, cabbage: 0, cream: 0 };
    orderText.textContent = order.text;
    orderTarget.textContent = `MÄSO ${order.meat} · KAPUSTA ${order.cabbage} · SMOTANA ${order.cream}`;
    feedback.textContent = 'Hrniec čaká.';
    renderValues();
  }

  function renderValues() {
    timeOutput.textContent = String(Math.max(0, Math.ceil(remaining / 1000)));
    scoreOutput.textContent = String(score);
    comboOutput.textContent = `×${combo}`;
    bestOutput.textContent = String(bestScore);
    timeBar.style.setProperty('--time-ratio', String(Math.max(0, Math.min(1, remaining / GAME_LENGTH_MS))));
    Object.entries(INGREDIENTS).forEach(([name]) => {
      const meter = dialog.querySelector(`[data-meter="${name}"]`);
      meter.style.setProperty('--fill-ratio', String(current[name] / MAX_INGREDIENT));
      meter.style.setProperty('--target', `${order[name] / MAX_INGREDIENT * 100}%`);
      meter.querySelector('output').textContent = `${current[name]} / ${order[name]}`;
    });
    ingredientButtons.forEach(button => { button.disabled = phase !== 'playing' || orderLocked || current[button.dataset.ingredient] >= MAX_INGREDIENT; });
    const potFill = Object.values(current).reduce((sum, value) => sum + value, 0) / (MAX_INGREDIENT * 3);
    dialog.querySelector('.segedin-stew').style.setProperty('--pot-fill', String(Math.max(.12, potFill)));
    const hasIngredient = Object.values(current).some(Boolean);
    serveButton.disabled = phase !== 'playing' || orderLocked || !hasIngredient;
    emptyButton.disabled = phase !== 'playing' || orderLocked || !hasIngredient;
  }

  function react(kind) {
    cast.dataset.reaction = '';
    void cast.offsetWidth;
    cast.dataset.reaction = kind;
  }

  function addIngredient(name) {
    if (phase !== 'playing' || orderLocked || !(name in current) || current[name] >= MAX_INGREDIENT) return;
    current[name] += 1;
    feedback.textContent = `${INGREDIENTS[name].label}: ${current[name]} z ${order[name]}.`;
    react(name);
    renderValues();
  }

  function emptyPot() {
    if (phase !== 'playing' || orderLocked) return;
    current = { meat: 0, cabbage: 0, cream: 0 };
    feedback.textContent = 'Hrniec je prázdny. Začni odznova.';
    react('empty');
    renderValues();
  }

  function serve() {
    if (phase !== 'playing' || orderLocked || !Object.values(current).some(Boolean)) return;
    orderLocked = true;
    const exact = Object.keys(INGREDIENTS).every(name => current[name] === order[name]);
    if (exact) {
      combo += 1;
      const points = 100 + Math.max(0, combo - 1) * 25;
      score += points;
      feedback.textContent = `Presná porcia. +${points} bodov.`;
      react('success');
    } else {
      combo = 0;
      deadline -= 3000;
      remaining = Math.max(0, deadline - performance.now());
      feedback.textContent = 'Zlý pomer. Zákazník odišiel a stratil si 3 sekundy.';
      react('failure');
    }
    renderValues();
    window.setTimeout(() => { if (phase === 'playing') selectOrder(); }, 420);
  }

  function resultTitle(value) {
    if (value >= 3000) return ['Admin Segedínu', 'Čierna taška ZOMRI je tvoja. Ostatní ju uvidia pri múre.'];
    if (value >= 2000) return ['Rýchloručka', 'Porcie lietajú. Kotlík nestíha chladnúť.'];
    if (value >= 1000) return ['Makač', 'Ruky makajú. Kotlík drží.'];
    return ['Kotlíkový amatér', 'Základy kotlíka máš. Dav zatiaľ čaká.'];
  }

  function finishGame() {
    if (phase !== 'playing') return;
    cancelAnimationFrame(frame);
    remaining = 0;
    if (score > bestScore) { bestScore = score; writeBestScore(score); }
    if (score >= 3000) onBagUnlocked(score);
    const [title, note] = resultTitle(score);
    dialog.querySelector('#segedinResultTitle').textContent = title;
    dialog.querySelector('.segedin-final-score').textContent = String(score);
    dialog.querySelector('.segedin-result-note').textContent = note;
    setPhase('result');
    renderValues();
    replayButton.focus();
  }

  function tick(now) {
    if (phase !== 'playing') return;
    remaining = Math.max(0, deadline - now);
    renderValues();
    if (remaining <= 0) finishGame();
    else frame = requestAnimationFrame(tick);
  }

  function startGame() {
    cancelAnimationFrame(frame);
    score = 0; combo = 0; remaining = GAME_LENGTH_MS; pausedRemaining = null;
    setPhase('playing');
    selectOrder();
    deadline = performance.now() + remaining;
    frame = requestAnimationFrame(tick);
    ingredientButtons[0].focus();
  }

  function finishClose() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(frame);
    pausedRemaining = null;
    setPhase('intro');
    document.documentElement.classList.remove('segedin-game-open');
    onClose();
  }

  function close() {
    if (!dialog.open) return;
    dialog.close();
  }

  function open() {
    if (!available || dialog.open) return;
    active = true;
    bestScore = readBestScore();
    remaining = GAME_LENGTH_MS;
    setPhase('intro');
    renderValues();
    document.documentElement.classList.add('segedin-game-open');
    dialog.showModal();
    onOpen();
    startButton.focus();
  }

  prompt.addEventListener('click', open);
  mobileAction.addEventListener('click', open);
  startButton.addEventListener('click', startGame);
  replayButton.addEventListener('click', startGame);
  returnButton.addEventListener('click', close);
  closeButton.addEventListener('click', close);
  dialog.addEventListener('close', finishClose);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  ingredientButtons.forEach(button => button.addEventListener('click', () => addIngredient(button.dataset.ingredient)));
  serveButton.addEventListener('click', serve);
  emptyButton.addEventListener('click', emptyPot);

  window.addEventListener('keydown', event => {
    if (!dialog.open) {
      if (available && !event.repeat && event.key.toLowerCase() === 'e' && !event.target.matches?.('input,textarea,select')) { event.preventDefault(); open(); }
      return;
    }
    if (phase !== 'playing') return;
    const key = event.key.toLowerCase();
    const ingredient = key === 'a' ? 'meat' : key === 's' ? 'cabbage' : key === 'd' ? 'cream' : null;
    if (ingredient) { event.preventDefault(); event.stopImmediatePropagation(); addIngredient(ingredient); }
    else if (event.code === 'Space') { event.preventDefault(); event.stopImmediatePropagation(); serve(); }
    else if (key === 'r') { event.preventDefault(); event.stopImmediatePropagation(); emptyPot(); }
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (phase !== 'playing' || !dialog.open) return;
    if (document.hidden) {
      pausedRemaining = Math.max(0, deadline - performance.now());
      cancelAnimationFrame(frame);
    } else if (pausedRemaining !== null) {
      remaining = pausedRemaining;
      deadline = performance.now() + remaining;
      pausedRemaining = null;
      frame = requestAnimationFrame(tick);
    }
  });

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
