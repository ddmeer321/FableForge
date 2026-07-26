# FableForge

FableForge ist eine spielbare Beta eines Fantasy-Dungeon-RNG-Spiels. Du öffnest
magische Boxen, stellst ein Heldenteam zusammen und führst es durch einen
verzweigten Roguelite-Dungeon.

**[FableForge im Browser spielen](https://ddmeer321.github.io/FableForge/)**

## Was bereits spielbar ist

- geführter Einstieg mit kostenloser Helden- und Ausrüstungsbox
- Helden-, Ausrüstungs- und Teamverwaltung
- zwei zufällig aufgebaute Dungeons mit jeweils mindestens zehn Abschnitten
- sichtbare Wege, Kreuzungen und Nebel über noch unentdeckten Bereichen
- halbautomatische Kämpfe mit aktiv auslösbaren Fähigkeiten
- Nahkampf-, Fernkampf- und Heilungsanimationen
- Schutzraum für einen vorübergehend geretteten Helden
- Ereignisse, Händler, Heilräume, Eliten und ein Boss
- Frostglas-Höhlen mit Frostwellen, Eisgegnern und Königin Skadi
- temporäre Power-ups und Belohnungen
- lokale Speicherung des Fortschritts im Browser
- responsive Bedienung für Desktop, Tablet und Smartphone

## Lokal starten

Voraussetzung ist Node.js 22.13 oder neuer.

```bash
npm install
npm run dev
```

Die lokale Entwicklungsseite wird anschließend unter der im Terminal genannten
Adresse geöffnet.

## Prüfen und bauen

```bash
npm run lint
npm test
npm run build:pages
```

- `npm run build` erstellt den vinext-Build.
- `npm run build:pages` erstellt die statische GitHub-Pages-Version.
- `npm test` prüft Server-Rendering und zentrale Spiellogik.

## Technik

FableForge verwendet React, TypeScript, vinext und Vite. Das Spiel benötigt
aktuell kein Backend: Spielstände werden ausschließlich im jeweiligen Browser
gespeichert.

Die GitHub-Pages-Version wird bei Änderungen an `main` automatisch über
`.github/workflows/pages.yml` veröffentlicht.

## Status

Das Projekt ist eine Beta. Balancing, weitere Dungeon-Themen, zusätzliche
Helden und mehr Ausrüstung sind für spätere Versionen vorgesehen.
