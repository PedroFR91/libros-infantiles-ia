# Revisión de producto, diseño, ventas y calidad del libro — LibrosIA (02/10/2026)

> Revisión crítica del código desplegable (commit `df27886` + cambios de Bubok sin subir) hecha como equipo: diseño, producto/flujos, ventas y calidad editorial.
> Evidencia: 34 capturas reales con Playwright (móvil 390×844 y escritorio 1440×900; API simulada, ilustraciones de marcador) y lectura del código.
> Lo que **no** se ha podido ver: libros reales generados (falta ejecutar el motor con OpenAI) ni el libro impreso (pendiente de Bubok).

---

## 1. Veredicto

El esqueleto es bueno: historia gratis → portada de muestra → pago → libro → impreso. Pero **hoy, en el móvil, la experiencia rompe la venta en tres puntos**:

1. **El comprador puede pagar y no ver nunca su libro.** El visor sale en negro en móvil, la generación depende de que la pestaña siga abierta tras Stripe y los enlaces de los emails no abren el libro en otro navegador.
2. **Hay fricción en cada paso.** Banner de cookies que tapa el botón, formulario de 7 campos con pestañas, botón de compra fuera de pantalla, packs y casilla legal antes de pagar, "créditos", y los PDF y el impreso escondidos en un panel.
3. **No se ve el producto.** No hay ningún libro real ni foto del impreso, el tema oscuro parece una app de IA y no un cuento para regalar, y las etiquetas "Popular" y "Más elegido" aparecen sin ventas.

En calidad del libro el diseño del motor es sólido, pero hay riesgos concretos de consistencia que se arreglan en código antes de generar el primer libro de ejemplo (ver §5).

---

## 2. Fallos que bloquean la venta (arreglar antes de nada)

| # | Fallo | Evidencia | Arreglo | Esfuerzo |
|---|---|---|---|---|
| B1 | **Visor negro en móvil**: el libro no se ve | movil-10/11/12. `viewMode` empieza en `"spread"` (editor/page.tsx), que está oculto por debajo de 768 px (BookViewer.tsx) | Vista `single` por defecto en móvil | S |
| B2 | **Generación lanzada por el navegador**: si tras Stripe no vuelve (Apple Pay, app del banco, navegador interno de Instagram), el libro queda pagado y sin ilustrar | `generateAfterPayment` en editor/page.tsx; el webhook solo abona créditos | El webhook consume los créditos y lanza `startIllustrations` si hay `metadata.bookId`; la web solo observa | M |
| B3 | **Los emails no abren el libro** fuera del navegador original (cookie anónima) | `api/books/[id]` exige dueño por cookie | Enlace privado con token (`/libro/{id}?t=…`) en todos los emails, que además reasocia el libro al navegador | M |
| B4 | **Banner de cookies** que tapa un tercio de la pantalla y el botón "Crear historia" | movil-01, movil-06b | Solo hay cookies técnicas (Umami no usa cookies): basta con un aviso en el pie, sin bloquear | S |
| B5 | **El botón de compra queda bajo el pliegue** en "Historia lista", y el botón "Ilustrar" del visor está desactivado con 0 créditos | movil-08/08b; BookViewer.tsx | Botón fijo abajo; "Ilustrar" abre la compra | S |
| B6 | **Los botones de pago, reintento y descarga parecen desactivados**: el token `--secondary` es gris #9ca3af | escritorio-08, escritorio-13 | Quitar `bg-secondary` / `to-secondary` de los botones | S |
| B7 | **El modal de compra no tiene botón de acción**: los packs salen grises hasta marcar la casilla | movil-09 | Un botón "Pagar 9,90 €" activo; aceptación legal en Stripe o con una fila de 44 px | S |
| B8 | **Al terminar, la descarga y el impreso están enterrados** en el panel de opciones móvil | movil-12-panel | Pantalla de éxito: portada, **Descargar PDF**, **Tenerlo en papel** y Compartir | M |

---

## 3. Flujo propuesto (producto)

**Hoy:** unas 11 pantallas, 2 casillas legales, 2 pagos y 5-6 decisiones antes de ver valor (cookies, estilo, edad, foto, pack, tipo de PDF).

**Propuesta — asistente a pantalla completa, pensado para el móvil:**

1. **¿Cómo se llama?** Solo el nombre.
2. **¿Qué le encanta?** 8-10 chips con dibujo (dinosaurios, espacio, princesas, fútbol…) más "otra cosa". La edad va aquí en una línea.
3. **Foto (opcional)**, con un "Saltar" bien visible.
4. **Espera narrada** ("Escribiendo la aventura de Sofía…"), con el email opcional: "¿Te lo guardamos?".
5. **Revelación**: portada a pantalla completa y las primeras páginas en carrusel. Un único botón: **"Ilustrar el cuento de Sofía · 9,90 €"**. Debajo, el enlace al pack **"Impreso + PDF"**.
6. **Pago** en Stripe (el email lo pide Stripe).
7. **Pantalla de ilustración**: las páginas aparecen según se terminan, con "Puedes cerrar, te enviamos el enlace".
8. **Listo**: Descargar PDF, Tenerlo en papel y "¿Otro para su hermano?".

**Se esconde en "más opciones":** estilo visual (un buen estilo por defecto), compañero, dedicatoria (se ofrece en el paso 5), personalización del texto, modos de vista y el PDF para imprimir en casa.
**Se elimina de la interfaz:** "créditos" (pasa a "libros disponibles"), el saldo de la cabecera y "borrador".
**Edición:** tocar una página abre "Cambiar frase" y "Rehacer dibujo". Las 2-3 primeras repeticiones del dibujo van incluidas.

**Sin registro:**
- El libro se identifica con su enlace privado.
- El email se pide de forma opcional durante la espera y de forma obligatoria en Stripe.
- "¿Ya tienes un libro? Pon tu email" envía un enlace con la lista de tus libros.
- La cuenta de Google o email pasa a ser opcional ("Mis libros" en el pie).

---

## 4. Diseño visual

- **Tema claro y cálido, de papel de cuento**, en lugar del oscuro que hoy parece una app de IA o de gaming:
  - fondo #FFF8EE y superficies #FFFFFF;
  - texto #2B2118 y texto secundario #6B5B4E;
  - primario terracota **#C2410C** (texto blanco a 5,2:1, AA), con #9A3412 en hover;
  - acento azul noche #1E3A5F.
- **Contraste:** hoy el texto blanco sobre #f97316 da 2,8:1 y no llega al AA en ningún botón.
- **Tipografía:** Nunito para el cuerpo, con mínimo 16 px (hoy hay 14 usos de 10-11 px y el `body` usa la fuente del sistema). Fraunces o Baloo 2 para los títulos. Coherente con el PDF (Andika y Sniglet).
- **Iconos:** un solo set; fuera los emojis del sistema y el emoji del H1 de las páginas SEO.
- **Coherencia de textos:** "Portada + 12 páginas ilustradas" en todas partes (hoy conviven 12 y 13).
- **Mostrar el producto sin inventar:**
  - 3-6 libros reales generados por el sistema (niños ficticios o con permiso), con la etiqueta "Ejemplo real, sin retoques";
  - mockup de libro abierto 21×21 con esas páginas;
  - vídeo vertical de 15 s hojeando el PDF y, en cuanto llegue la muestra de Bubok, el libro en papel.
- **Pasos de generación en vertical en móvil**: hoy se cortan por los lados (movil-07).

---

## 5. Calidad del libro (motor)

Riesgos ordenados por probabilidad × impacto, con su arreglo:

| # | Riesgo | Arreglo | Esfuerzo |
|---|---|---|---|
| Q1 | **Personajes que se mezclan** con varias referencias: el prompt no dice qué imagen corresponde a quién | "Imagen 1 = Sofía (protagonista), imagen 2 = Toby…" y protagonista siempre la primera (solo la primera imagen se conserva con máxima fidelidad, según el cookbook de OpenAI) | S |
| Q2 | **Letras dentro de las imágenes**: el estilo "cómic" pide bocadillos; marcadores, mapas y carteles | Quitar "speech bubbles"; prohibir objetos con letras en la acción | S |
| Q3 | **Contradicción de hora del día**: el escenario la fija pero la historia avanza hasta la noche | `timeOfDay` en la escena; quitarla de la ficha del escenario | S |
| Q4 | **Se pierde el parecido** si la referencia con foto falta al pagar (se regenera sin foto) | La hoja estilizada con foto se guarda y nunca se regenera sin ella | S |
| Q5 | **Regenerar texto usa el motor viejo** (gpt-4o-mini, sin biblia) y el ajuste libre no se modera | Regenerar con la biblia y el motor v2; moderar; por defecto solo la imagen | M |
| Q6 | **Deriva de estilo** entre páginas y secundarios | Portada en calidad high como ancla de estilo en todas las páginas; secundarios generados desde la hoja del protagonista | M |
| Q7 | **Riesgo de propiedad intelectual**: los estilos citan Disney/Pixar y Beatrix Potter; compañero en texto libre ("Elsa") | Estilos descritos sin marcas; filtro de IP en tema y compañero | S |
| Q8 | **Concordancia de género** (Noa, Alex) y proporciones que varían | Campos de género y edad; proporciones explícitas en el prompt | S |
| Q9 | **El texto tapa la ilustración** en el PDF digital (7-8 años ≈ 40 % de la página) | Límite de palabras por página validado en código; tamaño de texto adaptable | S |
| Q10 | **Calidad literaria** | Estructura por edad (estribillo acumulativo para 3-4), frases cortas, diálogos con raya, lista de clichés prohibidos, títulos concretos de 6 palabras como máximo | M |
| Q11 | **Sin control automático** | Revisión por visión de cada página (identidad, texto, anatomía, estilo) → se regenera sola esa página, como máximo 2 veces (≈0,4 € por libro) | M |

**Coste real estimado por libro:** ≈1,6-1,8 $ con gpt-image-1 en calidad medium (la auditoría decía 0,90-1,20 €, que se quedaba corto). Con ancla de estilo y portada high, ≈2,4 $. Hay que comparar con **gpt-image-2**: ≈1,6 $ y tamaños mayores, útiles para la imprenta. Ojo: según terceros, **no admite `input_fidelity`** y el código lo envía siempre.

**Umbral de "listo para vender"** (banco de pruebas con libros completos, incluido el camino con foto, más un panel de 3 padres): 20 libros seguidos con estas condiciones:
- identidad media ≥ 4/5 y ninguna página por debajo de 3;
- ≥ 95 % de páginas sin letras;
- ≤ 1 regeneración manual por libro;
- 0 fallos de seguridad o de propiedad intelectual;
- texto ≥ 4/5;
- ≥ 70 % de "sí lo regalaría".

---

## 6. Oferta y ventas

**Las 5 razones por las que hoy no se compra:**
1. No se ve ningún libro real.
2. Se promete "reconocible" con una foto que solo inspira los rasgos.
3. El regalo (impreso) cuesta dos pasos y 39,80 €.
4. Hay fricción y señales poco fiables en el pago: casilla legal, "créditos", etiquetas sin ventas.
5. No hay garantía ni se ve quién hay detrás.

**Oferta propuesta** (margen tras IVA del 4 %, Stripe, OpenAI ≈1,6 € y Bubok 10,65 €):

| Producto | Precio | Margen aprox. |
|---|---|---|
| **Impreso + PDF** (estrella, "el regalo"), un solo pago; no se imprime hasta que el cliente lo aprueba | **34,90 €** | ≈20 € |
| Solo PDF | 9,90 € | ≈7,5 € |
| Pasar al impreso teniendo ya el PDF | 25 € | ≈12,8 € |
| Copia extra del mismo libro (abuelos, tíos) | 19,90 € | ≈7,9 € |
| Segundo cuento digital tras comprar | 5,90 € | ≈4 € |

- **Fuera de la primera compra los packs de 2 y 4 libros** y los créditos.
- **Retirar LANZAMIENTO (−50 %):** deja el digital casi sin margen. En su lugar, "Precio fundador −20 % en los 50 primeros pedidos", aplicado automáticamente y con un contador real.
- **Garantía:** "Si una ilustración no te convence, la rehacemos gratis; si aun así no te gusta, te devolvemos el dinero del digital." En el impreso, reembolso completo hasta que lo apruebas para imprenta.
- **Comunicar el parecido con honestidad:** "un personaje inspirado en ella (pelo, ojos, piel), dibujado, no una foto".
- **Emails que faltan:**
  - portada al momento cuando dejan el email;
  - recordatorio con la garantía;
  - aviso de fecha límite de Navidad (5 de diciembre);
  - tras comprar el digital, el impreso al día siguiente;
  - petición de opinión a los 3 días;
  - recuperación de pagos abandonados en Stripe.
- **Copy del hero:** "Regala un cuento donde el héroe lleva su nombre", botón "Empezar su cuento gratis" y un campo de nombre dentro del propio hero.

**Primeras 10 ventas (sin anuncios):**
1. 5-6 libros reales de ejemplo y 2 muestras de Bubok para vídeo y fotos.
2. 30 WhatsApp personales con "precio fundador a cambio de tu opinión".
3. Grupos de Facebook de madres y padres por ciudad.
4. AMPAs (10 % para la asociación).
5. 3-5 libros impresos para microinfluencers de crianza, con reseña marcada como colaboración.
6. Meta Ads a 5-10 €/día solo cuando haya 3 testimonios reales, dirigidos a abuelos y al impreso.

Las páginas SEO no posicionarán antes de Navidad.

---

## 7. Plan por oleadas

| Oleada | Contenido | Por qué en este orden |
|---|---|---|
| **1. Que funcione en móvil** (1-2 días) | B1-B8, el lenguaje sin créditos, el error de "inicia sesión" que no funciona, pasos de generación en vertical y quitar las etiquetas "Popular"/"Más elegido" | Hoy se puede pagar sin ver el libro |
| **2. Calidad del motor** (1-2 días) | Q1-Q4, Q7-Q9 (todos S) + gpt-image-2 configurable sin `input_fidelity` + banco de pruebas con libros completos y foto | Antes de generar los libros de ejemplo, que serán el escaparate |
| **3. Despliegue y libros reales** | Desplegar en AWS, ejecutar el banco con OpenAI, generar 5-6 ejemplos, marcar `showcase`, muestra de Bubok y vídeo | Prueba visible para vender |
| **4. Oferta** (1-2 días) | Pack Impreso + PDF 34,90 €, garantía, precio fundador, emails, recuperar libros por email, copia extra | Sube el margen y quita objeciones |
| **5. Rediseño** (3-5 días) | Asistente a pantalla completa en móvil + tema claro y cálido + pantalla de éxito + edición simplificada + Q5, Q6, Q10, Q11 | Es lo de más esfuerzo; se apoya en lo anterior |

**Decisiones pendientes del dueño:** pack Impreso + PDF a 34,90 € y su relación con los 29,90 € del impreso suelto; retirar LANZAMIENTO a favor del precio fundador; la garantía; y el cambio a tema claro.

---

## 8. Estado de ejecución (02/10/2026, sin desplegar)

Decisiones aprobadas por el dueño: pack Impreso + PDF como producto principal, precio fundador −20 % automático (fuera LANZAMIENTO), garantía, tema claro.

| Oleada | Estado |
|---|---|
| 1. Funciona en móvil | ✅ Visor en página completa en móvil, ilustración lanzada desde el webhook (no depende de volver de Stripe), enlace privado `/libro/{id}?t=` en todos los emails, sin banner de cookies, botones de compra siempre visibles y activos, pantalla de "listo" con descarga e impreso, sin "créditos" en la interfaz |
| 2. Calidad del motor | ✅ Q1-Q11: referencias mapeadas y protagonista primero, estilos sin marcas ni bocadillos, `timeOfDay`, foto preservada, regeneración v2 moderada, portada high como ancla, filtro de PI, género y edad, límites de palabras, prompts literarios por edad, control por visión con reintentos. Tras los vídeos de referencia: el control también comprueba que la imagen cuadra con la escena, elementos sobrantes y saturación; estilo "realista" sin fondos fotográficos |
| 3. Despliegue y libros reales | ⏳ Pendiente (necesita el despliegue y la clave de OpenAI para `scripts/eval-engine.ts --full`) |
| 4. Oferta | ✅ Pack 34,90 € con envío y aprobación antes de imprimir, PDF 9,90 €, pasar a papel 25 €, copias extra 19,90 €, otro cuento 5,90 €, precio fundador con contador real (`/api/offer`), garantía con 3 dibujos rehechos gratis, emails (portada al dejar el email, "ilustrando" con enlace, oferta del impreso, opinión), recuperar cuentos por email (`/mis-libros`), borrado de borradores a los 12 meses |
| 5. Rediseño | ✅ Asistente de 3 pasos, revelación con acciones fijas, hoja de compra de un solo botón, tema claro y cálido (Nunito + Fraunces), landing y legales reescritos |

**Coste estimado por libro tras las mejoras:** ≈2,3-2,5 $ (gpt-image-1, calidad medium, portada high, control de calidad). Portada de muestra gratis ≈0,40-0,65 $ (tope diario `FREE_PREVIEW_DAILY_LIMIT=60`).
