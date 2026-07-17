import './sceneEditor.css';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value)));
const LANDING_FIELDS = [
  ['eyebrow','Horný riadok',80],['titleLine1','Nadpis – prvý riadok',80],['titleLine2','Nadpis – zvýraznený riadok',80],
  ['lead','Úvodný popis',320,'textarea'],['controlsTitle','Nadpis ovládania',40],['movementText','Popis pohybu',100],
  ['runText','Popis behu',100],['mobileHint','Mobilný návod',240,'textarea'],['skinLegend','Odtieň pokožky',80],
  ['nameLegend','Menovka',80],['nameOptional','Voliteľné',40],['nameLabel','Meno',40],['namePlaceholder','Placeholder mena',80],
  ['colorLabel','Farba',40],['submitButton','Vstupné tlačidlo',80],['footer','Spodný text',240,'textarea']
];
const LANDING_FONTS = ['Archivo Black','Barlow Condensed','Against Myself','Don Graffiti','Mostwasted','Punk Kid','Impact','Georgia'];
const LANDING_ELEMENTS = [
  ['eyebrow','Horný riadok'],['title','Hlavný nadpis'],['lead','Úvodný popis'],['controls','Ovládanie'],['footer','Spodný text']
];
const LANDING_ELEMENT_RANGES = { sizeDesktop:[10,160,'px'],sizeMobile:[10,80,'px'],xDesktop:[-120,120,'px'],yDesktop:[-120,120,'px'],xMobile:[-32,32,'px'],yMobile:[-64,64,'px'] };
const LANDING_STYLE_RANGES = {
  titleSizeDesktop:[64,160,'px'], titleSizeMobile:[42,80,'px'], leadSizeDesktop:[16,28,'px'], leadSizeMobile:[16,22,'px'],
  backgroundPositionX:[-12,12,'%'], backgroundPositionY:[-12,12,'%'], backgroundOpacity:[10,100,'%'],
  desktopCopyX:[-80,80,'px'], desktopCopyY:[-100,100,'px'], desktopFormX:[-80,80,'px'], desktopFormY:[-80,80,'px'],
  mobileCopyX:[-24,24,'px'], mobileCopyY:[-48,48,'px'], mobileFormX:[-16,16,'px'], mobileFormY:[-32,64,'px']
};
const landingRange = (name,label) => {
  const [min,max] = LANDING_STYLE_RANGES[name];
  return `<label>${label}<output data-landing-style-output="${name}"></output><input name="${name}" type="range" min="${min}" max="${max}" step="1"></label>`;
};
const landingColor = (name,label) => `<label class="dev-landing-color"><span>${label}</span><input name="${name}" type="color"></label>`;
const landingFont = (name,label) => `<label>${label}<select name="${name}">${LANDING_FONTS.map(font=>`<option value="${font}">${font}</option>`).join('')}</select></label>`;
const landingElementRange = (name,label) => {
  const [min,max] = LANDING_ELEMENT_RANGES[name];
  return `<label>${label}<output data-landing-element-output="${name}"></output><input name="${name}" type="range" min="${min}" max="${max}" step="1"></label>`;
};

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Obrázok sa nepodarilo prečítať.'));
    reader.readAsDataURL(file);
  });
}

async function request(path, body) {
  const response = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Operácia zlyhala.');
  return data;
}

export function mountSceneEditor(api) {
  let items = api.getItems(), terrain = api.getTerrain(), landing = api.getLanding(), selectedId = null, open = false, dirty = false, dragging = false, landingElement = 'eyebrow';

  const trigger = document.createElement('button');
  trigger.className = 'dev-scene-trigger';
  trigger.type = 'button';
  trigger.innerHTML = '<span>DEV</span> Editor';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'devScenePanel');

  const panel = document.createElement('aside');
  panel.className = 'dev-scene-panel';
  panel.id = 'devScenePanel';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <header class="dev-scene-head">
      <div><span>LOKÁLNY NÁSTROJ</span><h2>Editor projektu</h2></div>
      <button type="button" data-action="close" aria-label="Zatvoriť editor">×</button>
    </header>
    <div class="dev-scene-body">
    <details class="dev-landing">
      <summary><span>Text landing page</span><small>Úpravy vidíš okamžite</small></summary>
      <form class="dev-landing-form">
        ${LANDING_FIELDS.map(([key,label,maxLength,type])=>`<label>${label}${type==='textarea'?`<textarea name="${key}" maxlength="${maxLength}" rows="3"></textarea>`:`<input name="${key}" maxlength="${maxLength}">`}</label>`).join('')}
      </form>
    </details>
    <details class="dev-landing-style">
      <summary><span>Vzhľad landing page</span><small>Desktop + mobil</small></summary>
      <form class="dev-landing-style-form">
        <fieldset class="dev-landing-background"><legend>Obrázok na pozadí</legend>
          <label class="dev-background-upload"><input class="dev-background-file" type="file" accept="image/png,image/jpeg,image/webp"><span><b>＋ Nahrať obrázok</b><small>PNG, JPG alebo WebP · max. 8 MB</small></span></label>
          <div class="dev-background-preview" data-background-preview><span>Bez obrázka</span><img alt="Náhľad pozadia"><button type="button" data-action="remove-landing-background">Odstrániť</button></div>
          <label>Spôsob zobrazenia<select name="backgroundFit"><option value="cover">Prekryť celú plochu</option><option value="contain">Zobraziť celý obrázok</option><option value="repeat">Opakovať ako textúru</option></select></label>
          ${landingRange('backgroundPositionX','Posun doľava / doprava')}${landingRange('backgroundPositionY','Posun hore / dole')}${landingRange('backgroundOpacity','Viditeľnosť obrázka')}
        </fieldset>
        <fieldset><legend>Písmo a veľkosť</legend>
          ${landingFont('displayFont','Font nadpisov')}${landingFont('bodyFont','Font ostatných textov')}
        </fieldset>
        <fieldset><legend>Farby</legend><div class="dev-landing-colors">
          ${landingColor('backgroundColor','Pozadie')}${landingColor('formBackgroundColor','Karta')}
          ${landingColor('textColor','Bežný text')}${landingColor('titleColor','Nadpis')}
          ${landingColor('eyebrowColor','Horný riadok')}${landingColor('accentColor','Akcent')}
          ${landingColor('buttonBackgroundColor','Tlačidlo')}${landingColor('buttonTextColor','Text tlačidla')}
        </div></fieldset>
        <fieldset class="dev-landing-element"><legend>Veľkosť a poloha textu</legend><p>Vyber text. Každý prvok má vlastné hodnoty pre desktop a mobil.</p>
          <label>Upravovaný text<select name="textElement">${LANDING_ELEMENTS.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>
          <div class="dev-landing-device"><b>Desktop</b>${landingElementRange('sizeDesktop','Veľkosť')}${landingElementRange('xDesktop','Doľava / doprava')}${landingElementRange('yDesktop','Hore / dole')}</div>
          <div class="dev-landing-device"><b>Mobil</b>${landingElementRange('sizeMobile','Veľkosť')}${landingElementRange('xMobile','Doľava / doprava')}${landingElementRange('yMobile','Hore / dole')}</div>
        </fieldset>
        <fieldset><legend>Poloha karty</legend><p>Samostatný posun formulára, v bezpečnom rozsahu pre zariadenie.</p>
          ${landingRange('desktopFormX','Desktop · doľava / doprava')}${landingRange('desktopFormY','Desktop · hore / dole')}
          ${landingRange('mobileFormX','Mobil · doľava / doprava')}${landingRange('mobileFormY','Mobil · hore / dole')}
        </fieldset>
      </form>
    </details>
    <details class="dev-terrain">
      <summary><span>Skladba terénu</span><small>Responzívne pomery obrazovky</small></summary>
      <form class="dev-terrain-form">
        <label>Veľký múr <output data-terrain-output="wallHeight"></output><input name="wallHeight" type="range" min="20" max="55" step="0.5"></label>
        <label>Malý múrik <output data-terrain-output="lowWallHeight"></output><input name="lowWallHeight" type="range" min="3" max="10" step="0.5"></label>
        <label>Tráva pri múre <output data-terrain-output="upperGrassHeight"></output><input name="upperGrassHeight" type="range" min="1" max="6" step="0.5"></label>
        <label>Chodník <output data-terrain-output="walkwayHeight"></output><input name="walkwayHeight" type="range" min="4" max="15" step="0.5"></label>
        <label>Spodná tráva <output data-terrain-output="bottomGrassHeight"></output><input name="bottomGrassHeight" type="range" min="3" max="15" step="0.5"></label>
      </form>
    </details>
    <section class="dev-object-browser">
      <label class="dev-upload">
        <input type="file" accept="image/png,image/jpeg,image/webp">
        <span><b>＋ Pridať grafiku</b><small>PNG, JPG alebo WebP · max. 8 MB</small></span>
      </label>
      <p class="dev-scene-help">Vyber objekt a klikni do sveta. Ťahaním ho presunieš.</p>
      <label class="dev-object-search"><span>Hľadať objekt</span><output data-object-count></output><input type="search" placeholder="Strom, lampa, budova…"></label>
      <div class="dev-scene-list" aria-label="Objekty v scéne"></div>
    </section>
    <form class="dev-scene-properties" hidden>
      <div class="dev-detail-head"><button type="button" data-action="back-to-list">← Späť na zoznam</button><strong data-detail-name></strong></div>
      <label>Názov<input name="name" maxlength="60"></label>
      <div class="dev-scene-pair">
        <label>Vrstva<select name="layer"><option value="behind">Za múrom</option><option value="front">Pred múrom</option></select></label>
        <label>Meter<input name="x" type="number" min="0" max="700" step="0.1"></label>
      </div>
      <label>Veľkosť <output data-output="widthM"></output><input name="widthM" type="range" min="0.2" max="100" step="0.1"></label>
      <label>Výška / poloha Y <output data-output="y"></output><input name="y" type="range" min="-2.5" max="5" step="0.01"></label>
      <label>Uhol <output data-output="rotation"></output><input name="rotation" type="range" min="-180" max="180" step="1"></label>
      <label class="dev-animation-toggle"><input name="animated" type="checkbox"><span>Animovaný asset</span></label>
      <fieldset class="dev-animation-settings" hidden>
        <legend>Sprite sheet</legend>
        <div class="dev-scene-pair">
          <label>Počet políčok<input name="frames" type="number" min="2" max="60" step="1"></label>
          <label>Rýchlosť FPS<input name="fps" type="number" min="0.5" max="30" step="0.5"></label>
        </div>
        <label>Smer políčok<select name="frameDirection"><option value="horizontal">Vodorovne →</option><option value="vertical">Zvislo ↓</option></select></label>
        <small>Všetky políčka musia mať rovnakú veľkosť a byť bez medzier.</small>
      </fieldset>
      <fieldset class="dev-generator">
        <legend>Kópie pozdĺž 700 m</legend>
        <p>Zachová výšku, vrstvu, veľkosť, uhol aj animáciu. Nové rozmiestnenie nahradí predošlú sériu.</p>
        <label>Rozostup <output data-generated-count></output><input name="spacing" type="number" min="5" max="350" step="1" value="50"><span>metrov</span></label>
        <div><button type="button" data-action="generate-line">Rozmiestniť kópie</button><button type="button" data-action="clear-generated">Odstrániť sériu</button></div>
      </fieldset>
      <div class="dev-scene-actions"><button type="button" data-action="duplicate">Duplikovať</button><button type="button" data-action="delete">Odstrániť</button></div>
    </form>
    <details class="dev-maintenance">
      <summary><span>Údržba</span><small data-graffiti-count></small></summary>
      <div class="dev-graffiti-tools">
        <p>Vyčistí všetky graffiti z lokálnej DEV steny.</p>
        <button type="button" data-action="reset-graffiti">Vyčistiť graffiti</button>
      </div>
    </details>
    </div>
    <footer class="dev-scene-footer">
      <span class="dev-scene-status" role="status">Projekt je uložený</span>
      <button type="button" data-action="save" class="dev-scene-save">Uložiť projekt</button>
    </footer>`;

  document.body.append(trigger, panel);
  const list = panel.querySelector('.dev-scene-list');
  const panelBody = panel.querySelector('.dev-scene-body');
  const form = panel.querySelector('.dev-scene-properties');
  const status = panel.querySelector('.dev-scene-status');
  const saveButton = panel.querySelector('[data-action="save"]');
  const fileInput = panel.querySelector('.dev-upload input[type="file"]');
  const backgroundFileInput = panel.querySelector('.dev-background-file');
  const backgroundPreview = panel.querySelector('[data-background-preview]');
  const animationSettings = panel.querySelector('.dev-animation-settings');
  const graffitiCount = panel.querySelector('[data-graffiti-count]');
  const terrainForm = panel.querySelector('.dev-terrain-form');
  const landingForm = panel.querySelector('.dev-landing-form');
  const landingStyleForm = panel.querySelector('.dev-landing-style-form');
  const objectSearch = panel.querySelector('.dev-object-search input');
  const objectCount = panel.querySelector('[data-object-count]');
  const detailName = panel.querySelector('[data-detail-name]');
  const generatedCount = panel.querySelector('[data-generated-count]');

  function updateGraffitiCount() {
    const count = api.getGraffitiCount();
    graffitiCount.textContent = `${count} ${count === 1 ? 'odkaz' : count > 1 && count < 5 ? 'odkazy' : 'odkazov'}`;
  }

  function fillTerrainForm() {
    Object.entries(terrain).forEach(([key, value]) => {
      if (!terrainForm.elements[key]) return;
      const percent = Number((value * 100).toFixed(1));
      terrainForm.elements[key].value = percent;
      terrainForm.querySelector(`[data-terrain-output="${key}"]`).textContent = `${percent}%`;
    });
  }

  function fillLandingForm() {
    LANDING_FIELDS.forEach(([key]) => { landingForm.elements[key].value = landing[key] || ''; });
  }

  function fillLandingStyleForm() {
    Object.entries(landing.styles || {}).forEach(([key,value]) => {
      if (!landingStyleForm.elements[key]) return;
      landingStyleForm.elements[key].value = value;
      const output = landingStyleForm.querySelector(`[data-landing-style-output="${key}"]`);
      if (output) output.textContent = `${value}${LANDING_STYLE_RANGES[key]?.[2] || ''}`;
    });
    landingStyleForm.elements.textElement.value = landingElement;
    const values = landing.styles?.elements?.[landingElement] || {};
    Object.entries(LANDING_ELEMENT_RANGES).forEach(([key,[,,unit]])=>{
      landingStyleForm.elements[key].value = values[key] ?? 0;
      landingStyleForm.querySelector(`[data-landing-element-output="${key}"]`).textContent = `${values[key] ?? 0}${unit}`;
    });
    const backgroundImage = landing.styles?.backgroundImage || '';
    backgroundPreview.classList.toggle('has-image',Boolean(backgroundImage));
    if (backgroundImage) backgroundPreview.querySelector('img').src = backgroundImage;
    else backgroundPreview.querySelector('img').removeAttribute('src');
    backgroundPreview.querySelector('button').disabled = !backgroundImage;
  }

  function selected() { return items.find(item => item.id === selectedId); }

  function syncGenerated(item, fields) {
    items.filter(candidate => candidate.generatedFrom === item.id).forEach(copy => {
      fields.forEach(field => { copy[field] = item[field]; });
    });
  }

  function setStatus(message, kind = '') {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function markDirty() {
    dirty = true;
    saveButton.disabled = false;
    setStatus('Neuložené zmeny', 'dirty');
    api.setItems(items);
  }

  function updateOutputs(item) {
    form.querySelector('[data-output="widthM"]').textContent = `${Number(item.widthM).toFixed(1)} m`;
    form.querySelector('[data-output="y"]').textContent = Number(item.y).toFixed(2);
    form.querySelector('[data-output="rotation"]').textContent = `${item.rotation > 0 ? '+' : ''}${item.rotation}°`;
  }

  function fillForm() {
    const item = selected();
    form.hidden = !item;
    panel.classList.toggle('show-detail', Boolean(item));
    if (!item) return;
    detailName.textContent = item.name;
    ['name', 'layer', 'x', 'widthM', 'y', 'rotation'].forEach(key => { form.elements[key].value = item[key]; });
    form.elements.animated.checked = item.animated === true;
    form.elements.frames.value = item.frames || 5;
    form.elements.fps.value = item.fps || 6;
    form.elements.frameDirection.value = item.frameDirection === 'vertical' ? 'vertical' : 'horizontal';
    animationSettings.hidden = !form.elements.animated.checked;
    const count = items.filter(candidate => candidate.generatedFrom === item.id).length;
    generatedCount.textContent = count ? `${count} kópií` : 'bez kópií';
    updateOutputs(item);
  }

  function renderList() {
    list.replaceChildren();
    const roots = items.filter(item => !item.generatedFrom);
    const query = objectSearch.value.trim().toLocaleLowerCase('sk');
    const visible = query ? roots.filter(item => item.name.toLocaleLowerCase('sk').includes(query)) : roots;
    const copyCount = items.length - roots.length;
    objectCount.textContent = copyCount ? `${roots.length} + ${copyCount} kópií` : `${roots.length} objektov`;
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'dev-scene-empty';
      empty.textContent = roots.length ? 'Žiadny objekt nezodpovedá hľadaniu.' : 'Zatiaľ tu nič nie je. Nahraj prvý strom, odpadok alebo inú grafiku.';
      list.append(empty);
    } else {
      visible.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dev-scene-item';
        button.dataset.id = item.id;
        button.setAttribute('aria-pressed', String(item.id === selectedId));
        const image = document.createElement('img'); image.src = item.src; image.alt = '';
        const copy = document.createElement('span');
        const name = document.createElement('b'); name.textContent = item.name;
        const meta = document.createElement('small');
        const generated = items.filter(candidate => candidate.generatedFrom === item.id).length;
        meta.textContent = `${item.layer === 'behind' ? 'ZA' : 'PRED'} · ${Number(item.x).toFixed(1)} m${generated ? ` · +${generated} KÓPIÍ` : ''}${item.animated ? ` · ${item.frames || 5}F/${item.fps || 6}FPS` : ''}`;
        copy.append(name, meta); button.append(image, copy); list.append(button);
      });
    }
    fillForm();
  }

  function choose(id) {
    selectedId = id;
    api.setSelected(id);
    renderList();
    panelBody.scrollTop = 0;
  }

  function toggle(force) {
    open = typeof force === 'boolean' ? force : !open;
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    trigger.setAttribute('aria-expanded', String(open));
    trigger.innerHTML = open ? '<span>DEV</span> Zavrieť' : '<span>DEV</span> Editor';
    trigger.setAttribute('aria-label',open ? 'Zavrieť DEV editor' : 'Otvoriť DEV editor');
    api.setEditing(open);
    if (open) {
      updateGraffitiCount();
      (selectedId ? form.elements.name : fileInput).focus();
    }
  }

  trigger.addEventListener('click', () => toggle());
  panel.querySelector('[data-action="close"]').addEventListener('click', () => toggle(false));
  panel.querySelector('[data-action="back-to-list"]').addEventListener('click', () => {
    choose(null);
    objectSearch.focus();
  });
  panel.querySelector('[data-action="reset-graffiti"]').addEventListener('click', () => {
    const removed = api.clearGraffiti();
    updateGraffitiCount();
    api.notify(removed ? `Odstránené graffiti: ${removed}.` : 'Múr už je bez graffiti.');
  });

  terrainForm.addEventListener('input', event => {
    const field = event.target.name;
    if (!field || !(field in terrain)) return;
    terrain[field] = clamp(event.target.value, Number(event.target.min), Number(event.target.max)) / 100;
    terrainForm.querySelector(`[data-terrain-output="${field}"]`).textContent = `${Number(event.target.value)}%`;
    api.setTerrain(terrain);
    markDirty();
  });

  landingForm.addEventListener('input', event => {
    const field = event.target.name;
    if (!LANDING_FIELDS.some(([key]) => key === field)) return;
    landing[field] = event.target.value;
    api.setLanding(landing);
    markDirty();
  });

  landingStyleForm.addEventListener('input', event => {
    const field = event.target.name;
    if (!field) return;
    landing.styles ||= {};
    if (field === 'textElement') {
      landingElement = LANDING_ELEMENTS.some(([key])=>key === event.target.value) ? event.target.value : 'eyebrow';
      fillLandingStyleForm();
      return;
    } else if (field in LANDING_ELEMENT_RANGES) {
      const [min,max,unit] = LANDING_ELEMENT_RANGES[field];
      landing.styles.elements ||= {};
      landing.styles.elements[landingElement] ||= {};
      landing.styles.elements[landingElement][field] = clamp(event.target.value,min,max);
      landingStyleForm.querySelector(`[data-landing-element-output="${field}"]`).textContent = `${landing.styles.elements[landingElement][field]}${unit}`;
    } else if (field in LANDING_STYLE_RANGES) {
      const [min,max,unit] = LANDING_STYLE_RANGES[field];
      landing.styles[field] = clamp(event.target.value,min,max);
      landingStyleForm.querySelector(`[data-landing-style-output="${field}"]`).textContent = `${landing.styles[field]}${unit}`;
    } else if (event.target.type === 'color' || event.target.tagName === 'SELECT') landing.styles[field] = event.target.value;
    else return;
    api.setLanding(landing);
    markDirty();
  });

  backgroundFileInput.addEventListener('change', async () => {
    const file = backgroundFileInput.files?.[0];
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) return setStatus('Použi PNG, JPG alebo WebP.','error');
    if (file.size > 8 * 1024 * 1024) return setStatus('Obrázok môže mať najviac 8 MB.','error');
    setStatus('Nahrávam pozadie…','loading'); backgroundFileInput.disabled = true;
    try {
      const dataUrl = await fileAsDataUrl(file);
      const uploaded = await request('/__scene-editor/upload',{ name:`landing-${file.name.replace(/\.[^.]+$/,'')}`,dataUrl });
      landing.styles ||= {}; landing.styles.backgroundImage = uploaded.src;
      api.setLanding(landing); fillLandingStyleForm(); markDirty();
      api.notify('Pozadie landing page bolo pridané.');
    } catch (error) { setStatus(error.message,'error'); }
    finally { backgroundFileInput.disabled = false; backgroundFileInput.value = ''; }
  });

  panel.querySelector('[data-action="remove-landing-background"]').addEventListener('click',()=>{
    if (!landing.styles?.backgroundImage) return;
    landing.styles.backgroundImage = '';
    api.setLanding(landing); fillLandingStyleForm(); markDirty();
    api.notify('Pozadie landing page bolo odstránené.');
  });

  objectSearch.addEventListener('input', renderList);

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setStatus('Použi PNG, JPG alebo WebP.', 'error');
    if (file.size > 8 * 1024 * 1024) return setStatus('Obrázok môže mať najviac 8 MB.', 'error');
    setStatus('Nahrávam obrázok…', 'loading'); fileInput.disabled = true;
    try {
      const dataUrl = await fileAsDataUrl(file);
      const uploaded = await request('/__scene-editor/upload', { name: file.name.replace(/\.[^.]+$/, ''), dataUrl });
      const layer = 'front';
      const item = {
        id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Objekt', src: uploaded.src,
        layer, x: Number(api.getPlayerX().toFixed(2)), y: 1, widthM: 2, rotation: 0,
        animated: false, frames: 5, fps: 6, frameDirection: 'horizontal', phase: Math.random()
      };
      items.push(item); choose(item.id); markDirty();
      api.notify('Grafika pridaná. Klikni do sveta a umiestni ju.');
    } catch (error) { setStatus(error.message, 'error'); }
    finally { fileInput.disabled = false; fileInput.value = ''; }
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-id]');
    if (button) choose(button.dataset.id);
  });

  form.addEventListener('input', event => {
    const item = selected(), field = event.target.name;
    if (!item || !field) return;
    if (field === 'spacing') return;
    if (field === 'name' || field === 'layer' || field === 'frameDirection') item[field] = event.target.value;
    else if (field === 'animated') { item.animated = event.target.checked; animationSettings.hidden = !item.animated; }
    else if (field === 'x') item.x = clamp(event.target.value, 0, 700);
    else if (field === 'widthM') item.widthM = clamp(event.target.value, .2, 100);
    else if (field === 'y') item.y = clamp(event.target.value, -2.5, 5);
    else if (field === 'rotation') item.rotation = clamp(event.target.value, -180, 180);
    else if (field === 'frames') item.frames = Math.round(clamp(event.target.value, 2, 60));
    else if (field === 'fps') item.fps = clamp(event.target.value, .5, 30);
    if (['layer', 'widthM', 'y', 'rotation', 'animated', 'frames', 'fps', 'frameDirection'].includes(field)) syncGenerated(item, [field]);
    updateOutputs(item); markDirty();
    if (field === 'name' || field === 'layer' || field === 'x' || field === 'animated' || field === 'frames' || field === 'fps') renderList();
  });

  panel.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
    const item = selected(); if (!item) return;
    const copy = { ...item, generatedFrom: undefined, id: crypto.randomUUID(), name: `${item.name} kópia`.slice(0, 60), x: Math.min(700, item.x + 1), phase: Math.random() };
    items.push(copy); choose(copy.id); markDirty();
  });

  panel.querySelector('[data-action="generate-line"]').addEventListener('click', () => {
    const item = selected(); if (!item) return;
    const spacing = clamp(form.elements.spacing.value, 5, 350);
    items = items.filter(candidate => candidate.generatedFrom !== item.id);
    const positions = [];
    for (let x = item.x - spacing; x >= 0; x -= spacing) positions.push(x);
    for (let x = item.x + spacing; x <= 700; x += spacing) positions.push(x);
    positions.sort((a, b) => a - b).forEach((x, index) => items.push({
      ...item, id: crypto.randomUUID(), generatedFrom: item.id, name: `${item.name} ${index + 1}`.slice(0, 60),
      x: Number(x.toFixed(2)), phase: Math.random()
    }));
    fillForm(); markDirty();
    api.notify(`Rozmiestnené kópie: ${positions.length} · každých ${spacing} m.`);
  });

  panel.querySelector('[data-action="clear-generated"]').addEventListener('click', () => {
    const item = selected(); if (!item) return;
    const before = items.length;
    items = items.filter(candidate => candidate.generatedFrom !== item.id);
    const removed = before - items.length;
    fillForm(); markDirty();
    api.notify(removed ? `Odstránené kópie: ${removed}.` : 'Tento objekt nemá vygenerované kópie.');
  });

  panel.querySelector('[data-action="delete"]').addEventListener('click', () => {
    const index = items.findIndex(item => item.id === selectedId); if (index < 0) return;
    const removed = items[index], removedCopies = items.filter(item => item.generatedFrom === selectedId).length;
    items = items.filter(item => item.id !== selectedId && item.generatedFrom !== selectedId); selectedId = null;
    api.setSelected(null); renderList(); markDirty(); api.notify(`${removed.name} odstránený${removedCopies ? ` aj s ${removedCopies} kópiami` : ''}. Ulož scénu pre potvrdenie.`);
  });

  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true; setStatus('Zapisujem do projektu…', 'loading');
    try {
      const result = await request('/__scene-editor/save', { items, terrain, landing });
      dirty = false; setStatus(`Uložené · ${result.saved} objektov + texty`, 'success'); api.notify('Scéna, terén a texty sú uložené v projekte.');
    } catch (error) { saveButton.disabled = false; setStatus(error.message, 'error'); }
  });

  function place(event) {
    const item = selected(); if (!open || !item) return;
    const point = api.screenToScene(event.clientX, event.clientY);
    item.x = Number(point.x.toFixed(2)); item.y = Number(point.y.toFixed(3));
    syncGenerated(item, ['y']);
    fillForm(); renderList(); markDirty();
  }
  api.canvas.addEventListener('pointerdown', event => { if (!open || !selected()) return; dragging = true; api.canvas.setPointerCapture(event.pointerId); place(event); });
  api.canvas.addEventListener('pointermove', event => { if (dragging) place(event); });
  api.canvas.addEventListener('pointerup', () => { dragging = false; });
  api.canvas.addEventListener('pointercancel', () => { dragging = false; });

  addEventListener('keydown', event => {
    if (event.key === 'Escape' && open) selectedId ? choose(null) : toggle(false);
  });
  addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

  saveButton.disabled = true;
  fillTerrainForm();
  fillLandingForm();
  fillLandingStyleForm();
  updateGraffitiCount();
  renderList();
}
