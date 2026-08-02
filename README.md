# THW ToGo

Offline-fähige Progressive Web App zum Lernen von THW-Theoriefragen nach dem Spaced-Repetition-Prinzip (angelehnt an den SM-2-Algorithmus, wie z. B. bei Anki).

## Tech-Stack

- Vue 3 (Composition API) + Vite
- TypeScript
- Vue Router, Pinia
- Bootstrap 5 (als Sass-Build, siehe unten)
- Dexie.js (IndexedDB-Wrapper) für den Lernfortschritt
- vite-plugin-pwa (Workbox) für Offline-Precaching, Manifest und Service Worker

## Theming

Bootstrap wird nicht als fertiges CSS eingebunden, sondern über `src/assets/styles.scss` aus dem Sass-Quellcode gebaut. Dort ist `$primary` auf das offizielle THW-Blau `#003399` gesetzt (aus `src/assets/logo/thw-emblem.webp` abgetastet), bevor `bootstrap/scss/bootstrap` importiert wird – dadurch leiten sich Buttons, Badges, Progress-Bars, Links usw. konsistent aus einer einzigen Variable ab, statt einzelne CSS-Variablen der fertigen Bootstrap-CSS zu überschreiben. Für eine andere Akzentfarbe reicht es, `$primary` in dieser Datei anzupassen.

## Architekturprinzip

- **Fragenbank** (`src/data/topics.json`): statischer Inhalt, wird mit der App ausgeliefert und precacht. Ändert sich nur bei App-Updates.
- **Lernfortschritt** (SRS-Status pro Frage): dynamisch, wird in IndexedDB (via Dexie, `src/services/storageService.ts`) gespeichert und bleibt bei App-Updates erhalten.
- **`src/services/srsService.ts`**: reine, DB-freie Funktionen für die SM-2-Berechnung (gut testbar, siehe Kommentare dort für die genauen Parameter).

## Lernmodi

Alle drei Modi laufen über dieselbe `StudySession.vue` (inkl. Antwort-Shuffle und grün/rot-Feedback je Antwort):

- **Einzelthema** (`/lernen/:topic`): nur fällige/neue Karten des gewählten Themas.
- **Gemischt lernen** (`/lernen-gemischt`): fällige/neue Karten aus **allen** Themen gepoolt und zufällig gemischt.
- **Testsimulation** (`/test`): eine fixe Anzahl (`TEST_SESSION_SIZE` in `useLearningStore.ts`, aktuell 40) zufällig ausgewählter Fragen aus allen Themen – unabhängig vom Fälligkeitsdatum, wie bei einer echten Prüfung. `pickTestQuestions()` in `questionService.ts` garantiert dabei **mindestens eine Frage pro Thema** (zieht zuerst eine zufällige Frage je Thema, füllt den Rest zufällig auf und mischt danach die Reihenfolge). Auch hier fließt die Antwort weiterhin in den SM-2-Fortschritt der jeweiligen Frage ein (kein separater "Test ohne Auswirkung auf den Lernfortschritt"-Modus). Am Ende jeder Testsimulation:
  - werden alle gestellten Fragen mit der abgegebenen Antwort und richtig/falsch noch einmal im Überblick angezeigt (inkl. der korrekten Antwort(en), falls falsch beantwortet),
  - wird das Ergebnis dauerhaft in IndexedDB gespeichert (`saveTestResult` in `storageService.ts`) und fließt in die Statistik ein. Bestanden ist ein Test ab `TEST_PASS_RATIO` (aktuell 80 %, in `useLearningStore.ts`) richtigen Antworten.

## Lokale Entwicklung

Voraussetzung: Node.js ≥ 22.18 oder ≥ 24.12 (siehe `engines` in `package.json`).

```sh
npm install
```

> Hinweis: Das mitgelieferte Scaffold hat aktuell einen Peer-Dependency-Konflikt zwischen `oxlint` und `eslint-plugin-oxlint` (unabhängig von den in diesem Projekt hinzugefügten Paketen). Falls `npm install` mit einem `ERESOLVE`-Fehler abbricht:
>
> ```sh
> npm install --legacy-peer-deps
> ```

Dev-Server starten (Hot-Reload, PWA/Service-Worker sind im Dev-Modus standardmäßig deaktiviert):

```sh
npm run dev
```

Production-Build erzeugen (Type-Check + Vite-Build + Service-Worker-Generierung):

```sh
npm run build
```

Den Build lokal ansehen (inkl. Service Worker, damit sich das Offline-Verhalten testen lässt):

```sh
npm run preview
```

Die App läuft dabei unter dem in `vite.config.ts` konfigurierten Unterpfad `/THW-ToGo/`, also z. B. `http://localhost:4173/THW-ToGo/`.

### Offline-Verhalten testen

1. `npm run build && npm run preview`
2. Seite unter `http://localhost:4173/THW-ToGo/` im Browser öffnen und einmal laden lassen (Service Worker registriert sich und precacht App-Shell, `topics.json` und Icons).
3. In den Browser-DevTools unter „Netzwerk“ (oder via Chrome-Task-Manager-Offline-Checkbox) das Netzwerk deaktivieren.
4. Seite neu laden bzw. zwischen Dashboard/Themen/Lernsession navigieren – die App muss vollständig ohne Netzwerk funktionieren, einschließlich der Fragenbank und des gespeicherten Lernfortschritts aus IndexedDB.

### Lint

```sh
npm run lint
```

## Fragenbank pflegen

Die gesamte Fragenbank liegt in einer einzigen Datei, `src/data/topics.json`: ein Array von Themen, jedes mit `id`, `title` und einem verschachtelten `questions`-Array.

```json
[
  {
    "id": 1,
    "title": "Das THW im Gefüge des Zivil- und Katastrophenschutzes",
    "questions": [
      {
        "id": "1.1",
        "topic": 1,
        "question": "…",
        "answers": [
          { "text": "…", "correct": false },
          { "text": "…", "correct": true }
        ]
      }
    ]
  }
]
```

Wichtig:

- `Topic.id` ist die Themennummer; die Anzahl der Themen ist **nicht** fest verdrahtet – Dashboard, Themenauswahl, Statistik und die Test-/Gemischt-Modi lesen die Themenliste immer direkt aus `topics.json` (`loadTopicList()` in `questionService.ts`). Ein neues Thema hinzufügen heißt also einfach: ein weiteres Objekt an das Array anhängen.
- `Question.id` ist global eindeutig, üblicherweise `{Themennummer}.{laufende Nummer}` (z. B. `1.42`). `Question.topic` referenziert die zugehörige `Topic.id`.
- Es kann mehr als eine Antwort `correct: true` sein – die Lernsession wertet dann als „richtig“, wenn exakt die Menge der korrekt markierten Antworten ausgewählt wurde.
- Die Reihenfolge der Antworten im JSON ist die Quelle der Wahrheit; gemischt wird ausschließlich zur Anzeigezeit in `StudySession.vue` (Fisher-Yates-Shuffle auf einer Kopie).

## THW-Logo und PWA-Icons

Die Original-Markenassets liegen unter `src/assets/logo/`:

- `thw-emblem.webp` – das Zahnrad-Emblem (quadratisch, transparenter Hintergrund). Wird in `App.vue` (Navbar) und `Dashboard.vue` (Header) direkt per `import` eingebunden (dadurch base-path-sicher und automatisch von Vite gehasht/precacht) und ist die Quelle für alle generierten App-Icons.
- `thw-wordmark.webp` – der zweizeilige Schriftzug „Technisches Hilfswerk“, aktuell nicht in der UI verwendet, aber verfügbar für spätere Platzierungen (z. B. Splash-Screen).

Die Icons unter `public/icons/` werden aus `thw-emblem.webp` generiert (weißer Hintergrund, Padding je nach Verwendungszweck – bei `icon-maskable-512.png` extra groß, damit die Zahnrad-Zacken nicht vom Masking der Betriebssysteme abgeschnitten werden). Nach einem Austausch von `thw-emblem.webp` (z. B. neue offizielle Vektor-Version) einfach neu generieren:

```sh
node scripts/generate-icons.mjs
```

## Deployment (GitHub Pages)

Der Workflow `.github/workflows/deploy.yml` baut die App bei jedem Push auf `main` und deployed sie über die offiziellen GitHub-Pages-Actions (`actions/upload-pages-artifact` + `actions/deploy-pages`).

Einmalig einzurichten, bevor der erste Deploy funktioniert:

1. Repository unter dem Namen **`THW-ToGo`** auf GitHub anlegen (der Name ist in `vite.config.ts` als `base: '/THW-ToGo/'` sowie im PWA-Manifest als `start_url`/`scope` hinterlegt – bei einem anderen Repo-Namen müssen diese Stellen angepasst werden).
2. In den Repository-Settings unter **Settings → Pages** die Source auf **„GitHub Actions“** stellen.
3. Auf `main` pushen (oder den Workflow manuell über „Run workflow“ auslösen) – die App ist danach unter `https://<username>.github.io/THW-ToGo/` erreichbar.

## Projektstruktur

```
src/
  assets/
    logo/                 Original-Markenassets (thw-emblem.webp, thw-wordmark.webp)
    styles.scss           Bootstrap-Sass-Build inkl. $primary-Override
  data/            Statische Fragenbank (topics.json, ein Array aller Themen)
  types/           Gemeinsame TypeScript-Typen (Question, Answer, Topic, TestResult)
  services/
    srsService.ts        SM-2-Berechnung (reine Funktionen)
    storageService.ts     Dexie-Wrapper für SRS-Status + Testsimulations-Ergebnisse (IndexedDB)
    questionService.ts    Laden von topics.json + Auswertung/Zufallsauswahl von Fragen
  stores/
    useLearningStore.ts   Pinia-Store: Lernsession (Thema/gemischt/Test), Dashboard-Übersicht
  components/
    TestScoreChart.vue    Liniendiagramm der Testsimulations-Ergebnisse im Zeitverlauf
  views/
    Dashboard.vue         Gesamtfortschritt, gemischt lernen, Testsimulation, fällige Themen
    TopicSelect.vue       Themenübersicht
    StudySession.vue      Karteikarten-Abfrage inkl. Shuffle, für alle drei Lernmodi
    Stats.vue             Statistik je Thema + Testsimulations-Verlauf
  router/          Vue-Router-Konfiguration
  utils/
    random.ts             Fisher-Yates-Shuffle (Antworten & Fragenauswahl)
scripts/
  generate-icons.mjs      Erzeugt public/icons/*.png aus src/assets/logo/thw-emblem.webp
public/
  icons/           Generierte PWA-Icons in mehreren Größen (aus dem THW-Emblem)
.github/workflows/
  deploy.yml       CI/CD-Pipeline für GitHub Pages
```
