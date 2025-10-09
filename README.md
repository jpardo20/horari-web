# Horari Web (estàtic)

Pàgina estàtica per mostrar l'horari per **classe** o **professor/a**.

## Estructura
- `index.html` — Vista d'horari (frontend)
- `admin.html` — Editor de `sessions.json` (importa, edita, valida i exporta)
- `data/*.json` — Dades: classes, professors, sessions i colors
- `js/app.js`, `js/admin.js` — Lògica
- `css/styles.css` — Estils

## Flux de manteniment
1. Obre `admin.html` (millor amb un servidor local: `python -m http.server 8000`).
2. Clica **Carrega del servidor** o **Importa sessions.json**.
3. Edita les files: dia, hores, assignatura, classe, professor/a, aula.
4. Usa **Comprova solapaments** per detectar conflictes.
5. **Descarrega sessions.json** i fes *commit/push* al repositori.

## GitHub Pages
- **Settings → Pages → Deploy from a branch** (branch `main`, root).
- Incrusta a Moodle amb `<iframe>`.

## Validació bàsica
- Dia 1..5
- Format d'hora `HH:MM` i `start < end`
- Classe i professor/a existents
- Solapaments per classe o per professor/a el mateix dia
