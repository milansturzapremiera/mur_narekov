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
  let items = api.getItems(), lights = api.getLights(), events = api.getEvents(), terrain = api.getTerrain(), landing = api.getLanding(), environmentMode = api.getEnvironmentMode(), selectedId = null, selectedLightId = null, selectedEventId = null, followedEventId = api.getFollowedEventId(), editorLayer = 'assets', open = false, dirty = false, dragging = false, placingEvent = false, landingElement = 'eyebrow';

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
    <section class="dev-environment" aria-labelledby="devEnvironmentTitle">
      <div><strong id="devEnvironmentTitle">Svetlo scény</strong><small>Iba náhľad v DEV režime</small></div>
      <form class="dev-environment-form">
        <label><input type="radio" name="environmentMode" value="auto"><span>Automaticky</span></label>
        <label><input type="radio" name="environmentMode" value="day"><span>Deň</span></label>
        <label><input type="radio" name="environmentMode" value="night"><span>Noc</span></label>
      </form>
      <p>Ostrá verzia používa miestny čas návštevníka. Súmrak začína o 18:00, plná noc o 20:00.</p>
    </section>
    <nav class="dev-layer-tabs" aria-label="Vrstva editora">
      <button type="button" data-editor-layer="assets" aria-pressed="true"><span>Assety</span><small>Obrázky v scéne</small></button>
      <button type="button" data-editor-layer="lights" aria-pressed="false"><span>Svetlá</span><small>Zdroje a kužele</small></button>
      <button type="button" data-editor-layer="events" aria-pressed="false"><span>Events</span><small>Pohyb a text</small></button>
    </nav>
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
      <p class="dev-scene-help">Klikni priamo na ktorýkoľvek asset vo svete a potiahni ho. Vybrať a presúvať môžeš aj každú kópiu samostatne.</p>
      <label class="dev-object-search"><span>Hľadať objekt</span><output data-object-count></output><input type="search" placeholder="Strom, lampa, budova…"></label>
      <div class="dev-scene-list" aria-label="Objekty v scéne"></div>
    </section>
    <section class="dev-light-browser" hidden>
      <button type="button" class="dev-add-light" data-action="add-light"><b>＋ Pridať zdroj svetla</b><small>Voľný zdroj na aktuálnom metri</small></button>
      <p class="dev-scene-help">Vyber žltý bod priamo vo svete a potiahni ho. Zdroj môže byť voľný alebo naviazaný na konkrétnu lampu.</p>
      <label class="dev-light-search"><span>Hľadať svetlo</span><output data-light-count></output><input type="search" placeholder="Lampa, vstup, chodník…"></label>
      <div class="dev-light-list" aria-label="Zdroje svetla"></div>
    </section>
    <section class="dev-event-browser" hidden>
      <label class="dev-event-upload"><input type="file" accept="image/png,image/jpeg,image/webp"><span><b>＋ Pohybujúci sa asset</b><small>Prejde po chodníku cez celých 700 m</small></span></label>
      <button type="button" class="dev-add-text-event" data-action="add-text-event"><b>＋ Textová bublina</b><small>Časovaná sekvencia správ</small></button>
      <p class="dev-scene-help">Eventy sa riadia reálnym časom. Začiatok môže byť po otvorení hry alebo v konkrétny dátum a čas.</p>
      <label class="dev-event-search"><span>Hľadať event</span><output data-event-count></output><input type="search" placeholder="Medveď, oznam, bublina…"></label>
      <div class="dev-event-list" aria-label="Eventy"></div>
    </section>
    <form class="dev-scene-properties" hidden>
      <div class="dev-detail-head"><button type="button" data-action="back-to-list">← Späť na zoznam</button><strong data-detail-name></strong></div>
      <label>Názov<input name="name" maxlength="60"></label>
      <div class="dev-scene-pair">
        <label>Vrstva<select name="layer"><option value="behind">Za múrom</option><option value="front">Pred múrom</option></select></label>
        <label>Meter<input name="x" type="number" min="0" max="700" step="0.1"></label>
      </div>
      <label>Zobrazenie<select name="visibility"><option value="always">Deň aj noc</option><option value="day">Iba cez deň</option><option value="night">Iba v noci</option></select></label>
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
    <form class="dev-light-properties" hidden>
      <div class="dev-detail-head"><button type="button" data-action="back-to-lights">← Späť na svetlá</button><strong data-light-detail-name></strong></div>
      <label>Názov<input name="name" maxlength="60"></label>
      <label>Pripojená lampa<select name="lampId"><option value="">Voľný zdroj svetla</option></select></label>
      <fieldset class="dev-light-free-position"><legend>Voľná poloha</legend><div class="dev-scene-pair"><label>Meter X<input name="x" type="number" min="0" max="700" step="0.1"></label><label>Poloha Y<input name="y" type="number" min="-3" max="5" step="0.01"></label></div></fieldset>
      <fieldset class="dev-light-offset" hidden><legend>Posun od lampy</legend><div class="dev-scene-pair"><label>Vodorovne<input name="offsetX" type="number" min="-50" max="50" step="0.05"></label><label>Zvislo<input name="offsetY" type="number" min="-50" max="50" step="0.05"></label></div><small>Nula je priamo v žiarovke. Zdroj môžeš potiahnuť aj ručne.</small></fieldset>
      <label>Smer kužeľa <output data-light-output="angle"></output><input name="angle" type="range" min="-180" max="180" step="1"></label>
      <label>Dĺžka kužeľa <output data-light-output="lengthM"></output><input name="lengthM" type="range" min="1" max="30" step="0.2"></label>
      <label>Šírka kužeľa <output data-light-output="widthM"></output><input name="widthM" type="range" min="0.5" max="20" step="0.1"></label>
      <label>Mäkkosť okraja <output data-light-output="softness"></output><input name="softness" type="range" min="0" max="100" step="1"></label>
      <label>Žiara pri zdroji <output data-light-output="haloM"></output><input name="haloM" type="range" min="0.2" max="8" step="0.1"></label>
      <label>Intenzita <output data-light-output="intensity"></output><input name="intensity" type="range" min="5" max="200" step="1"></label>
      <label>Farba svetla<input name="color" type="color"></label>
      <label class="dev-animation-toggle"><input name="flicker" type="checkbox"><span>Pokazená lampa · náhodné blikanie</span></label>
      <div class="dev-light-actions"><button type="button" data-action="duplicate-light">Duplikovať svetlo</button><button type="button" data-action="delete-light">Odstrániť svetlo</button></div>
    </form>
    <form class="dev-event-properties" hidden>
      <div class="dev-detail-head"><button type="button" data-action="back-to-events">← Späť na events</button><strong data-event-detail-name></strong></div>
      <label>Názov<input name="name" maxlength="60"></label>
      <label>Zobrazenie<select name="visibility"><option value="always">Deň aj noc</option><option value="day">Iba cez deň</option><option value="night">Iba v noci</option></select></label>
      <fieldset class="dev-event-schedule"><legend>Začiatok eventu</legend><label>Konkrétny dátum a čas · voliteľné<input name="startAt" type="datetime-local"></label><label>Oneskorenie po otvorení hry<input name="startDelaySec" type="number" min="0" max="86400" step="1"><span>sekúnd</span></label><small>Ak nastavíš dátum, oneskorenie sa ignoruje.</small></fieldset>
      <fieldset class="dev-walker-settings" hidden><legend>Pohyb po chodníku</legend>
        <p class="dev-event-placement-help">Zdrojový obrázok smeruje doprava. Vľavo sa automaticky zrkadlí. Tlačidlom nižšie umiestniš začiatok trasy priamo v scéne.</p>
        <div class="dev-scene-pair"><label>Ľavý bod X<input name="startX" type="number" min="0" max="700" step="0.1"></label><label>Pravý bod X<input name="endX" type="number" min="0" max="700" step="0.1"></label></div>
        <label>Presná výška trasy Y<input name="pathY" type="number" min="-3" max="5" step="0.01"></label>
        <label>Veľkosť <output data-event-output="widthM"></output><input name="widthM" type="range" min="0.2" max="30" step="0.1"></label>
        <label>Rýchlosť <output data-event-output="speedMps"></output><input name="speedMps" type="range" min="0.2" max="30" step="0.1"></label>
        <label>Smer<select name="direction"><option value="right">Zľava doprava →</option><option value="left">Sprava doľava ←</option></select></label>
        <label>Prestávka medzi prejdeniami<input name="loopDelaySec" type="number" min="0" max="3600" step="1"><span>sekúnd</span></label>
        <label>Počet prejdení<input name="runCount" type="number" min="0" max="1000" step="1"><span>0 = stále</span></label>
        <label class="dev-animation-toggle"><input name="animated" type="checkbox"><span>Animovaný sprite sheet</span></label>
        <div class="dev-event-animation"><div class="dev-scene-pair"><label>Počet políčok<input name="frames" type="number" min="2" max="60"></label><label>Rýchlosť FPS<input name="fps" type="number" min="0.5" max="30" step="0.5"></label></div><label>Smer políčok<select name="frameDirection"><option value="horizontal">Vodorovne →</option><option value="vertical">Zvislo ↓</option></select></label></div>
        <label class="dev-animation-toggle"><input name="speechEnabled" type="checkbox"><span>Asset počas chôdze občas niečo povie</span></label>
        <fieldset class="dev-walker-speech-settings" hidden><legend>Hovoriace bubliny</legend>
          <label>Hlášky · každý riadok je ďalšia bublina<textarea name="speechMessages" rows="5" maxlength="3200"></textarea></label>
          <div class="dev-scene-pair"><label>Prvá hláška po<input name="speechDelaySec" type="number" min="0" max="3600" step="0.5"><span>sekúnd</span></label><label>Hláška každých<input name="speechEverySec" type="number" min="1" max="3600" step="0.5"><span>sekúnd</span></label></div>
          <label>Dĺžka zobrazenia<input name="speechDurationSec" type="number" min="0.5" max="30" step="0.1"><span>sekúnd</span></label>
          <label>Šírka bubliny <output data-event-output="speechWidth"></output><input name="speechWidthM" type="range" min="2" max="14" step="0.1"></label>
          <label>Veľkosť textu <output data-event-output="speechFontSize"></output><input name="speechFontSize" type="range" min="12" max="42" step="1"></label>
          <div class="dev-scene-pair"><label>Text<input name="speechTextColor" type="color"></label><label>Pozadie<input name="speechBackgroundColor" type="color"></label></div>
        </fieldset>
      </fieldset>
      <fieldset class="dev-text-event-settings" hidden><legend>Textové bubliny</legend>
        <p class="dev-event-placement-help">Klikni na miesto v scéne alebo potiahni žltý bod. Vybraná bublina zostane v DEV náhľade viditeľná aj mimo nastaveného času.</p>
        <div class="dev-scene-pair"><label>Meter X<input name="x" type="number" min="0" max="700" step="0.1"></label><label>Poloha Y<input name="y" type="number" min="-3" max="5" step="0.01"></label></div>
        <label>Počet bubliniek v sekvencii<input name="bubblesPerSequence" type="number" min="1" max="20"></label>
        <label>Počet rôznych sekvencií<input name="sequenceCount" type="number" min="1" max="50"></label>
        <label class="dev-animation-toggle"><input name="repeatEvent" type="checkbox"><span>Po poslednej sekvencii začať celý event znova</span></label>
        <div class="dev-sequence-text-editors"></div>
        <label>Rozostup bubliniek<input name="bubbleIntervalSec" type="number" min="0.2" max="3600" step="0.1"><span>sekúnd</span></label>
        <label>Dĺžka zobrazenia bubliny<input name="bubbleDurationSec" type="number" min="0.5" max="120" step="0.1"><span>sekúnd</span></label>
        <label>Opakovanie sekvencie<input name="repeatEverySec" type="number" min="0.5" max="86400" step="0.5"><span>sekúnd</span></label>
        <label>Šírka bubliny <output data-event-output="textWidth"></output><input name="textWidthM" type="range" min="2" max="14" step="0.1"></label>
        <label>Veľkosť textu <output data-event-output="fontSize"></output><input name="fontSize" type="range" min="12" max="42" step="1"></label>
        <div class="dev-scene-pair"><label>Text<input name="textColor" type="color"></label><label>Pozadie<input name="backgroundColor" type="color"></label></div>
      </fieldset>
      <div class="dev-event-preview-actions"><button type="button" data-action="preview-event">▶ Prehrať ukážku teraz</button><button type="button" data-action="place-event-freely">⌖ Umiestniť voľne v scéne</button><button type="button" data-action="follow-event">◉ Sledovať kamerou</button></div>
      <div class="dev-event-actions"><button type="button" data-action="duplicate-event">Duplikovať event</button><button type="button" data-action="delete-event">Odstrániť event</button></div>
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
  const lightList = panel.querySelector('.dev-light-list');
  const eventList = panel.querySelector('.dev-event-list');
  const panelBody = panel.querySelector('.dev-scene-body');
  const form = panel.querySelector('.dev-scene-properties');
  const lightForm = panel.querySelector('.dev-light-properties');
  const eventForm = panel.querySelector('.dev-event-properties');
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
  const lightSearch = panel.querySelector('.dev-light-search input');
  const eventSearch = panel.querySelector('.dev-event-search input');
  const objectCount = panel.querySelector('[data-object-count]');
  const lightCount = panel.querySelector('[data-light-count]');
  const eventCount = panel.querySelector('[data-event-count]');
  const detailName = panel.querySelector('[data-detail-name]');
  const lightDetailName = panel.querySelector('[data-light-detail-name]');
  const eventDetailName = panel.querySelector('[data-event-detail-name]');
  const eventFileInput = panel.querySelector('.dev-event-upload input');
  const generatedCount = panel.querySelector('[data-generated-count]');
  const environmentForm = panel.querySelector('.dev-environment-form');
  environmentForm.querySelectorAll('[name="environmentMode"]').forEach(input=>{input.checked=input.value===environmentMode;});

  environmentForm.addEventListener('change',event=>{
    if(event.target.name!=='environmentMode')return;
    environmentMode=event.target.value;
    api.setEnvironmentMode(environmentMode);
  });

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
  function selectedLight() { return lights.find(light => light.id === selectedLightId); }
  function selectedEvent() { return events.find(event => event.id === selectedEventId); }

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
    api.setLights(lights);
    api.setEvents(events);
  }

  function updateOutputs(item) {
    form.querySelector('[data-output="widthM"]').textContent = `${Number(item.widthM).toFixed(1)} m`;
    form.querySelector('[data-output="y"]').textContent = Number(item.y).toFixed(2);
    form.querySelector('[data-output="rotation"]').textContent = `${item.rotation > 0 ? '+' : ''}${item.rotation}°`;
  }

  function fillForm() {
    const item = selected();
    form.hidden = !item;
    if (!item) return;
    detailName.textContent = item.name;
    ['name', 'layer', 'x', 'widthM', 'y', 'rotation'].forEach(key => { form.elements[key].value = item[key]; });form.elements.visibility.value=item.visibility||'always';
    form.elements.animated.checked = item.animated === true;
    form.elements.frames.value = item.frames || 5;
    form.elements.fps.value = item.fps || 6;
    form.elements.frameDirection.value = item.frameDirection === 'vertical' ? 'vertical' : 'horizontal';
    animationSettings.hidden = !form.elements.animated.checked;
    const count = items.filter(candidate => candidate.generatedFrom === item.id).length;
    generatedCount.textContent = count ? `${count} kópií` : 'bez kópií';
    updateOutputs(item);
  }

  function updateLightOutputs(light) {
    lightForm.querySelector('[data-light-output="angle"]').textContent=`${Number(light.angle)>0?'+':''}${Number(light.angle)||0}°`;
    lightForm.querySelector('[data-light-output="lengthM"]').textContent=`${Number(light.lengthM).toFixed(1)} m`;
    lightForm.querySelector('[data-light-output="widthM"]').textContent=`${Number(light.widthM).toFixed(1)} m`;
    lightForm.querySelector('[data-light-output="softness"]').textContent=`${Math.round(Number(light.softness??.72)*100)} %`;
    lightForm.querySelector('[data-light-output="haloM"]').textContent=`${Number(light.haloM).toFixed(1)} m`;
    lightForm.querySelector('[data-light-output="intensity"]').textContent=`${Math.round(Number(light.intensity)*100)} %`;
  }

  function fillLightForm() {
    const light=selectedLight();lightForm.hidden=!light;if(!light)return;
    lightDetailName.textContent=light.name;
    const lampSelect=lightForm.elements.lampId,currentValue=light.lampId||'';lampSelect.replaceChildren(new Option('Voľný zdroj svetla',''));
    items.filter(item=>item.name.toLocaleLowerCase('sk').startsWith('lampa')||item.src.toLowerCase().includes('lampa')).forEach(item=>lampSelect.add(new Option(`${item.name} · ${Number(item.x).toFixed(1)} m`,item.id)));
    lampSelect.value=currentValue;
    ['name','x','y','offsetX','offsetY','angle','lengthM','widthM','haloM','color'].forEach(key=>{lightForm.elements[key].value=light[key]??0;});lightForm.elements.softness.value=Math.round(Number(light.softness??.72)*100);
    lightForm.elements.intensity.value=Math.round(Number(light.intensity)*100);
    lightForm.elements.flicker.checked=light.flicker===true;
    lightForm.querySelector('.dev-light-free-position').hidden=Boolean(light.lampId);
    lightForm.querySelector('.dev-light-offset').hidden=!light.lampId;
    updateLightOutputs(light);
  }

  function updateEventOutputs(event) {
    if(event.type==='walker'){eventForm.querySelector('[data-event-output="widthM"]').textContent=`${Number(event.widthM).toFixed(1)} m`;eventForm.querySelector('[data-event-output="speedMps"]').textContent=`${Number(event.speedMps).toFixed(1)} m/s`;eventForm.querySelector('[data-event-output="speechWidth"]').textContent=`${Number(event.speechWidthM||5).toFixed(1)} m`;eventForm.querySelector('[data-event-output="speechFontSize"]').textContent=`${Math.round(Number(event.speechFontSize)||20)} px`;}
    else{eventForm.querySelector('[data-event-output="textWidth"]').textContent=`${Number(event.widthM).toFixed(1)} m`;eventForm.querySelector('[data-event-output="fontSize"]').textContent=`${Math.round(Number(event.fontSize))} px`;}
  }

  function ensureEventSequences(event) {
    const bubbleCount=Math.max(1,Math.min(20,Math.round(Number(event.bubblesPerSequence)||1))),sequenceTotal=Math.max(1,Math.min(50,Math.round(Number(event.sequenceCount)||1)));
    const legacy=(Array.isArray(event.messages)?event.messages:[]).map(value=>String(value));
    const source=Array.isArray(event.sequences)?event.sequences:[];
    event.sequences=Array.from({length:sequenceTotal},(_,sequenceIndex)=>Array.from({length:bubbleCount},(_,bubbleIndex)=>{
      const existing=source[sequenceIndex]?.[bubbleIndex];if(existing!==undefined)return String(existing);
      return legacy.length?legacy[(sequenceIndex*bubbleCount+bubbleIndex)%legacy.length]:bubbleIndex?'':`Sekvencia ${sequenceIndex+1}`;
    }));
    event.messages=event.sequences.flat();
  }

  function renderSequenceEditors(event) {
    const container=eventForm.querySelector('.dev-sequence-text-editors');container.replaceChildren();if(event.type!=='text')return;ensureEventSequences(event);
    event.sequences.forEach((texts,sequenceIndex)=>{const group=document.createElement('fieldset');group.className='dev-sequence-text-group';const legend=document.createElement('legend');legend.textContent=`Sekvencia ${sequenceIndex+1}`;const hint=document.createElement('small');hint.textContent='Každý riadok je samostatná bublina v tejto sekvencii.';const textarea=document.createElement('textarea');textarea.name='sequenceTexts';textarea.dataset.sequenceIndex=String(sequenceIndex);textarea.rows=Math.max(2,Math.min(7,texts.length));textarea.maxLength=3200;textarea.value=texts.join('\n');group.append(legend,hint,textarea);container.append(group);});
  }

  function fillEventForm() {
    const event=selectedEvent();eventForm.hidden=!event;if(!event)return;eventDetailName.textContent=event.name;
    ['name','visibility','startAt','startDelaySec'].forEach(key=>{eventForm.elements[key].value=event[key]??'';});
    const walker=event.type==='walker',followButton=eventForm.querySelector('[data-action="follow-event"]');eventForm.querySelector('.dev-walker-settings').hidden=!walker;eventForm.querySelector('.dev-text-event-settings').hidden=walker;eventForm.querySelector('[data-action="place-event-freely"]').textContent=walker?'⌖ Umiestniť začiatok trasy v scéne':'⌖ Umiestniť voľne v scéne';followButton.hidden=!walker;followButton.setAttribute('aria-pressed',String(event.id===followedEventId));followButton.textContent=event.id===followedEventId?'■ Zastaviť sledovanie':'◉ Sledovať kamerou';
    if(walker){['widthM','startX','endX','pathY','speedMps','direction','loopDelaySec','runCount','frames','fps','frameDirection','speechDelaySec','speechEverySec','speechDurationSec','speechFontSize','speechTextColor','speechBackgroundColor'].forEach(key=>{eventForm.elements[key].value=event[key]??(key==='endX'?700:key==='pathY'?api.getDefaultEventY():key==='speechEverySec'?12:key==='speechDurationSec'?3:key==='speechFontSize'?20:key==='speechTextColor'?'#25211d':key==='speechBackgroundColor'?'#f2eadb':0);});eventForm.elements.speechMessages.value=(event.speechMessages||[]).join('\n');eventForm.elements.speechWidthM.value=event.speechWidthM||5;eventForm.elements.animated.checked=event.animated===true;eventForm.elements.speechEnabled.checked=event.speechEnabled===true;eventForm.querySelector('.dev-event-animation').hidden=!event.animated;eventForm.querySelector('.dev-walker-speech-settings').hidden=!event.speechEnabled;}
    else{['x','y','bubblesPerSequence','sequenceCount','bubbleIntervalSec','bubbleDurationSec','repeatEverySec','fontSize','textColor','backgroundColor'].forEach(key=>{eventForm.elements[key].value=event[key]??'';});eventForm.elements.repeatEvent.checked=event.repeatEvent!==false;eventForm.elements.textWidthM.value=event.widthM||5;renderSequenceEditors(event);}
    updateEventOutputs(event);
  }

  function syncDetailState() {
    const hasDetail=Boolean(selected()||selectedLight()||selectedEvent());panel.classList.toggle('show-detail',hasDetail);fillForm();fillLightForm();fillEventForm();
  }

  function renderList() {
    list.replaceChildren();
    const roots = items.filter(item => !item.generatedFrom);
    const ordered = roots.flatMap(root => [root, ...items.filter(item => item.generatedFrom === root.id)]);
    ordered.push(...items.filter(item => item.generatedFrom && !items.some(root => root.id === item.generatedFrom)));
    const query = objectSearch.value.trim().toLocaleLowerCase('sk');
    const visible = query ? ordered.filter(item => item.name.toLocaleLowerCase('sk').includes(query)) : ordered;
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
        button.classList.toggle('is-copy', Boolean(item.generatedFrom));
        button.dataset.id = item.id;
        button.setAttribute('aria-pressed', String(item.id === selectedId));
        const image = document.createElement('img'); image.src = item.src; image.alt = '';
        const copy = document.createElement('span');
        const name = document.createElement('b'); name.textContent = item.name;
        const meta = document.createElement('small');
        const generated = items.filter(candidate => candidate.generatedFrom === item.id).length;
        const visibilityLabel=item.visibility==='day'?'DEŇ':item.visibility==='night'?'NOC':'VŽDY';meta.textContent = `${item.generatedFrom ? 'KÓPIA · ' : ''}${item.layer === 'behind' ? 'ZA' : 'PRED'} · ${visibilityLabel} · ${Number(item.x).toFixed(1)} m${generated ? ` · +${generated} KÓPIÍ` : ''}${item.animated ? ` · ${item.frames || 5}F/${item.fps || 6}FPS` : ''}`;
        copy.append(name, meta); button.append(image, copy); list.append(button);
      });
    }
    syncDetailState();
  }

  function renderLightList() {
    lightList.replaceChildren();
    const query=lightSearch.value.trim().toLocaleLowerCase('sk'),visible=query?lights.filter(light=>light.name.toLocaleLowerCase('sk').includes(query)):lights;
    lightCount.textContent=`${lights.length} svetiel`;
    if(!visible.length){const empty=document.createElement('p');empty.className='dev-scene-empty';empty.textContent=lights.length?'Žiadne svetlo nezodpovedá hľadaniu.':'Pridaj prvý zdroj svetla.';lightList.append(empty);}
    else visible.forEach(light=>{const button=document.createElement('button');button.type='button';button.className='dev-light-item';button.dataset.lightId=light.id;button.setAttribute('aria-pressed',String(light.id===selectedLightId));const icon=document.createElement('span');icon.className='dev-light-icon';icon.style.setProperty('--light-color',light.color||'#ffd080');const copy=document.createElement('span'),name=document.createElement('b'),meta=document.createElement('small');name.textContent=light.name;meta.textContent=`${light.lampId?'LAMPA':'VOĽNÉ'} · ${Math.round(Number(light.intensity)*100)} %${light.flicker?' · BLIKÁ':''}`;copy.append(name,meta);button.append(icon,copy);lightList.append(button);});
    syncDetailState();
  }
  function renderEventList() {
    eventList.replaceChildren();const query=eventSearch.value.trim().toLocaleLowerCase('sk'),visible=query?events.filter(event=>event.name.toLocaleLowerCase('sk').includes(query)):events;eventCount.textContent=`${events.length} eventov`;
    if(!visible.length){const empty=document.createElement('p');empty.className='dev-scene-empty';empty.textContent=events.length?'Žiadny event nezodpovedá hľadaniu.':'Pridaj pohybujúci sa asset alebo textovú sekvenciu.';eventList.append(empty);}
    else visible.forEach(event=>{const button=document.createElement('button');button.type='button';button.className='dev-event-item';button.dataset.eventId=event.id;button.setAttribute('aria-pressed',String(event.id===selectedEventId));const icon=document.createElement('span');icon.className=`dev-event-icon is-${event.type}`;icon.textContent=event.type==='text'?'Aa':'→';const copy=document.createElement('span'),name=document.createElement('b'),meta=document.createElement('small');name.textContent=event.name;const visibility=event.visibility==='day'?'DEŇ':event.visibility==='night'?'NOC':'VŽDY';meta.textContent=`${event.type==='text'?'TEXT':'POHYB'} · ${visibility}`;copy.append(name,meta);button.append(icon,copy);eventList.append(button);});syncDetailState();
  }

  function choose(id) {
    selectedId = id;selectedLightId=null;selectedEventId=null;
    api.setSelected(id);
    api.setSelectedLight(null);
    api.setSelectedEvent(null);
    renderList();
    panelBody.scrollTop = 0;
  }

  function chooseLight(id) {
    selectedLightId=id;selectedId=null;selectedEventId=null;api.setSelected(null);api.setSelectedLight(id);api.setSelectedEvent(null);renderLightList();panelBody.scrollTop=0;
  }
  function chooseEvent(id){selectedEventId=id;selectedId=null;selectedLightId=null;api.setSelected(null);api.setSelectedLight(null);api.setSelectedEvent(id);renderEventList();panelBody.scrollTop=0;}

  function setEditorLayer(layer) {
    setCameraFollowMode(false);
    editorLayer=['lights','events'].includes(layer)?layer:'assets';selectedId=null;selectedLightId=null;selectedEventId=null;api.setSelected(null);api.setSelectedLight(null);api.setSelectedEvent(null);api.setEditorLayer(editorLayer);
    panel.querySelector('.dev-object-browser').hidden=editorLayer!=='assets';panel.querySelector('.dev-light-browser').hidden=editorLayer!=='lights';panel.querySelector('.dev-event-browser').hidden=editorLayer!=='events';
    panel.querySelectorAll('[data-editor-layer]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.editorLayer===editorLayer)));
    renderList();renderLightList();renderEventList();
  }

  function toggle(force) {
    open = typeof force === 'boolean' ? force : !open;
    if(!open){setEventPlacementMode(false);setCameraFollowMode(false);}
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    trigger.setAttribute('aria-expanded', String(open));
    trigger.innerHTML = open ? '<span>DEV</span> Zavrieť' : '<span>DEV</span> Editor';
    trigger.setAttribute('aria-label',open ? 'Zavrieť DEV editor' : 'Otvoriť DEV editor');
    document.documentElement.classList.toggle('dev-scene-editing', open);
    api.setEditing(open);
    if (open) {
      updateGraffitiCount();
      (selectedId?form.elements.name:selectedLightId?lightForm.elements.name:selectedEventId?eventForm.elements.name:editorLayer==='lights'?panel.querySelector('[data-action="add-light"]'):editorLayer==='events'?panel.querySelector('[data-action="add-text-event"]'):fileInput).focus();
    }
  }

  function setEventPlacementMode(value){
    placingEvent=Boolean(value&&open&&selectedEvent());
    panel.classList.toggle('placing-event',placingEvent);
    document.documentElement.classList.toggle('dev-event-placing',placingEvent);
    trigger.innerHTML=placingEvent?'<span>EVENT</span> Zrušiť umiestnenie':open?'<span>DEV</span> Zavrieť':'<span>DEV</span> Editor';
    trigger.setAttribute('aria-label',placingEvent?'Zrušiť umiestnenie textového eventu':open?'Zavrieť DEV editor':'Otvoriť DEV editor');
  }

  function setCameraFollowMode(value){
    const event=selectedEvent(),next=Boolean(value&&open&&event?.type==='walker');followedEventId=next?event.id:null;api.setFollowedEvent(followedEventId);panel.classList.toggle('camera-following',next);document.documentElement.classList.toggle('dev-camera-following',next);
    if(next){api.previewEvent(event.id);trigger.innerHTML='<span>REC</span> ■ Stop kamera';trigger.setAttribute('aria-label','Zastaviť sledovanie eventu kamerou');}
    else if(!placingEvent){trigger.innerHTML=open?'<span>DEV</span> Zavrieť':'<span>DEV</span> Editor';trigger.setAttribute('aria-label',open?'Zavrieť DEV editor':'Otvoriť DEV editor');}
    if(event&&!eventForm.hidden)fillEventForm();
  }

  trigger.addEventListener('click', () => followedEventId?setCameraFollowMode(false):placingEvent?setEventPlacementMode(false):toggle());
  panel.querySelector('[data-action="close"]').addEventListener('click', () => toggle(false));
  panel.querySelectorAll('[data-editor-layer]').forEach(button=>button.addEventListener('click',()=>setEditorLayer(button.dataset.editorLayer)));
  panel.querySelector('[data-action="back-to-list"]').addEventListener('click', () => {
    choose(null);
    objectSearch.focus();
  });
  panel.querySelector('[data-action="back-to-lights"]').addEventListener('click',()=>{chooseLight(null);lightSearch.focus();});
  panel.querySelector('[data-action="back-to-events"]').addEventListener('click',()=>{chooseEvent(null);eventSearch.focus();});
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
  lightSearch.addEventListener('input',renderLightList);
  eventSearch.addEventListener('input',renderEventList);

  panel.querySelector('[data-action="add-light"]').addEventListener('click',()=>{
    const light={id:crypto.randomUUID(),name:'Nové svetlo',x:Number(api.getPlayerX().toFixed(2)),y:-.35,offsetX:0,offsetY:0,angle:0,lengthM:8,widthM:6,softness:.72,haloM:2.2,intensity:1,color:'#ffd080',flicker:false};
    lights.push(light);markDirty();chooseLight(light.id);api.notify('Zdroj svetla pridaný. Potiahni žltý bod na miesto.');
  });
  panel.querySelector('[data-action="add-text-event"]').addEventListener('click',()=>{const event={id:crypto.randomUUID(),name:'Textová bublina',type:'text',visibility:'always',startAt:'',startDelaySec:0,x:Number(api.getViewCenterX().toFixed(2)),y:.5,messages:['Napíš sem prvú správu.'],sequences:[['Napíš sem prvú správu.']],bubblesPerSequence:1,sequenceCount:1,repeatEvent:true,bubbleIntervalSec:3,bubbleDurationSec:2.5,repeatEverySec:15,widthM:5,fontSize:20,textColor:'#25211d',backgroundColor:'#f2eadb'};events.push(event);markDirty();chooseEvent(event.id);api.previewEvent(event.id);api.notify('Textový event pridaný. Umiestni ho voľne kdekoľvek v scéne.');});

  eventFileInput.addEventListener('change',async()=>{const file=eventFileInput.files?.[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type))return setStatus('Použi PNG, JPG alebo WebP.','error');if(file.size>8*1024*1024)return setStatus('Obrázok môže mať najviac 8 MB.','error');setStatus('Nahrávam event asset…','loading');eventFileInput.disabled=true;try{const dataUrl=await fileAsDataUrl(file),uploaded=await request('/__scene-editor/upload',{name:`event-${file.name.replace(/\.[^.]+$/,'')}`,dataUrl}),startX=api.getViewCenterX();const event={id:crypto.randomUUID(),name:file.name.replace(/\.[^.]+$/,'').slice(0,60)||'Pohybujúci sa asset',type:'walker',src:uploaded.src,visibility:'always',startAt:'',startDelaySec:0,widthM:3,startX:Number(startX.toFixed(2)),endX:Number(Math.min(700,startX+80).toFixed(2)),pathY:api.getDefaultEventY(),speedMps:4,direction:'right',loopDelaySec:10,runCount:0,animated:false,frames:5,fps:6,frameDirection:'horizontal',speechEnabled:false,speechMessages:['Ahoj!'],speechDelaySec:2,speechEverySec:12,speechDurationSec:3,speechWidthM:5,speechFontSize:20,speechTextColor:'#25211d',speechBackgroundColor:'#f2eadb'};events.push(event);markDirty();chooseEvent(event.id);api.previewEvent(event.id);api.notify('Pohybujúci sa event pridaný. Umiestni začiatok jeho trasy v scéne.');}catch(error){setStatus(error.message,'error');}finally{eventFileInput.disabled=false;eventFileInput.value='';}});

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
        layer, visibility:'always', x: Number(api.getPlayerX().toFixed(2)), y: 1, widthM: 2, rotation: 0,
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
  lightList.addEventListener('click',event=>{const button=event.target.closest('[data-light-id]');if(button)chooseLight(button.dataset.lightId);});
  eventList.addEventListener('click',event=>{const button=event.target.closest('[data-event-id]');if(button)chooseEvent(button.dataset.eventId);});

  form.addEventListener('input', event => {
    const item = selected(), field = event.target.name;
    if (!item || !field) return;
    if (field === 'spacing') return;
    if (field === 'name' || field === 'layer' || field === 'frameDirection' || field === 'visibility') item[field] = event.target.value;
    else if (field === 'animated') { item.animated = event.target.checked; animationSettings.hidden = !item.animated; }
    else if (field === 'x') item.x = clamp(event.target.value, 0, 700);
    else if (field === 'widthM') item.widthM = clamp(event.target.value, .2, 100);
    else if (field === 'y') item.y = clamp(event.target.value, -2.5, 5);
    else if (field === 'rotation') item.rotation = clamp(event.target.value, -180, 180);
    else if (field === 'frames') item.frames = Math.round(clamp(event.target.value, 2, 60));
    else if (field === 'fps') item.fps = clamp(event.target.value, .5, 30);
    if (['layer', 'visibility', 'widthM', 'y', 'rotation', 'animated', 'frames', 'fps', 'frameDirection'].includes(field)) syncGenerated(item, [field]);
    updateOutputs(item); markDirty();
    if (field === 'name' || field === 'layer' || field === 'visibility' || field === 'x' || field === 'animated' || field === 'frames' || field === 'fps') renderList();
  });

  lightForm.addEventListener('input',event=>{
    const light=selectedLight(),field=event.target.name;if(!light||!field)return;
    if(field==='name')light.name=event.target.value.slice(0,60);
    else if(field==='lampId'){
      if(!event.target.value){const position=api.getResolvedLightPosition(light);delete light.lampId;light.x=clamp(position.x,0,700);light.y=clamp(position.y,-3,5);light.offsetX=0;light.offsetY=0;}
      else{light.lampId=event.target.value;light.offsetX=0;light.offsetY=0;}
    }else if(field==='x')light.x=clamp(event.target.value,0,700);
    else if(field==='y')light.y=clamp(event.target.value,-3,5);
    else if(field==='offsetX'||field==='offsetY')light[field]=clamp(event.target.value,-50,50);
    else if(field==='angle')light.angle=clamp(event.target.value,-180,180);
    else if(field==='lengthM')light.lengthM=clamp(event.target.value,1,30);
    else if(field==='widthM')light.widthM=clamp(event.target.value,.5,20);
    else if(field==='haloM')light.haloM=clamp(event.target.value,.2,8);
    else if(field==='intensity')light.intensity=clamp(event.target.value,5,200)/100;
    else if(field==='softness')light.softness=clamp(event.target.value,0,100)/100;
    else if(field==='color')light.color=event.target.value;
    else if(field==='flicker')light.flicker=event.target.checked;
    updateLightOutputs(light);markDirty();
    if(['name','lampId','flicker'].includes(field))renderLightList();
  });

  eventForm.addEventListener('input',inputEvent=>{
    const event=selectedEvent(),field=inputEvent.target.name;if(!event||!field)return;
    if(['name','visibility','startAt','direction','frameDirection','textColor','backgroundColor'].includes(field))event[field]=inputEvent.target.value;
    else if(field==='sequenceTexts'){ensureEventSequences(event);const index=Number(inputEvent.target.dataset.sequenceIndex);event.sequences[index]=inputEvent.target.value.split(/\r?\n/).slice(0,Math.max(1,Number(event.bubblesPerSequence)||1)).map(value=>value.trim().slice(0,160));while(event.sequences[index].length<event.bubblesPerSequence)event.sequences[index].push('');event.messages=event.sequences.flat();}
    else if(field==='speechMessages')event.speechMessages=inputEvent.target.value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean).slice(0,20);
    else if(['speechTextColor','speechBackgroundColor'].includes(field))event[field]=inputEvent.target.value;
    else if(field==='animated'){event.animated=inputEvent.target.checked;eventForm.querySelector('.dev-event-animation').hidden=!event.animated;}
    else if(field==='speechEnabled'){event.speechEnabled=inputEvent.target.checked;eventForm.querySelector('.dev-walker-speech-settings').hidden=!event.speechEnabled;}
    else if(field==='repeatEvent')event.repeatEvent=inputEvent.target.checked;
    else if(field==='textWidthM')event.widthM=clamp(inputEvent.target.value,2,14);
    else if(field==='speechWidthM')event.speechWidthM=clamp(inputEvent.target.value,2,14);
    else{const ranges={startDelaySec:[0,86400],widthM:[.2,30],startX:[0,700],endX:[0,700],pathY:[-3,5],speedMps:[.2,30],loopDelaySec:[0,3600],runCount:[0,1000],frames:[2,60],fps:[.5,30],speechDelaySec:[0,3600],speechEverySec:[1,3600],speechDurationSec:[.5,30],speechFontSize:[12,42],x:[0,700],y:[-3,5],bubblesPerSequence:[1,20],sequenceCount:[1,50],bubbleIntervalSec:[.2,3600],bubbleDurationSec:[.5,120],repeatEverySec:[.5,86400],fontSize:[12,42]};if(!ranges[field])return;event[field]=clamp(inputEvent.target.value,...ranges[field]);if(['runCount','frames','speechFontSize','bubblesPerSequence','sequenceCount','fontSize'].includes(field))event[field]=Math.round(event[field]);}
    if(['bubblesPerSequence','sequenceCount'].includes(field))renderSequenceEditors(event);updateEventOutputs(event);markDirty();if(['name','visibility','animated'].includes(field))renderEventList();
  });

  panel.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
    const item = selected(); if (!item) return;
    const copy = { ...item, generatedFrom: undefined, id: crypto.randomUUID(), name: `${item.name} kópia`.slice(0, 60), x: Math.min(700, item.x + 1), phase: Math.random() };
    items.push(copy); choose(copy.id); markDirty();
  });

  panel.querySelector('[data-action="duplicate-light"]').addEventListener('click',()=>{
    const light=selectedLight();if(!light)return;const copy={...light,id:crypto.randomUUID(),name:`${light.name} kópia`.slice(0,60)};
    if(copy.lampId){copy.offsetX=Number(copy.offsetX||0)+.5;copy.offsetY=Number(copy.offsetY||0)+.5;}else copy.x=Math.min(700,Number(copy.x||0)+1);
    lights.push(copy);markDirty();chooseLight(copy.id);
  });
  panel.querySelector('[data-action="preview-event"]').addEventListener('click',()=>{
    const event=selectedEvent();if(!event)return;api.previewEvent(event.id);api.notify('Ukážka eventu bola spustená od začiatku.');
  });
  panel.querySelector('[data-action="follow-event"]').addEventListener('click',()=>{
    const event=selectedEvent();if(!event||event.type!=='walker')return;const start=followedEventId!==event.id;setCameraFollowMode(start);api.notify(start?'Kamera sleduje event. Esc alebo STOP sledovanie ukončí.':'Sledovanie kamerou zastavené.');
  });
  panel.querySelector('[data-action="place-event-freely"]').addEventListener('click',()=>{
    const event=selectedEvent();if(!event)return;setEventPlacementMode(true);api.notify(event.type==='text'?'Klikni kamkoľvek v scéne. Textový event sa umiestni presne na toto miesto.':'Klikni kamkoľvek v scéne. Sem sa umiestni začiatok trasy assetu.');
  });
  panel.querySelector('[data-action="duplicate-event"]').addEventListener('click',()=>{const event=selectedEvent();if(!event)return;const copy={...event,id:crypto.randomUUID(),name:`${event.name} kópia`.slice(0,60),messages:event.messages?[...event.messages]:undefined,sequences:event.sequences?event.sequences.map(sequence=>[...sequence]):undefined,speechMessages:event.speechMessages?[...event.speechMessages]:undefined};if(copy.type==='text')copy.x=Math.min(700,Number(copy.x||0)+1);else copy.startDelaySec=Number(copy.startDelaySec||0)+2;events.push(copy);markDirty();chooseEvent(copy.id);api.previewEvent(copy.id);});

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

  panel.querySelector('[data-action="delete-light"]').addEventListener('click',()=>{
    const light=selectedLight();if(!light)return;lights=lights.filter(candidate=>candidate.id!==light.id);selectedLightId=null;api.setSelectedLight(null);markDirty();renderLightList();api.notify(`${light.name} odstránené. Ulož projekt pre potvrdenie.`);
  });
  panel.querySelector('[data-action="delete-event"]').addEventListener('click',()=>{const event=selectedEvent();if(!event)return;if(event.id===followedEventId)setCameraFollowMode(false);events=events.filter(candidate=>candidate.id!==event.id);selectedEventId=null;api.setSelectedEvent(null);markDirty();renderEventList();api.notify(`${event.name} odstránený. Ulož projekt pre potvrdenie.`);});

  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true; setStatus('Zapisujem do projektu…', 'loading');
    try {
      const result = await request('/__scene-editor/save', { items, lights, events, terrain, landing });
      dirty = false; setStatus(`Uložené · ${result.saved} objektov · ${result.lights} svetiel · ${result.events} eventov`, 'success'); api.notify('Scéna, svetlá, eventy, terén a texty sú uložené v projekte.');
    } catch (error) { saveButton.disabled = false; setStatus(error.message, 'error'); }
  });

  let dragOffset = { x: 0, y: 0 };
  function place(event) {
    if(!open)return;
    if(editorLayer==='lights'){
      const light=selectedLight();if(!light)return;const position=api.moveLightFromScreen(light,event.clientX,event.clientY);
      if(light.lampId){light.offsetX=Number(clamp(position.offsetX,-50,50).toFixed(3));light.offsetY=Number(clamp(position.offsetY,-50,50).toFixed(3));}
      else{light.x=Number(clamp(position.x,0,700).toFixed(2));light.y=Number(clamp(position.y,-3,5).toFixed(3));}
      fillLightForm();markDirty();return;
    }
    if(editorLayer==='events'){
      const selectedSceneEvent=selectedEvent();if(!selectedSceneEvent)return;const position=api.moveEventFromScreen(event.clientX,event.clientY);
      if(selectedSceneEvent.type==='text'){selectedSceneEvent.x=Number(clamp(position.x+dragOffset.x,0,700).toFixed(2));selectedSceneEvent.y=Number(clamp(position.y+dragOffset.y,-3,5).toFixed(3));}
      else{const oldStart=Number.isFinite(Number(selectedSceneEvent.startX))?Number(selectedSceneEvent.startX):0,oldEnd=Number.isFinite(Number(selectedSceneEvent.endX))?Number(selectedSceneEvent.endX):700,span=Math.abs(oldEnd-oldStart),right=selectedSceneEvent.direction!=='left',start=clamp(position.x+dragOffset.x,0,700);if(right){selectedSceneEvent.startX=Number(start.toFixed(2));selectedSceneEvent.endX=Number(Math.min(700,start+span).toFixed(2));}else{selectedSceneEvent.endX=Number(start.toFixed(2));selectedSceneEvent.startX=Number(Math.max(0,start-span).toFixed(2));}selectedSceneEvent.pathY=Number(clamp(position.y+dragOffset.y,-3,5).toFixed(3));}
      fillEventForm();markDirty();return;
    }
    const item = selected(); if (!item) return;
    const point = api.screenToScene(event.clientX, event.clientY);
    item.x = Number(clamp(point.x + dragOffset.x, 0, 700).toFixed(2));
    item.y = Number(clamp(point.y + dragOffset.y, -2.5, 5).toFixed(3));
    fillForm(); markDirty();
  }
  api.canvas.addEventListener('pointerdown', event => {
    if (!open) return;
    if(editorLayer==='lights'){
      const hitId=api.pickLightAt(event.clientX,event.clientY);if(hitId)chooseLight(hitId);if(!selectedLight())return;dragging=true;document.documentElement.classList.add('dev-scene-dragging');api.canvas.setPointerCapture(event.pointerId);if(!hitId)place(event);return;
    }
    if(editorLayer==='events'){
      const hitId=api.pickEventAt(event.clientX,event.clientY);if(hitId)chooseEvent(hitId);const selected=selectedEvent();if(!selected)return;const point=api.moveEventFromScreen(event.clientX,event.clientY),anchorX=selected.type==='text'?Number(selected.x||0):selected.direction==='left'?Number(selected.endX??700):Number(selected.startX??0),anchorY=selected.type==='text'?Number(selected.y||0):Number(selected.pathY??api.getDefaultEventY());dragOffset=hitId?{x:anchorX-point.x,y:anchorY-point.y}:{x:0,y:0};dragging=true;document.documentElement.classList.add('dev-scene-dragging');api.canvas.setPointerCapture(event.pointerId);if(!hitId)place(event);return;
    }
    const hitId = api.pickItemAt(event.clientX, event.clientY);
    if (hitId) choose(hitId);
    const item = selected(); if (!item) return;
    const point = api.screenToScene(event.clientX, event.clientY);
    dragOffset = hitId ? { x: item.x - point.x, y: item.y - point.y } : { x: 0, y: 0 };
    dragging = true;
    document.documentElement.classList.add('dev-scene-dragging');
    api.canvas.setPointerCapture(event.pointerId);
    if (!hitId) place(event);
  });
  api.canvas.addEventListener('pointermove', event => { if (dragging) place(event); });
  api.canvas.addEventListener('pointerup', () => { if (dragging)(editorLayer==='lights'?renderLightList():editorLayer==='events'?renderEventList():renderList()); dragging = false; document.documentElement.classList.remove('dev-scene-dragging');if(placingEvent)setEventPlacementMode(false); });
  api.canvas.addEventListener('pointercancel', () => { if (dragging)(editorLayer==='lights'?renderLightList():editorLayer==='events'?renderEventList():renderList()); dragging = false; document.documentElement.classList.remove('dev-scene-dragging');if(placingEvent)setEventPlacementMode(false); });

  addEventListener('keydown', event => {
    if (event.key === 'Escape' && followedEventId)return setCameraFollowMode(false);
    if (event.key === 'Escape' && placingEvent)return setEventPlacementMode(false);
    if (event.key === 'Escape' && open) selectedId?choose(null):selectedLightId?chooseLight(null):selectedEventId?chooseEvent(null):toggle(false);
  });
  addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

  saveButton.disabled = true;
  fillTerrainForm();
  fillLandingForm();
  fillLandingStyleForm();
  updateGraffitiCount();
  setEditorLayer('assets');
}
