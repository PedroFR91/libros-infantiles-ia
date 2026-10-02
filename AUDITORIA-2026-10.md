# Auditoría y plan de relanzamiento — LibrosIA (02/10/2026)

> **Objetivo:** pasar de "funciona" a "vende". Primera venta real esta semana, libro impreso en 2-3 semanas.
> **Estado de partida:** compra de prueba en TEST correcta en `libros.iconicospace.com` (AWS, código de enero).
> 0 € facturados. Ninguna venta real todavía.

---

## 1. Resumen en 30 segundos

| Área | Estado | Problema principal |
|---|---|---|
| **Embudo de compra** | 🔴 Roto | Tras pagar, el borrador desaparece (`success_url` sin `bookId`). El usuario paga y vuelve a un editor vacío |
| **Calidad de historia** | 🟠 Básica | Una sola pasada con `gpt-4o-mini`. Sin arco narrativo, sin personajes secundarios ni escenarios fijos. Sin revisión de continuidad |
| **Consistencia visual** | 🟠 Parcial | Solo el protagonista tiene referencia. Mascotas, amigos y lugares cambian en cada página. La referencia es un retrato con fondo blanco pasado a `images.edit` |
| **Preview antes de pagar** | 🔴 No hay | Lo gratis es solo texto. Lo que se vende (la ilustración) no se ve hasta pagar |
| **Espera** | 🔴 4-10 min | 13 imágenes dentro de **una petición HTTP**. Barra de progreso falsa. Sin email al terminar |
| **Calidad de impresión** | 🔴 No apto | Imágenes de 1024 px = ~128 dpi en 20 cm (la imprenta pide 300). Sin cubierta con lomo. Helvetica estándar |
| **Móvil** | 🔴 | Por debajo de 1024 px el formulario está escondido tras un icono sin texto |
| **Legal y confianza** | 🟠 | Aviso legal sin titular/NIF. Foto de menores a OpenAI sin mencionarlo en privacidad. Sin consentimiento de desistimiento |
| **Medición** | 🔴 Ciega | Sin analítica, sin emails transaccionales, sin email del comprador anónimo |
| **Margen** | 🟢 Bueno | Coste ≈0,60 € por libro (OpenAI). A 4,99 € queda ≈3,20 € de margen; a 9,90 €, ≈7,20 € |

**Conclusión:** el producto técnico existe y cobra, pero el embudo pierde al cliente justo al pagar y no enseña lo que vende. Hay que arreglar eso **antes** de mejorar la IA. Las mejoras de historia y personajes son importantes, pero ningún cliente las verá si el embudo no funciona.

---

## 2. Flujo actual (real, paso a paso)

1. Landing (`src/app/page.tsx`). Todos los CTA van a `/editor`. Ningún libro real. El hero es un emoji. "Ver demo" baja a "Cómo funciona".
2. Editor (sin cuenta, con cookie `sessionId`). Nombre + tema libre + estilo + foto opcional (analizada con `gpt-4o`).
3. "Crear historia (GRATIS)" genera solo el texto (12 páginas, `gpt-4o-mini`).
4. Ventana "¡Historia lista!" (`DraftBookOverlay`): 12 páginas de texto con "Ilustración pendiente".
5. "Generar ilustraciones (5 créditos)": **desactivado** si no hay créditos → modal de packs → Stripe.
6. Vuelta a `/editor?success=true` → **el borrador ya no está** (solo vivía en el estado de React).
7. Si lo recupera: 13 imágenes en serie (4-10 min) en una sola petición HTTP.
8. Descarga del PDF digital o del de imprenta. `/perfil` solo funciona con sesión iniciada.

Hasta el primer libro: unos 10-12 clics, 2 esperas y un paso roto tras el pago.

---

## 3. Los 10 problemas que más frenan la venta

| # | Problema | Evidencia | Arreglo | Esfuerzo |
|---|---|---|---|---|
| 1 | El borrador se pierde tras pagar | `checkout/route.ts:158` sin `bookId`. `canceled` no se trata (`editor/page.tsx:133`) | Mandar `bookId` y volver a `/editor?bookId=X&autogen=1`, que genera solo | S |
| 2 | El botón de compra está desactivado justo en el momento de máxima intención | `DraftBookOverlay.tsx:188` | "Desbloquear ilustraciones – 9,90 €" abre el checkout directamente | S |
| 3 | No se ve ninguna imagen antes de pagar | Lo gratis es solo texto | **Portada gratis** con marca de agua a cambio del email (coste ≈0,09 €; genera el lead) | M |
| 4 | El formulario no se ve en móvil | `page.tsx:752-756, 843-855, 1219` | En móvil, formulario en la pantalla principal | S/M |
| 5 | Espera de 4-10 min con progreso falso | `generate-images/route.ts:333`. Barra que sube +3 cada 2 s (`page.tsx:383-391`) | Cola en segundo plano, progreso real por página, imágenes que aparecen según salen, email al terminar | M/L |
| 6 | La landing no tiene prueba de nada | Sin ejemplos, testimonios, FAQ ni imagen OG. "Powered by AI" en inglés, precios "€4.99" | 3 libros reales hojeables, PDF de muestra, FAQ, OG, enfoque regalo (cumpleaños, Reyes) | M |
| 7 | Sin analítica ni emails | `cookies/page.tsx:161`. Resend solo para el login | Plausible/Umami sin cookies. Guardar `customer_details.email`. Emails de "libro listo" y "tu borrador te espera" | M |
| 8 | Se pierden libros y créditos | `auth.ts:45` solo traspasa si hay créditos. El cron de atascados no devuelve créditos (`cron/fix-stuck-books:44`). Un ERROR aparece como "✅ completado" | Traspasar siempre. Devolver créditos en el cron. Estado ERROR con "Reintentar" | S |
| 9 | Legal y confianza | Aviso legal sin NIF ni domicilio (LSSI art. 10). Sin consentimiento de desistimiento digital (TRLGDCU 103.m). Foto de menores sin aviso | Datos fiscales. `consent_collection` o casilla en el checkout. "La foto no se guarda" junto a la subida y en la política de privacidad | S |
| 10 | Créditos confusos; regenerar machaca el texto editado | `page.tsx:558`, `regenerate/route.ts:42`. TextCustomizer no guarda (TODO en `page.tsx:665`) | Vender "1 libro", no créditos. Regenerar solo la imagen. Guardar la personalización | S/M |

---

## 4. Motor de historia, personajes y escenarios: rediseño

### Qué falla hoy (`src/lib/openai.ts`)
- **Una sola llamada** a `gpt-4o-mini` escribe la historia y los prompts de imagen a la vez. No hay plan narrativo ni revisión.
- **El LLM redacta los `imagePrompt` a mano.** El código solo comprueba que empiecen por los primeros 30 caracteres del `characterSheet`. La consistencia depende de que el modelo copie bien.
- **Solo existe el protagonista.** Un perro, un amigo o un dragón se describen de nuevo en cada página → cambian de raza, color o tamaño.
- **No hay escenarios fijos.** "El bosque" de la página 3 y el de la página 8 son dos bosques distintos.
- **La página 1 es la portada** y se come una de las 12 páginas de historia.
- **Sin franja de edad.** El mismo texto para 3 que para 8 años.
- **La referencia del personaje** es un retrato de cuerpo entero con fondo blanco pasado como imagen a *editar* (`images.edit`). Tiende a heredar la composición y a no respetar bien la cara.
- **La foto del niño** solo se convierte en texto (`analyze-photo`). La imagen real no se usa como referencia visual, así que el parecido es pobre.
- **Las imágenes pueden contener texto** (letras deformes), porque no se prohíbe en el prompt.

### Diseño propuesto: "Biblia del libro" + composición por código

**Paso 1: la biblia** (un modelo de texto de gama alta, una llamada, JSON con esquema estricto). El coste sigue siendo de céntimos.
```
{
  edad: "3-4" | "5-6" | "7-8",          // controla longitud, vocabulario y estructura
  valor: "valentía" | "amistad" | ...,   // la moraleja, elegida o inferida
  personajes: [                          // protagonista + 0-2 secundarios, con ficha FIJA
    { id: "prota", nombre, rasgos_fisicos, ropa, accesorio_icono, paleta },
    { id: "luna", tipo: "perrita", raza, color, collar, tamaño }
  ],
  escenarios: [                          // 3-4 lugares con descripción FIJA
    { id: "casa", descripcion, momento_del_dia, paleta },
    { id: "bosque", ... }
  ],
  arco: [12 beats: planteamiento → problema → 3 intentos → clímax → resolución → cierre cálido]
}
```

**Paso 2: las páginas.** Cada página dice qué personajes aparecen (`ids`), en qué escenario (`id`), la acción, el plano (general, medio o primer plano) y el texto.

**Paso 3: revisión de continuidad.** Otra llamada hace de editor: nombres, objetos que aparecen y desaparecen, ropa, hora del día, longitud de texto por edad y tono. Devuelve las correcciones.

**Paso 4: el prompt de imagen lo compone el código, no el LLM.** Es la ficha literal de cada personaje presente, más la del escenario, la acción, el plano, el estilo y "sin texto ni letras en la imagen". La consistencia pasa a estar garantizada por construcción.

**Imágenes:**
- **Hojas de referencia** del protagonista **y de cada secundario**. Si hay foto, el protagonista se genera **a partir de la foto**, con consentimiento parental y sin guardarla después.
- **Varias referencias por página:** solo los personajes que aparecen en esa escena. Se pide el máximo de fidelidad de entrada que ofrezca el modelo y se prueba el modelo de imagen más reciente disponible.
- **Portada aparte**, con más calidad y hueco para el título, que se pone por código y no se dibuja.
- **Reescalado ×3 para impresión** (de 1024 a unos 3000 px) con un modelo de upscaling (Real-ESRGAN o similar). Solo se aplica a los libros que se imprimen.

**Estructura del libro:** portada · "Este libro pertenece a…" · dedicatoria (escrita por quien regala) · 12-14 páginas de historia · página final · ficha del protagonista o página para colorear · colofón con tus datos (el reglamento GPSR lo exige para el impreso). En impreso se llega a las 24-30 páginas que piden las imprentas.

**Tipografía:** fuente infantil incrustada (OFL: Andika, Nunito o Baloo) con `fontkit`, que ya está en las dependencias. Hoy se usa Helvetica estándar.

**Seguridad:** pasar la moderación al tema libre y al nombre antes de generar.

**Coste estimado del nuevo motor:** ≈0,90-1,20 € por libro digital (más referencias y la revisión de continuidad). El upscaling del impreso suma unos céntimos. Sigue siendo un margen alto a 9,90 €.

### Cómo comprobar que mejora (no a ojo)
- Un conjunto fijo de 10 casos de prueba (edades, temas, con y sin foto, con mascota).
- Generar libros con el motor viejo y con el nuevo y puntuar del 1 al 5 tres cosas: parecido del protagonista entre páginas, consistencia de secundarios y escenarios, y calidad del texto.
- No pasar el motor nuevo a producción si no gana en las tres.

---

## 5. Impresión física y envío

### Proveedor recomendado
| | **Gelato (principal)** | **Prodigi (alternativa)** |
|---|---|---|
| Formato | Tapa dura 8×8" (20,3 cm) | Tapa dura 21×21 cm |
| Páginas mínimas | **30 interiores** | 24 |
| Producción | ~19 $ a precio de lista; ~12 $ con Gelato+ (desde 19,99 $/mes) | Solo con cotización (endpoint Quote); 12-18 € estimado |
| Envío a España | Imprime en la UE; 3-4 días | Labs en la UE; 6-9 días |
| API | REST + webhooks con tracking. Sin sandbox (pedidos `draft`) | REST + **sandbox gratis** + `callbackUrl` |
| Marca blanca | Embalaje neutro; insertos propios con Gelato+ | Sí, con albarán propio por pedido |
| PDF | Un PDF: cubierta+lomo, interiores, sangrado 4 mm, PDF/X-4 | Sin sangrado (lo añaden ellos), margen de seguridad 10 mm, lomo calculado por API |

Fuentes: documentación de Gelato y Prodigi (consultadas el 02/10/2026). **Antes de decidir, pide cotización real a los dos y encarga 1 muestra física de cada uno.**

### Precio y margen (estimado)
- **Libro impreso: 39,90 € con envío incluido.** Coste ≈22,5 € (producción ≈16,5 € + envío ≈6 €). Margen ≈15 €.
- **Pack PDF + impreso: 44,90 €** (upsell en la página de "libro listo").
- Referencia de mercado: los libros personalizados impresos de la competencia rondan los 30-40 €. Está sin verificar; compruébalo mirando 3 competidores antes de fijar el precio.

### Legal
- **IVA:** en España, el 4 % se aplica al libro impreso **y también al electrónico** (art. 91.Dos.1.2º de la Ley 37/1992). El riesgo es que Hacienda trate el personalizado como fotolibro (21 %). **Consúltalo con un asesor** antes de fijar los precios.
- **Desistimiento:** no aplica a productos personalizados (art. 103.c TRLGDCU). En el digital hace falta consentimiento expreso (103.m): casilla en el checkout.
- **Garantía:** 3 años en bienes. Los defectos de impresión son responsabilidad tuya: pide a la imprenta reimpresión por defecto.

### Integración, en dos fases (lean)
**Fase A: validar sin programar la API (primeros ~10 pedidos).**
1. Producto "Libro impreso" en Stripe Checkout con `shipping_address_collection` (ES y PT) y `shipping_options` fijo.
2. El webhook guarda el pedido con la dirección y te avisa por email.
3. Generas el PDF de impresión (nuevo formato con sangrado y cubierta) y **lo subes a mano** al panel de Gelato.
4. Envías el tracking al cliente a mano.

**Fase B: automatizar (cuando haya demanda real).**
1. Modelo `PrintOrder` (estado, dirección, proveedor, `providerOrderId`, `trackingUrl`).
2. Generación de los PDFs de interior y cubierta a 300 dpi con el reescalado y subida a S3 con URL firmada.
3. `POST` a la API del proveedor con clave de idempotencia.
4. Webhook del proveedor → estado → email con tracking (Resend).
5. Panel de admin con pedidos en error y botón de reintento.

---

## 6. Precios propuestos (hipótesis: validar con las primeras ventas)

| Producto | Precio | Margen aprox. |
|---|---|---|
| Portada de muestra | Gratis (a cambio del email) | −0,09 € (coste de lead) |
| Libro digital (PDF + 3 regeneraciones) | **9,90 €** (4,99 € como cupón de lanzamiento) | ≈7,20 € |
| Pack 2 libros digitales | 16,90 € | ≈12 € |
| Libro impreso (tapa dura, envío incluido) | **39,90 €** | ≈15 € |
| Digital + impreso | 44,90 € | ≈19 € |

Fuera los créditos como unidad de venta: el cliente compra **un libro**. Los créditos pueden seguir existiendo por dentro para las regeneraciones.

---

## 7. Plan por fases

> Regla de oro: cada fase termina en algo que **se puede vender**, no en código.

### Fase 0: que se pueda vender (1-2 días)
- [ ] Desplegar en el AWS la imagen nueva (arreglos de Stripe y `/api/health`), con volúmenes para PDFs e imágenes
- [x] Problemas 1, 2, 4, 8 y 10 (embudo, botón de compra, móvil, créditos perdidos, regenerar). *Pendiente de esta lista: guardar la personalización de texto (TODO de TextCustomizer)*
- [x] Problema 9: consentimiento en el checkout y aviso sobre la foto. NIF y domicilio se leen de `LEGAL_*` en el `.env` (falta rellenarlos)
- [x] Precio por libro (9,90 € / 16,90 € / 29,90 €) y código `LANZAMIENTO` (-50 %) creado en Stripe TEST (falta crearlo en LIVE)
- [x] Umami (vía `ANALYTICS_*`, falta crear la cuenta) + email del comprador en `Payment.customerEmail`. Recibos: activarlos en el Dashboard de Stripe
- [ ] Claves LIVE, webhook LIVE y una compra real tuya
- **Salida:** mandar el enlace a 10 personas conocidas con hijos o sobrinos. Objetivo: 3 ventas.

### Fase 1: el producto que enamora (5-7 días)
- [x] Motor nuevo: biblia, secundarios, escenarios, revisión de continuidad y prompts compuestos por código (`src/lib/story/engine.ts`, modelo configurable con `STORY_MODEL`)
- [x] Referencias múltiples por página (solo los personajes de la escena) y referencia desde la foto, que solo vive en memoria
- [x] Generación en segundo plano (3 en paralelo) con progreso real, páginas que aparecen al vuelo y email de "libro listo" (`src/lib/generation.ts`)
- [x] Portada de muestra gratis con marca de agua (tope 3/usuario/día y `FREE_PREVIEW_DAILY_LIMIT` global), email opcional en el borrador y recordatorio a las 24-72 h desde el cron
- [x] Nueva estructura (portada, ex libris, dedicatoria, 12 páginas, fin, ficha del protagonista, página de dibujo, colofón) con Andika y Sniglet (OFL)
- [x] Banco de 10 casos: `scripts/eval-engine.ts` (pendiente: ejecutarlo con la clave de OpenAI y puntuar)
- **Salida:** 3 libros de ejemplo reales para la landing.

### Fase 2: libro impreso (paralelo a la Fase 1, ~3-4 días)
- [ ] Cotización en Gelato y Prodigi, y muestra física de cada uno
- [x] PDF de impresión: 300 ppp con reescalado (sharp o Replicate), 30 páginas, cubierta con lomo, sangrado configurable con `PRINT_*`. *No es PDF/X certificado: validar con la muestra física*
- [x] Producto impreso en Stripe con dirección y envío, pedido en el panel de admin con descarga de interior y cubierta (fase A manual)
- [ ] Automatizar la API cuando lleguen los primeros ~10 pedidos (Fase B)
- **Salida:** campaña "Regálalo por Navidad / Reyes". **Fechas límite de pedido** visibles: la campaña de Navidad es la gran oportunidad del año.

### Fase 3: tráfico (continuo)
- [x] Landing con FAQ, imagen OG, enfoque de regalo y sección de ejemplos que se rellena al marcar libros como "ejemplo" en el admin (faltan los libros reales)
- [x] 14 páginas SEO por tema y ocasión en `/cuentos`
- [ ] Contenido corto en redes: vídeo hojeando el libro impreso real
- [x] Panel de admin con embudo, margen estimado y pedidos impresos

---

## 8. Riesgos

- **Construir sin vender** (patrón documentado en el plan maestro). Mitigación: la Fase 0 sale a la venta antes de empezar la Fase 1, y la Fase 2 empieza manual.
- **Fotos de menores:** RGPD (datos de menores; OpenAI como encargado del tratamiento). Hace falta consentimiento parental explícito, no guardar la foto, mencionarlo en la política de privacidad y en el registro de actividades, y ofrecer el modo sin foto.
- **IVA del personalizado:** confirmarlo con un asesor.
- **El servidor AWS está compartido con clientes** y el disco al 88 %: libros debería acabar en su propio servidor (el Hetzner ya preparado) cuando migre editorial.
- **Calidad de impresión:** sin muestra física no se lanza el impreso.
