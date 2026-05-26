# ASPECT / SPEC — App Spelling Bee

## 1. Nombre del proyecto

**Spelling Bee**

Aplicación web educativa para que estudiantes practiquen vocabulario en inglés mediante actividades de listening, writing, speaking, spelling y competencia por equipos.

---

## 2. Descripción general

**Spelling Bee** será una aplicación web interactiva orientada a estudiantes de bachillerato. Permitirá practicar vocabulario en inglés a partir de un banco de palabras cargado por el docente.

La app permitirá que el estudiante:

- Escuche una palabra en inglés.
- Escriba la palabra correctamente.
- Practique el deletreo oral.
- Reciba retroalimentación inmediata.
- Acumule puntos.
- Repase las palabras en las que falló.
- Participe en competencias tipo Spelling Bee.

---

## 3. Objetivo del proyecto

Desarrollar una aplicación interactiva que ayude a los estudiantes a mejorar la escritura, escucha, pronunciación y deletreo de palabras en inglés mediante prácticas individuales y competencias tipo **Spelling Bee**.

---

## 4. Objetivo pedagógico

Fortalecer la habilidad comunicativa en inglés mediante la práctica sistemática de vocabulario, integrando escucha, escritura y producción oral.

### Objetivo con Taxonomía de Bloom

**Aplicar** vocabulario en inglés mediante ejercicios de escucha, escritura y deletreo oral, para mejorar la precisión ortográfica, la pronunciación y la comprensión auditiva en situaciones de práctica individual y competencia grupal.

---

## 5. Usuarios del sistema

### 5.1 Docente

El docente podrá:

- Cargar palabras.
- Crear categorías.
- Crear bancos por unidad.
- Seleccionar modo de práctica.
- Iniciar competencias.
- Revisar resultados.
- Ver palabras falladas.
- Usar la app como apoyo en clase.

### 5.2 Estudiante

El estudiante podrá:

- Practicar palabras.
- Escuchar la pronunciación.
- Escribir respuestas.
- Deletrear palabras oralmente.
- Ver su puntaje.
- Repasar errores.
- Participar en competencias.

---

## 6. Alcance del sistema

### 6.1 Versión inicial — MVP

La primera versión debe ser sencilla, funcional y usable en clase.

Debe incluir:

- Pantalla de inicio.
- Banco de palabras en archivo JSON.
- Selección de categoría.
- Selección de nivel.
- Modo **Listen & Write**.
- Modo **Spell Aloud** básico.
- Modo **Spelling Bee Competition**.
- Voz sintética para pronunciar palabras.
- Validación de escritura.
- Puntaje.
- Registro de palabras falladas.
- Diseño responsive para celular, tablet y computadora.

### 6.2 Funciones para versiones futuras

Más adelante se puede incluir:

- Login de estudiantes.
- Login docente.
- Panel administrativo.
- Importar Excel o CSV.
- Reportes por estudiante.
- Reportes por sección.
- Ranking institucional.
- Exportación a Excel.
- Guardado en base de datos.
- Historial de progreso.

---

## 7. Módulos principales

## Módulo 1: Inicio

### Descripción

Pantalla principal de la aplicación.

### Elementos

- Nombre de la app.
- Logo o ícono.
- Botón: **Practice Mode**.
- Botón: **Spelling Bee Competition**.
- Botón: **Review Mistakes**.
- Botón: **Word Bank**.

---

## Módulo 2: Banco de palabras

### Descripción

Permite almacenar las palabras que se usarán en las actividades.

### Estructura de cada palabra

```json
{
  "id": 1,
  "word": "beautiful",
  "meaning": "hermoso/a",
  "category": "adjectives",
  "unit": "Unit 2",
  "level": "hard",
  "example": "The flower is beautiful."
}
```

### Campos requeridos

| Campo | Descripción |
|---|---|
| id | Identificador único |
| word | Palabra en inglés |
| meaning | Significado en español |
| category | Categoría |
| unit | Unidad o tema |
| level | Nivel de dificultad |
| example | Oración de ejemplo |

---

## Módulo 3: Practice Mode

### Descripción

Modo de práctica individual.

### Flujo

1. El estudiante selecciona categoría.
2. Selecciona nivel.
3. La app elige una palabra.
4. El estudiante presiona **Listen**.
5. La app pronuncia la palabra.
6. El estudiante escribe la respuesta.
7. La app valida.
8. Se muestra retroalimentación.
9. Se suman puntos.
10. Continúa la siguiente palabra.

### Reglas

- Las mayúsculas y minúsculas no deben afectar la respuesta.
- Los espacios al inicio o final deben ignorarse.
- Si la respuesta es incorrecta, se guarda en palabras falladas.

---

## Módulo 4: Listen & Write

### Descripción

Actividad donde el estudiante escucha una palabra y la escribe.

### Elementos de pantalla

- Botón **Listen**.
- Campo de texto.
- Botón **Check**.
- Puntaje.
- Contador de progreso.
- Mensaje de retroalimentación.

### Ejemplo

La app dice:

> beautiful

El estudiante escribe:

> beautiful

Resultado:

> Correct! Excellent spelling.

---

## Módulo 5: Spell Aloud

### Descripción

Actividad para practicar speaking y deletreo oral.

### Flujo

1. La app muestra o pronuncia una palabra.
2. El estudiante presiona **Speak**.
3. El estudiante deletrea la palabra oralmente.
4. La app intenta reconocer lo dicho.
5. Se compara con la palabra correcta.
6. Se muestra resultado.

### Consideración técnica

El reconocimiento de voz puede depender del navegador. Por eso debe existir una opción de validación manual por el docente.

### Modos de evaluación

| Modo | Descripción |
|---|---|
| Automático | La app intenta reconocer la voz |
| Manual | El docente marca correcto o incorrecto |

---

## Módulo 6: Spelling Bee Competition

### Descripción

Modo de competencia por equipos.

### Flujo

1. El docente crea equipos.
2. Selecciona categoría.
3. Selecciona nivel.
4. Inicia la ronda.
5. La app selecciona una palabra aleatoria.
6. El equipo escucha la palabra.
7. El equipo debe escribirla y deletrearla.
8. El docente o la app valida.
9. Se asignan puntos.
10. Pasa el siguiente equipo.

### Sistema de puntos sugerido

| Acción | Puntos |
|---|---:|
| Escribir correctamente | 10 |
| Deletrear oralmente correctamente | 10 |
| Usar la palabra en una oración | 5 |
| Responder sin pista | 5 extra |

---

## Módulo 7: Review Mistakes

### Descripción

Módulo para repasar palabras falladas.

### Funciones

- Mostrar lista de palabras incorrectas.
- Repetir práctica solo con esas palabras.
- Permitir escuchar de nuevo.
- Permitir escribir de nuevo.
- Permitir deletrear oralmente.
- Limpiar lista de errores.

---

## Módulo 8: Word Bank básico

### Descripción

En la primera versión puede ser un banco fijo en JSON.

En una versión posterior se podrá editar desde la interfaz.

### Funciones iniciales

- Leer archivo `words.json`.
- Filtrar por categoría.
- Filtrar por nivel.
- Seleccionar palabra aleatoria.
- Evitar repetir palabras en la misma ronda.

---

## 8. Requisitos funcionales

| Código | Requisito |
|---|---|
| RF01 | Mostrar pantalla de inicio con acceso a los modos principales. |
| RF02 | Cargar banco de palabras desde un archivo JSON. |
| RF03 | Filtrar palabras por categoría, unidad y nivel. |
| RF04 | Pronunciar la palabra usando voz sintética en inglés. |
| RF05 | Comparar la respuesta escrita del estudiante con la palabra correcta. |
| RF06 | Mostrar mensajes de correcto o incorrecto. |
| RF07 | Sumar puntos por respuestas correctas. |
| RF08 | Guardar las palabras respondidas incorrectamente. |
| RF09 | Permitir repetir las palabras falladas. |
| RF10 | Permitir jugar por equipos con marcador. |
| RF11 | Incluir temporizador para el modo competencia. |
| RF12 | Intentar reconocer el deletreo oral cuando el navegador lo permita. |
| RF13 | Permitir validación manual del speaking por parte del docente. |

---

## 9. Requisitos no funcionales

| Código | Requisito |
|---|---|
| RNF01 | La app debe ser sencilla de usar para estudiantes de bachillerato. |
| RNF02 | Debe funcionar en celulares, tablets, computadoras y pantallas de aula. |
| RNF03 | Debe cargar rápido y funcionar sin depender de muchos recursos externos. |
| RNF04 | Debe usar botones grandes, texto claro y buen contraste. |
| RNF05 | Debe poder subirse fácilmente a Netlify, GitHub Pages o un servidor escolar. |
| RNF06 | El código debe estar organizado en archivos separados: HTML, CSS, JavaScript y JSON. |

---

## 10. Estructura técnica sugerida

```text
spelling-bee/
│
├── index.html
├── styles.css
├── app.js
│
├── data/
│   └── words.json
│
├── assets/
│   ├── logo.png
│   ├── bee-icon.png
│   └── sounds/
│
└── README.md
```

---

## 11. Tecnologías recomendadas

### Primera versión

- HTML
- CSS
- JavaScript
- JSON
- Web Speech API
- LocalStorage

### Versión avanzada

- Python + Flet
- FastAPI
- SQLite o PostgreSQL
- OpenPyXL para reportes en Excel
- Sistema de login
- Panel docente

---

## 12. Datos principales

### Word

Representa una palabra del banco.

```json
{
  "id": 1,
  "word": "teacher",
  "meaning": "docente",
  "category": "school",
  "unit": "Unit 1",
  "level": "easy",
  "example": "My teacher is kind."
}
```

### Score

Representa el puntaje de una ronda.

```json
{
  "correctAnswers": 8,
  "wrongAnswers": 2,
  "totalQuestions": 10,
  "score": 80
}
```

### Team

Representa un equipo en competencia.

```json
{
  "id": 1,
  "name": "Team A",
  "score": 30
}
```

---

## 13. Historias de usuario

| Código | Historia de usuario |
|---|---|
| HU01 | Como estudiante, quiero seleccionar un modo de práctica para trabajar el vocabulario indicado por el docente. |
| HU02 | Como estudiante, quiero escuchar la pronunciación de una palabra para escribirla correctamente. |
| HU03 | Como estudiante, quiero escribir la palabra que escucho para practicar spelling. |
| HU04 | Como estudiante, quiero saber si mi respuesta es correcta o incorrecta para aprender de mis errores. |
| HU05 | Como estudiante, quiero repasar las palabras que fallé para mejorar mi aprendizaje. |
| HU06 | Como estudiante, quiero competir por equipos para practicar spelling de forma divertida. |
| HU07 | Como docente, quiero cargar un banco de palabras para adaptar la app a mis unidades de clase. |
| HU08 | Como docente, quiero seleccionar una categoría para practicar vocabulario específico. |
| HU09 | Como docente, quiero marcar si el deletreo oral fue correcto o incorrecto cuando el reconocimiento automático no funcione bien. |

---

## 14. Criterios de aceptación

| Código | Criterio de aceptación |
|---|---|
| CA01 | Dado que existe un archivo `words.json`, cuando se inicia la app, entonces debe cargar las palabras correctamente. |
| CA02 | Dado que hay una palabra activa, cuando el estudiante presiona **Listen**, entonces la app debe pronunciar la palabra en inglés. |
| CA03 | Dado que la palabra correcta es `teacher`, cuando el estudiante escribe `Teacher`, entonces la app debe marcar la respuesta como correcta. |
| CA04 | Dado que la palabra correcta es `beautiful`, cuando el estudiante escribe `beautifull`, entonces la app debe marcar la respuesta como incorrecta. |
| CA05 | Dado que el estudiante responde incorrectamente, entonces la palabra debe guardarse en la lista de palabras falladas. |
| CA06 | Dado que el estudiante responde correctamente, entonces la app debe sumar puntos. |
| CA07 | Dado que existen dos equipos, cuando un equipo responde correctamente, entonces su puntaje debe aumentar. |
| CA08 | Dado que inicia una ronda de competencia, entonces debe mostrarse un temporizador visible. |

---

## 15. Backlog inicial de desarrollo

## Épica 1: Configuración del proyecto

### Tareas

- Crear carpeta del proyecto.
- Crear `index.html`.
- Crear `styles.css`.
- Crear `app.js`.
- Crear carpeta `data`.
- Crear archivo `words.json`.
- Crear carpeta `assets`.
- Crear `README.md`.

---

## Épica 2: Interfaz inicial

### Tareas

- Diseñar pantalla de bienvenida.
- Agregar título de la app.
- Agregar botones de navegación.
- Crear diseño responsive.
- Agregar estilos generales.
- Agregar ícono o imagen de referencia.

---

## Épica 3: Banco de palabras

### Tareas

- Crear estructura JSON de palabras.
- Agregar palabras de prueba.
- Crear función para cargar palabras.
- Crear función para filtrar por categoría.
- Crear función para filtrar por nivel.
- Crear función para seleccionar palabra aleatoria.
- Evitar repetición de palabras en la misma ronda.

---

## Épica 4: Listen & Write

### Tareas

- Crear pantalla de práctica.
- Agregar botón **Listen**.
- Crear función de voz sintética.
- Agregar campo de respuesta.
- Crear botón **Check**.
- Crear función de validación.
- Mostrar mensaje correcto o incorrecto.
- Actualizar puntaje.
- Pasar a la siguiente palabra.

---

## Épica 5: Sistema de puntaje

### Tareas

- Crear variable de puntaje.
- Crear contador de respuestas correctas.
- Crear contador de errores.
- Mostrar progreso de ronda.
- Mostrar resultado final.
- Guardar palabras falladas.

---

## Épica 6: Review Mistakes

### Tareas

- Crear lista de palabras falladas.
- Guardar errores en LocalStorage.
- Mostrar palabras falladas.
- Crear botón para practicar errores.
- Crear botón para limpiar errores.
- Crear ronda especial con errores.

---

## Épica 7: Spelling Bee Competition

### Tareas

- Crear pantalla de competencia.
- Crear formulario para equipos.
- Agregar equipo A y equipo B.
- Mostrar marcador.
- Crear botón para nueva palabra.
- Agregar temporizador.
- Crear botones de correcto e incorrecto.
- Sumar puntos al equipo actual.
- Cambiar turno de equipo.
- Mostrar ganador.

---

## Épica 8: Spell Aloud

### Tareas

- Crear botón **Speak**.
- Activar reconocimiento de voz si está disponible.
- Capturar texto reconocido.
- Comparar texto reconocido con palabra correcta.
- Mostrar resultado.
- Agregar opción de validación manual.
- Crear botones: **Correct Speaking** / **Incorrect Speaking**.

---

## Épica 9: Diseño visual

### Tareas

- Definir paleta de colores.
- Diseñar tarjetas de palabras.
- Diseñar botones grandes.
- Agregar animaciones suaves.
- Mejorar pantalla de resultados.
- Crear diseño especial para competencia.
- Adaptar a proyector o pantalla de aula.

---

## Épica 10: Pruebas

### Tareas

- Probar carga de palabras.
- Probar voz sintética.
- Probar validación de escritura.
- Probar puntaje.
- Probar guardado de errores.
- Probar modo competencia.
- Probar en celular.
- Probar en computadora.
- Probar en navegador Chrome.
- Probar en navegador Edge.

---

## 16. Orden recomendado de desarrollo

### Fase 1: Estructura base

1. HTML.
2. CSS.
3. JavaScript.
4. JSON.
5. Pantalla inicial.

### Fase 2: Práctica principal

1. Cargar palabras.
2. Escuchar palabra.
3. Escribir respuesta.
4. Validar.
5. Puntaje.

### Fase 3: Competencia

1. Equipos.
2. Turnos.
3. Marcador.
4. Temporizador.

### Fase 4: Speaking

1. Botón de voz.
2. Reconocimiento básico.
3. Validación manual.

### Fase 5: Pulido

1. Diseño visual.
2. Responsive.
3. Pruebas.
4. Corrección de errores.

---

## 17. Tareas listas para convertir en desarrollo

1. Crear estructura del proyecto.
2. Crear diseño de pantalla inicial.
3. Crear archivo `words.json`.
4. Cargar palabras desde JSON.
5. Mostrar categorías disponibles.
6. Seleccionar categoría.
7. Seleccionar nivel.
8. Crear función para pronunciar palabra.
9. Crear función para seleccionar palabra aleatoria.
10. Crear campo para respuesta escrita.
11. Crear validación de spelling.
12. Crear sistema de puntos.
13. Crear lista de errores.
14. Crear modo de práctica de errores.
15. Crear modo competencia.
16. Crear marcador por equipos.
17. Crear temporizador.
18. Crear función de reconocimiento de voz.
19. Crear validación manual para speaking.
20. Crear pantalla final de resultados.

---

## 18. Definición del MVP

El MVP estará completo cuando se pueda:

- Abrir la app en el navegador.
- Seleccionar una categoría.
- Escuchar una palabra.
- Escribir la respuesta.
- Recibir retroalimentación.
- Acumular puntos.
- Ver palabras falladas.
- Jugar una competencia básica por equipos.

Ese será el primer objetivo realista antes de agregar login, reportes y panel docente avanzado.

---

## 19. Notas técnicas importantes

- La voz sintética puede implementarse con `SpeechSynthesisUtterance`.
- El reconocimiento de voz puede implementarse con `SpeechRecognition` o `webkitSpeechRecognition`, según el navegador.
- La evaluación automática del speaking no debe ser el único método de evaluación, porque puede fallar según navegador, micrófono, ruido o pronunciación.
- El modo manual para docente debe permanecer como respaldo.
- La primera versión puede funcionar sin servidor usando `LocalStorage`.
- Para producción institucional, se recomienda una segunda versión con base de datos y reportes.

---

## 20. Nombre final sugerido

**Spelling Bee**

Subtítulo sugerido:

**Listen, Spell and Speak**
