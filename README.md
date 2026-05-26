# Spelling Bee INSE

Aplicacion web educativa para practicar vocabulario en ingles mediante actividades de listening, writing, speaking y competencia por equipos.

## Funciones incluidas

- Pantalla de inicio responsive.
- Banco de palabras en `data/words.json`.
- Filtros por categoria, unidad y nivel.
- Modo Listen & Write con voz sintetica, validacion y puntaje.
- Registro de errores en `LocalStorage` y practica de palabras falladas.
- Modo Spell Aloud con reconocimiento de voz cuando el navegador lo soporta y validacion manual del docente.
- Modo Spelling Bee Competition con equipos, marcador, temporizador y puntos por accion.
- Tests automatizados para reglas principales de validacion, filtros, errores y competencia.

## Ejecutar

Sirve la carpeta con el servidor local incluido:

```bash
npm start
```

Tambien puedes usar cualquier servidor local o publicar la carpeta en Netlify, GitHub Pages o un servidor escolar.

## Probar

```bash
npm test
```

## Estructura

```text
index.html
styles.css
app.js
data/words.json
tests/app.test.js
```

## Notas tecnicas

- La pronunciacion usa `SpeechSynthesisUtterance` en ingles.
- El speaking usa `SpeechRecognition` o `webkitSpeechRecognition` si esta disponible.
- La validacion manual permanece como respaldo porque el reconocimiento de voz depende del navegador, microfono y ruido del aula.
- Si el archivo JSON no se puede cargar, la app usa un banco minimo de respaldo para no quedar inutilizable.
