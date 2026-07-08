# LandBrokers — CLAUDE.md
## Instrucciones para Claude Code

---

## QUIÉN SOY Y QUÉ ESTAMOS HACIENDO

Soy Gueremy Barrientos, developer del proyecto LandBrokers.
Eres mi arquitecto técnico y pair programmer. Trabajamos en español siempre.

LandBrokers es la plataforma web de la empresa matriz de Joan Sandoval —
una firma inmobiliaria boutique enfocada en proyectos rurales en Chile.
El objetivo del sistema es que Joan pueda **mostrar, agregar, editar y
quitar proyectos inmobiliarios sin tocar código** y reciba las consultas
de clientes en un panel privado.

Este proyecto es SEPARADO de TerraTokenX. No se mezclan.
TerraTokenX es tokenización (RWA + blockchain). LandBrokers es un catálogo
inmobiliario con panel admin. No traer lógica de uno al otro.

---

## ESTADO ACTUAL DEL PROYECTO (actualizado 2026-07-08)

- **Landing page (Hito 1): YA EXISTE y está publicada en landbrokers.cl.**
  OJO: la versión EN PRODUCCIÓN aún es la vieja (proyectos hardcodeados).
  La versión del repo (`landing/`) ya es la dinámica; reemplaza a la vieja
  cuando se haga el deploy (2.8).
- **Sistema de gestión (Hito 2): CÓDIGO COMPLETO (2.1 → 2.7)** en la rama
  `claude/repo-setup-database-mhgb8x`. Falta SOLO 2.8 (deploy) y los pasos
  manuales de Gueremy: SQL en Supabase (orden OBLIGATORIO en
  `api/supabase/README.md`: schema → seed → mejoras), bucket `proyectos`
  público en Storage, hash bcrypt en seed.sql, y el `.env`.
- **Fichas Puntra/Patagonia migradas (Hito 3): NO existe todavía.**
- **Feature "Propiedades en Remate": TERMINADA en `feature/remates`, SIN
  mergear.** Cotizada aparte ($180.000). NO mergear hasta aprobación y pago
  del cliente. Tiene su propia migración `api/supabase/remates.sql`.
- **Keep-alive Supabase free:** existe `.github/workflows/keepalive.yml`,
  pero GitHub apaga los crons tras 60 días sin commits. El mecanismo
  principal debe ser UptimeRobot → `/api/proyectos` (instrucciones en el yml).

### Lo que la landing ya tiene hoy (revisado en vivo)
- Hero + Sobre Landbrokers + Propuesta de valor (6 tarjetas)
- Sección Liderazgo (Joan Sandoval)
- Servicios + Proceso de trabajo (5 pasos)
- **Sección "Proyectos Estructurados"** ← AQUÍ van los proyectos
- CTA final + footer
- Botones a WhatsApp (+56 9 8247 0858) y Google Calendar (agendar)

### El problema que resuelve este proyecto
Hoy la sección "Proyectos Estructurados" tiene los proyectos
**hardcodeados en el HTML**. Para agregar uno nuevo hay que editar el
código a mano. Joan dijo textual: *"sin propiedades no la puedo usar"*.
La solución NO es escribir más HTML a mano — es hacer que esa sección
**se cargue dinámicamente desde una base de datos** que Joan controla
desde un panel admin.

---

## STACK TÉCNICO (definido en la propuesta)

```
Frontend landing:  HTML/CSS/JS estático (ya existe en landbrokers.cl)
Backend:           Node.js + Express
Base de datos:     Supabase (PostgreSQL gestionado)
Auth:              JWT (login admin)
Deploy:            Hostinger (Opción A: cuenta de Joan / Opción B: slot de Gueremy)
SSL:               https obligatorio
```

**DESCARTADOS — fuera de alcance (NO construir):**
- Sistema de pagos online
- Registro de usuarios / compradores
- Tokenización (eso es TerraTokenX)
- Chat en tiempo real
- Emails automáticos al recibir leads
- Múltiples usuarios admin
- Blog / noticias
- App móvil nativa
- Versión en inglés u otro idioma

Si aparece una petición fuera de este alcance → se cotiza aparte a
$15.000 CLP/hora, por escrito, aprobada y pagada ANTES de empezar.

---

## ARQUITECTURA OBJETIVO

```
landbrokers.cl (landing estática)
        │
        │  fetch() a la API pública
        ▼
┌─────────────────────────────┐
│   API Node.js + Express     │
│                             │
│   /api/proyectos            │ ← pública (listado para la landing)
│   /api/proyectos/:slug      │ ← pública (detalle / ficha)
│   /api/leads                │ ← pública (POST formulario contacto)
│                             │
│   /admin/login              │ ← auth JWT
│   /admin/proyectos  (CRUD)  │ ← protegida
│   /admin/leads      (ver)   │ ← protegida
└──────────────┬──────────────┘
               │
               ▼
        ┌─────────────┐
        │  Supabase   │
        │             │
        │  proyectos  │
        │  imagenes   │
        │  leads      │
        │  admin_user │
        └─────────────┘
```

La landing deja de tener proyectos hardcodeados: la sección "Proyectos
Estructurados" pasa a renderizarse desde `/api/proyectos`.

---

## MODELO DE DATOS (Supabase — 5 tablas)

### proyectos
```
id            uuid PK
slug          text unique        ← para URL propia (/proyecto/refugio-patagonia)
nombre        text
ubicacion     text               ← ej "Patagonia Chilena / Puerto Aysén"
descripcion   text               ← texto largo de la ficha
estado        text               ← 'activo' | 'vendido' | 'proximamente'
gps_lat       numeric            ← para el mapa
gps_lng       numeric
url_externa   text nullable      ← link a refugiopatagonia.cl si lo tiene
orden         int                ← para ordenar las tarjetas
created_at    timestamptz
updated_at    timestamptz
```

### proyecto_imagenes
```
id            uuid PK
proyecto_id   uuid FK → proyectos
url           text               ← URL de la imagen (Supabase Storage)
orden         int
es_portada    bool               ← la que sale en la tarjeta
```

### proyecto_features  (las "tarjetas de beneficios" de cada proyecto)
```
id            uuid PK
proyecto_id   uuid FK → proyectos
titulo        text               ← ej "DOBLE MAR: PACÍFICO + MAR INTERIOR"
descripcion   text
orden         int
```

### leads
```
id            uuid PK
proyecto_id   uuid FK → proyectos nullable
nombre        text
email         text
telefono      text
mensaje       text
created_at    timestamptz
leido         bool               ← para marcar en el panel
```

### admin_user
```
id            uuid PK
email         text unique
password_hash text               ← bcrypt
created_at    timestamptz
```

> Nota: un solo admin (Joan). No multi-usuario. La tabla existe para no
> hardcodear credenciales y poder cambiar la clave.

---

## PLAN DE TRABAJO — ORDEN ESTRICTO

Regla de oro: **no se empieza un Hito hasta que el anterior esté pagado.**
Hito 1 (landing) ya entregado, pendiente de pago. Hito 2 NO arranca hasta
que el pago del Hito 1 esté acreditado.

---

### ✅ HITO 1 — Landing Page — $100.000 (ENTREGADO, pendiente pago)

Ya está hecho y publicado. Lo único que queda dentro de este hito son los
**ajustes menores** que Joan pida tras revisarla formalmente (es razonable,
nunca la revisó). Ajustes de copy, imágenes, orden de secciones → entran acá.
Cualquier cosa que sea "cargar propiedades / panel / login" NO es Hito 1.

**Entregable:** landbrokers.cl aprobada por Joan.
**Gate de pago:** $100.000 acreditados antes de tocar el Hito 2.

---

### 🔨 HITO 2 — Sistema de Gestión — $240.000 (NO arrancar sin pago H1)

Orden interno de construcción:

**2.1 — Fundación backend + base de datos**
- [x] Proyecto Node.js + Express inicializado
- [x] Conexión a Supabase configurada (.env, nunca hardcodear keys)
- [x] Las 5 tablas creadas en Supabase con sus relaciones
- [x] Seed inicial con los 2 proyectos actuales (Patagonia + Puntra)
      copiando el contenido que hoy está hardcodeado en la landing
- **Entregable:** base de datos viva con los 2 proyectos cargados

**2.2 — Autenticación admin**
- [x] Endpoint `POST /admin/login` con JWT
- [x] Hash de password con bcrypt
- [x] Middleware de protección para rutas `/admin/*`
- [x] Página `landbrokers.cl/admin` con login
- **Entregable:** Joan entra a /admin con usuario y contraseña

**2.3 — API pública (lo que consume la landing)**
- [x] `GET /api/proyectos` → listado (solo activos/vendidos/próximamente)
- [x] `GET /api/proyectos/:slug` → detalle con imágenes y features
- [x] CORS configurado para landbrokers.cl
- **Entregable:** la API responde JSON con los proyectos

**2.4 — API admin protegida (CRUD)**
- [x] `POST /admin/proyectos` → crear
- [x] `PUT /admin/proyectos/:id` → editar
- [x] `DELETE /admin/proyectos/:id` → eliminar
- [x] Subida de imágenes a Supabase Storage
- [x] Cambiar estado: activo / vendido / próximamente
- **Entregable:** se puede crear/editar/borrar un proyecto vía API

**2.5 — Panel admin (interfaz visual)**
- [x] Vista lista de proyectos con botones editar/eliminar
- [x] Formulario crear/editar proyecto (todos los campos + imágenes + features)
- [x] Vista de leads recibidos (con marcar como leído)
- **Entregable:** Joan gestiona todo desde una interfaz, sin tocar código

**2.6 — Formulario de contacto + leads**
- [x] `POST /api/leads` desde la landing (cada ficha)
- [x] Lead se guarda en la tabla `leads`
- [x] Aparece en el panel admin
- **Entregable:** las consultas de clientes llegan al panel

**2.7 — Integrar landing con la API (lo que cierra el círculo)**
- [x] Reemplazar la sección "Proyectos Estructurados" hardcodeada
      por un `fetch('/api/proyectos')` que renderiza las tarjetas
- [x] Las tarjetas linkean a la ficha individual por slug
- **Entregable:** agregar un proyecto en el panel → aparece solo en la web

**2.8 — Deploy**
- [ ] Backend desplegado en Hostinger
- [ ] SSL/https activo
- [ ] Variables de entorno en producción (no en el repo)
- [ ] Landing apuntando a la API de producción
- **Entregable:** landbrokers.cl funcionando al 100% con sistema vivo

**Gate de pago Hito 2:** $240.000 acreditados antes del Hito 3.

---

### 🔨 HITO 3 — Fichas Puntra y Patagonia — $120.000 (NO arrancar sin pago H2)

- [ ] Ficha individual Refugio Puntra: URL propia (slug) + galería + mapa GPS + formulario
- [ ] Ficha individual Refugio Patagonia: URL propia + galería + mapa GPS + formulario
- [ ] Migrar el contenido real de ambos (texto, imágenes, features)
- [ ] Cada ficha compartible por WhatsApp con su URL
- **Entregable:** las dos fichas publicadas y compartibles
- **Gate de pago:** $120.000 acreditados al entregar

> Ojo: hoy las tarjetas de Patagonia y Puntra en la landing linkean a
> dominios externos (refugiopatagonia.cl / refugiopuntrachiloe.cl). En el
> Hito 3 esas fichas pasan a vivir DENTRO de landbrokers.cl con slug propio
> (ej: landbrokers.cl/proyecto/refugio-patagonia). Confirmar con Joan si
> quiere mantener también los dominios viejos o consolidar todo acá.

---

## REGLAS DE TRABAJO

1. **No work before payment.** Hito N no arranca sin pago del Hito N-1 acreditado.
2. **Alcance cerrado.** Lo que no está en este .md se cotiza aparte ($15.000/hr).
3. **Nunca hardcodear secrets.** Supabase keys, JWT secret → siempre en .env.
4. **La landing es estática, no la sobre-ingenierar.** Solo la sección de
   proyectos se vuelve dinámica vía fetch. El resto queda como está.
5. **No mezclar con TerraTokenX.** Otro stack (Django), otro repo, otra DB.
6. **Garantía:** 30 días post entrega de cada hito (solo bugs, no features nuevas).
7. **Hosting:** confirmar con Joan Opción A (su Hostinger) u Opción B (slot
   de Gueremy, $25.000/mes). El código se despliega donde Joan elija.

---

## DATOS DEL PROYECTO

```
Cliente:        Joan Sandoval
Dominio:        landbrokers.cl (ya en producción)
WhatsApp:       +56 9 8247 0858
Agenda:         Google Calendar (link en la landing)
Presupuesto:    $460.000 CLP (3 hitos: $100k / $240k / $120k)
Plazo:          3-4 semanas part-time
Tarifa extra:   $15.000 CLP/hora (fuera de alcance, por escrito)
```

---

## PRIMER PASO DE CADA SESIÓN

1. Leer este .md completo.
2. **Leer `ESTADO.md`** — tiene el estado técnico exacto, el mapa de ramas
   (OJO: no hay rama `main`; la principal es `claude/repo-setup-database-mhgb8x`
   y `feature/remates` está cotizada aparte, SIN mergear), el checklist de lo
   que falta y el historial de decisiones.
3. Confirmar en qué Hito estamos y si el hito anterior está PAGADO.
4. Si el pago no está acreditado → NO escribir código. Avisar a Gueremy.
5. Si está acreditado → tomar la siguiente checkbox sin marcar del hito actual.
