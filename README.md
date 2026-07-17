# Múr nárekov

Funkčný prototyp 700-metrovej spoločnej digitálnej steny. Návštevník si zvolí postavu, prechádza sa doľava/doprava a na aktuálnom metri zanechá nápis s maximálne 20 znakmi.

## Lokálne spustenie

```bash
npm install
npm run dev
```

Bez databázy aplikácia automaticky použije `localStorage`. Nápisy prežijú obnovenie stránky v rovnakom prehliadači a medzi otvorenými kartami sa synchronizujú cez `BroadcastChannel`.

## Vercel a spoločná stena

1. Importujte tento priečinok ako nový Vercel projekt.
2. Vytvorte Upstash Redis databázu (priamo cez Vercel Marketplace alebo Upstash).
3. V nastaveniach projektu pridajte `UPSTASH_REDIS_REST_URL` a `UPSTASH_REDIS_REST_TOKEN` podľa `.env.example`.
4. Spustite nový deployment.

Serverless endpointy v `api/` potom automaticky zapnú spoločné nápisy a približnú prítomnosť ďalších návštevníkov. Bez premenných aplikácia ostane plne použiteľná v lokálnom režime.

## Ovládanie

- `A`/`D` alebo šípky doľava/doprava: pohyb pozdĺž chodníka
- mobil: podržanie ľavej/pravej strany obrazovky ovláda smer, spodné tlačidlo zapína beh a `−`/`+` približuje múr
- hudba: tlačidlo s notou ju zapne alebo pozastaví, posuvník upraví hlasitosť
- „Zanechať odkaz“: otvorí editor v aktuálnej sekcii
- odkaz možno umiestniť voľne kdekoľvek v sekcii medzi piliermi, v náhľade alebo kliknutím priamo na múr
- posuvník upravuje uhol nápisu od −12° do +12°

Pri vstupe možno zadať voliteľné meno do 16 znakov a ľubovoľnú farbu menovky. Hráč sa pohybuje vodorovne pozdĺž chodníka. Editor odkazov používa natívny RGB výber farby a obsahuje aj graffiti písma `Permanent Marker`, `Rock Salt` a `Rubik Wet Paint`.

Hudba na pozadí — `Ukáž mi čurilu` od `zltunke_` — sa prvýkrát spustí až po stlačení tlačidla `Vstúpiť na chodník`, preto funguje aj v mobilných prehliadačoch, ktoré blokujú automatické prehrávanie bez interakcie. Skladba sa opakuje, načítava sa úsporne cez `preload="metadata"` a zvolená hlasitosť aj stav zapnutia sa uchovajú iba v `localStorage` daného prehliadača.

Každý anonymný prehliadač môže zanechať iba jeden odkaz. Lokálne sa uchová náhodné UUID; aplikácia na serveri uloží iba jeho SHA-256 hash oddelene od samotného odkazu. Aplikácia neukladá IP adresu ani nepripája identifikátor k textu odkazu. Bez používateľského účtu alebo fingerprintingu sa toto obmedzenie vzťahuje na konkrétny prehliadač — vymazanie dát stránky alebo iné zariadenie vytvorí novú anonymnú identitu.

Referenčné fotografie sú uložené v `public/references/`. Múr sa skladá z PNG assetov v `public/assets/wall/`; Canvas ich opakuje po celej dĺžke bez procedurálne generovaných tehál.

## Lokálny editor scény

Editor grafiky je dostupný iba cez vývojový server:

```bash
npm run dev
```

Po vstupe do hry sa zobrazí tlačidlo `DEV Scéna`. V editore:

1. Nahraj PNG, JPG alebo WebP do 8 MB.
2. Vyber vrstvu `Za múrom` alebo `Pred múrom`.
3. Klikni kamkoľvek do sveta alebo objekt ťahaj myšou; jeho spodok sa ukotví presne na zvolené miesto.
4. Nastav meter, veľkosť, voľnú polohu Y a uhol. Vrstva `Pred múrom` sa kreslí pred hráčom, takže hráč prechádza poza strom či inú prekážku.
5. Stlač `Uložiť scénu`.

Animovaný asset môže byť jeden sprite-sheet obrázok s rovnako veľkými políčkami zoradenými vodorovne alebo zvislo. Zapni `Animovaný asset`, nastav počet políčok a FPS. Napríklad mačka s piatimi fázami olizovania má 5 políčok; pomaly sa hýbajúci strom môže používať 3–5 políčok a nízke FPS. Pri systémovom nastavení obmedzeného pohybu zostane zobrazené prvé políčko.

Obrázky sa zapíšu do `public/assets/scene/`, rozloženie do `src/data/scene.json`, terén do `src/data/terrain.json` a texty landing page do `src/data/landing.json`. Tieto výsledné dáta produkčný build vykreslí, ale editor ani jeho zapisovací endpoint sa do produkcie nepridávajú. Po `npm run build` nie je editor v `dist` dostupný.
