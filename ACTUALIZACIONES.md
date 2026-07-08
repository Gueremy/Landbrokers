# ACTUALIZACIONES.md — Catálogo de módulos cotizables

> Propuestas de evolución para LandBrokers como plataforma de venta de parcelas.
> Tarifa base: **$15.000 CLP/hora**. Los precios son estimaciones de referencia
> para presentar a Joan — confirmar horas al cotizar formalmente.
>
> **Regla innegociable (CLAUDE.md):** nada de esta lista se construye sin
> aprobación POR ESCRITO y pago acordado ANTES de empezar. Referencia de
> escala: la feature Remates (versión simple) se cotizó en $180.000.
>
> Última actualización: 2026-07-08

---

## Resumen ejecutivo — qué conviene ofrecer y cuándo

| # | Módulo | Precio ref. | Impacto en ventas | Cuándo ofrecerlo |
|---|--------|-------------|-------------------|------------------|
| 1 | Notificación de leads | $75.000 | ⭐⭐⭐ | Ya — primer upsell natural |
| 2 | WhatsApp inteligente por proyecto | $30.000 | ⭐⭐⭐ | Ya — barato y visible |
| 3 | Inventario de lotes | $120.000 | ⭐⭐⭐ | Cuando Joan cargue su primer proyecto propio |
| 4 | Simulador de cuotas | $75.000 | ⭐⭐⭐ | Junto con inventario de lotes |
| 5 | Mapa interactivo del masterplan | $165.000 | ⭐⭐⭐ | Después del inventario (depende de él) |
| 6 | CRM liviano de leads | $105.000 | ⭐⭐ | Cuando lleguen >20 leads/mes |
| 7 | Documentos por proyecto | $60.000 | ⭐⭐ | Con el Hito 3 |
| 8 | Video / tour virtual | $45.000 | ⭐⭐ | Cuando Joan tenga el material |
| 9 | Panel de métricas | $75.000 | ⭐ | Post-deploy, con datos reales |
| 10 | Remates versión completa | $135.000 | ⭐⭐ | Solo si la versión simple se aprueba y funciona |
| 11 | Reserva de lotes online | $120.000 | ⭐⭐ | Requiere inventario de lotes |
| 12 | Multi-admin con roles | $90.000 | ⭐ | Solo si Joan contrata equipo |
| 13 | Testimonios gestionables | $45.000 | ⭐ | Relleno de pack, no vender solo |

**Ya cotizado, esperando aprobación:** Remates versión simple — $180.000
(rama `feature/remates`, terminada, sin mergear).

---

## Detalle por módulo

### 1. Notificación de leads — $75.000 (5 hrs) ⭐ EL PRIMER UPSELL

**El problema que resuelve:** hoy un comprador interesado puede esperar días
hasta que Joan abra el panel. En venta de terrenos el lead se enfría en horas.

**Incluye:**
- Email automático a Joan por cada lead nuevo (nombre, contacto, proyecto, mensaje)
- Servicio de envío (Resend o SMTP de Hostinger — gratis en estos volúmenes)
- Toggle en el panel para activar/desactivar
- Resumen diario opcional si prefiere no recibir uno por uno

**No incluye:** notificación por WhatsApp (la API de WhatsApp Business tiene
costo mensual de Meta y proceso de aprobación — cotizar aparte ~$90.000 + costos
de Meta si lo pide).

**Nota:** los "emails automáticos" están en la lista de descartados del alcance
original — esto es exactamente el tipo de cosa que se reabre con cotización.

---

### 2. WhatsApp inteligente por proyecto — $30.000 (2 hrs)

**El problema que resuelve:** todos los botones de WhatsApp del sitio mandan el
mismo mensaje genérico. Joan no sabe desde qué proyecto le escriben.

**Incluye:**
- Botón WhatsApp en cada tarjeta de proyecto con mensaje pre-armado:
  *"Hola, me interesa [Refugio Puntra — Chiloé], quisiera más información"*
- Lo mismo en las fichas del Hito 3 cuando existan

**Por qué venderlo:** es la mejora más barata del catálogo y Joan la VE
funcionando en 2 minutos. Ideal para generar confianza de compra de módulos.

---

### 3. Inventario de lotes — $120.000 (8 hrs) ⭐ LA BASE DE TODO

**El problema que resuelve:** hoy el sistema maneja "proyectos", pero Joan vende
**lotes**. No puede decir cuáles quedan, a qué precio, ni marcar uno como vendido.

**Incluye:**
- Nueva tabla `lotes`: número, superficie m², precio, estado
  (disponible / reservado / vendido), orientación, observaciones
- CRUD completo en el panel (agregar/editar lotes dentro de cada proyecto)
- En la landing/ficha: tabla de lotes disponibles con precio y superficie
- El contador "X de Y lotes disponibles" de las tarjetas pasa a calcularse solo
- El lead puede indicar qué lote le interesa (llega al panel con ese dato)

**Por qué es estratégico:** es el prerequisito del mapa interactivo (#5) y de
las reservas (#11). Sin inventario de lotes, esos módulos no existen.

---

### 4. Simulador de cuotas — $75.000 (5 hrs)

**El problema que resuelve:** en el mercado chileno de parcelas casi todo se
vende con pie + cuotas a plazo. El comprador quiere saber "¿cuánto pagaría al mes?"
antes de contactar — y hoy el sitio no se lo dice.

**Incluye:**
- Widget en cada ficha/tarjeta: precio del lote → slider de pie (%) y plazo
  (meses) → cuota mensual estimada
- Parámetros configurables por Joan desde el panel (pie mínimo, plazo máximo,
  tasa de interés o factor si aplica)
- Botón "Consultar por esta simulación" que envía los valores en el lead

**No incluye:** integración con bancos ni pre-aprobación crediticia (fuera de
alcance real de este software).

---

### 5. Mapa interactivo del masterplan — $165.000 (11 hrs) ⭐ EL DIFERENCIADOR

**El problema que resuelve:** el comprador de parcela compra UBICACIÓN dentro
del loteo. Un plano estático no deja explorar; esto convierte el masterplan en
la experiencia central de la ficha.

**Incluye:**
- Sobre la imagen del plano del loteo: polígonos clickeables por lote
  (SVG overlay — sin dependencias pagadas)
- Color por estado: verde disponible / amarillo reservado / gris vendido
  (lee del inventario #3 en tiempo real)
- Click en lote → popup con superficie, precio, botón "Consultar por este lote"
- Herramienta interna simple para que TÚ traces los polígonos una vez por
  proyecto (Joan no dibuja nada, solo cambia estados)

**Requiere:** módulo #3 (inventario de lotes) + el plano del loteo en buena
resolución por cada proyecto.

**Advertencia de alcance:** trazar los polígonos de cada proyecto NUEVO que
Joan agregue es trabajo manual (~1 hr por proyecto) — dejarlo cotizado como
servicio recurrente o enseñarle a un asistente.

---

### 6. CRM liviano de leads — $105.000 (7 hrs)

**El problema que resuelve:** con volumen, la tabla de leads se vuelve una lista
plana sin memoria. Joan no sabe a quién ya llamó ni quién está por cerrar.

**Incluye:**
- Estados del lead: nuevo → contactado → en negociación → cerrado / descartado
- Notas internas por lead (historial de llamadas/acuerdos)
- Filtros por estado y por proyecto + buscador
- Export CSV (para Excel o para migrar a un CRM real si el negocio crece)
- Contadores por estado en el panel

**No incluye:** automatizaciones, embudos, integraciones con CRMs externos.

---

### 7. Documentos por proyecto — $60.000 (4 hrs)

**El problema que resuelve:** el comprador serio pide plano, rol, factibilidad
de agua/luz, brochure. Hoy Joan los manda uno a uno por WhatsApp.

**Incluye:**
- Subida de PDFs por proyecto desde el panel (bucket privado o público según el doc)
- Sección "Documentos" en la ficha: brochure descargable público
- Opcional: documentos "bajo solicitud" que piden nombre+email antes de
  descargar → se convierte en lead automáticamente (captura de datos elegante)

---

### 8. Video y tour virtual — $45.000 (3 hrs)

**Incluye:**
- Campo video por proyecto (YouTube/Vimeo embed) en panel y ficha
- Soporte para tour 360 si Joan contrata uno (Matterport/Kuula embed)
- Video de fondo opcional en el hero de la ficha

**No incluye:** producción audiovisual (Joan pone el contenido).

---

### 9. Panel de métricas — $75.000 (5 hrs)

**Incluye:**
- Google Analytics 4 en landing y fichas (eventos: ver proyecto, click
  WhatsApp, enviar formulario)
- Pestaña "Métricas" en el panel: visitas por proyecto, leads por proyecto,
  tasa de conversión, evolución mensual (datos propios + GA)
- Argumento de venta para Joan: sabe qué proyecto genera interés real antes
  de decidir dónde invertir en marketing

---

### 10. Remates — versión completa — $135.000 (9 hrs)

**Solo tiene sentido si la versión simple ($180.000, ya construida) se aprueba,
paga y demuestra tracción.**

**Incluye (lo que quedó fuera de la versión simple):**
- Countdown en vivo hacia la fecha del remate en cada tarjeta
- Página dedicada `/remates` con todos los remates + compartible por WhatsApp
- Historial de remates pasados (adjudicados) como prueba social
- Aviso por email a Joan cuando un remate está por vencer sin adjudicar

**Sigue excluido:** pujas/ofertas online (eso es otra categoría de software,
con implicancias legales — no cotizar a la ligera).

---

### 11. Reserva de lotes online — $120.000 (8 hrs)

**El problema que resuelve:** el comprador decidido quiere "apartar" el lote
AHORA, no esperar a que Joan conteste.

**Incluye:**
- Botón "Reservar este lote" → formulario con datos del interesado
- El lote pasa a "reservado" por N horas/días (configurable) y se notifica a Joan
- Joan confirma o libera la reserva desde el panel; expiración automática
- Candado anti doble-reserva del mismo lote

**Requiere:** módulo #3. **No incluye:** pago del pie online (pagos siguen
explícitamente fuera de alcance — si Joan lo pide, es conversación mayor:
pasarela, boletas, SII).

---

### 12. Multi-admin con roles — $90.000 (6 hrs)

**Cuándo:** solo si Joan contrata asistente o socio. No ofrecer antes.

**Incluye:**
- Tabla de usuarios con roles: admin total / editor (proyectos, sin leads) /
  vendedor (leads, sin editar proyectos)
- Gestión de usuarios desde el panel + registro de quién modificó qué (log simple)

---

### 13. Testimonios gestionables — $45.000 (3 hrs)

**Incluye:** CRUD de testimonios en el panel (nombre, texto, foto opcional,
proyecto asociado) + carrusel en la landing. Prueba social barata. Venderlo
dentro de un pack, no solo.

---

## Packs sugeridos (con descuento por volumen)

| Pack | Módulos | Suma individual | Precio pack |
|------|---------|-----------------|-------------|
| **Pack Vendedor** | 1 + 2 + 4 (notificaciones, WhatsApp, simulador) | $180.000 | **$160.000** |
| **Pack Lotes** | 3 + 5 (inventario + mapa interactivo) | $285.000 | **$255.000** |
| **Pack Cierre** | 6 + 7 + 11 (CRM, documentos, reservas) | $285.000 | **$255.000** |

Estrategia sugerida: **Pack Vendedor** inmediatamente después de cobrar el
Hito 2 (es barato, impacto visible, abre la puerta). **Pack Lotes** cuando Joan
suba su primer proyecto administrado 100% por él. **Pack Cierre** cuando el
volumen de leads lo justifique.

---

## Costos operacionales (NO son desarrollo — traspasar a Joan)

| Ítem | Costo | Cuándo |
|------|-------|--------|
| Supabase Pro | ~USD 25/mes | Cuando el negocio dependa del sitio (sin pausas + backups diarios) |
| WhatsApp Business API | variable (Meta) | Solo si pide notificaciones por WhatsApp |
| Hosting Opción B | $25.000/mes | Si elige el slot de Gueremy |
| UptimeRobot | gratis | Post-deploy (obligatorio, ver ESTADO.md §6) |

---

## Qué NO proponer (aunque lo pida)

- **Pagos online / pasarela**: implica boletas, SII, responsabilidad sobre
  dinero de terceros. Si insiste, es un proyecto aparte con presupuesto propio,
  no un módulo.
- **Pujas de remate online**: implicancias legales de subastas. Derivar a
  plataformas especializadas.
- **App móvil nativa**: el sitio ya es responsive; una app no agrega nada a
  este volumen. Descartado en el alcance original y sigue sin tener sentido.
- **Tokenización**: eso es TerraTokenX. Nunca mezclar.
