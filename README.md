# Horari Web

Aplicació web estàtica per visualitzar horaris per **classe** o **professor/a**, amb suport de **trimestres** i sistema estructural de **descansos automàtics**.

> Estat actual: `v1.0-horaris-estable`

---

## 🎯 Objectiu

Mostrar horaris acadèmics de forma clara i mantenible, amb una arquitectura neta basada en:

- HTML + CSS + JavaScript pur
- Dades en fitxers JSON
- Sense backend
- Sense dependències externes

---

## 🏗 Arquitectura del projecte

```
horari-web/
│
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── data/
│   ├── sessions.json
│   ├── assignatures.json
│   ├── professors.json
│   ├── rols.json
│   └── descansos.json
└── _historics_js/
```

### 🔹 Principis arquitectònics

- Un únic fitxer actiu de lògica (`app.js`)
- Separació estricta de dades (`/data`)
- Descansos definits estructuralment (no hacks)
- Renderització basada en construcció de franges reals
- Codi net sense versions duplicades actives

---

## ☕ Sistema de descansos (implementació definitiva)

Els descansos NO estan dins `sessions.json`.

Es defineixen a:

```
data/descansos.json
```

Exemple:

```json
[
  {"start":"11:20","end":"11:40","label":"DESCANS MATÍ"},
  {"start":"14:40","end":"15:20","label":"DINAR"},
  {"start":"18:20","end":"18:40","label":"DESCANS TARDA"}
]
```

### Com funciona

1. Es construeixen franges reals a partir de sessions.
2. Es detecta si existeixen sessions abans i després d’un descans.
3. Només llavors s’intercala el descans a la graella.
4. No es fan servir `type="break"` ni `day=0`.

Això garanteix:

- Robustesa
- Mantenibilitat
- Independència de les dades de sessions

---

## 🖥 Funcionament

La vista permet:

- Filtrar per classe
- Filtrar per professor/a
- Filtrar per trimestre
- Visualització en graella 5 dies
- Franja horària a l’esquerra
- Sessions amb assignatura, professor/a i aula
- Descansos automàtics

---

## 🧰 Desenvolupament local

Recomanat:

```bash
python -m http.server 8000
```

Després obrir:

```
http://localhost:8000
```

---

## 🚀 Publicació amb GitHub Pages

1. Settings → Pages
2. Deploy from a branch
3. Branch: `main`
4. Folder: `/ (root)`

Opcional: incrustar a Moodle amb `<iframe>`.

---

## 🧪 Validacions implementades

- Dia entre 1 i 5
- Format hora `HH:MM`
- `start < end`
- Filtrat correcte per trimestre
- Renderització estable encara que només hi hagi matí o tarda

---

## 🔖 Versionat

Versió estable actual:

```
v1.0-horaris-estable
```

Aquesta versió representa:

- Repo sanejat
- Sistema de descansos robust
- Arquitectura simplificada
- Sense codi mort ni duplicacions

---

## 📈 Full de ruta (v1.1)

Pròxima evolució prevista:

- Nova branca `feature/admin-sessions`
- Nova pàgina `admin-sessions.html`
- Edició estructurada de sessions
- Exportació de JSON actualitzat
- Evolució disciplinada via branques (mai treballar directament sobre `main`)

---

## 📌 Filosofia del projecte

- Evolució estructurada
- Sense hacks
- Sense improvisacions
- Cada millora en branca pròpia
- Base estable sempre protegida