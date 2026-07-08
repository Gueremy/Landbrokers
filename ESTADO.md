# ESTADO.md — Handoff completo del proyecto LandBrokers

> **Para Claude Code:** lee este archivo junto con `CLAUDE.md` al iniciar sesión.
> `CLAUDE.md` tiene las reglas de negocio y el plan por hitos; este archivo tiene
> el estado técnico exacto, el mapa de ramas/presupuestos y lo que falta.
> Última actualización: **2026-07-08** (sesión remota de Claude Code).

---

## 1. MAPA DE RAMAS Y DINERO — LEER PRIMERO

**En este repo NO existe rama `main`.** La rama principal de facto es
`claude/repo-setup-database-mhgb8x`.

| Rama | Qué contiene | Estado | Dinero asociado |
|------|--------------|--------|-----------------|
| `claude/repo-setup-database-mhgb8x` | TODO el Hito 2 (2.1→2.7) + correcciones de 2 auditorías + docs | ✅ Código completo, falta deploy (2.8) | Dentro de los $240.000 del Hito 2 |
| `feature/remates` | Sección "Propiedades en Remate" completa (DB+API+panel+landing) | ✅ Terminada, **SIN MERGEAR** | **$180.000 EXTRA — cotizada aparte. NO mergear hasta que Joan apruebe Y pague** |

**Regla crítica:** `feature/remates` se mantiene rebasada sobre la rama principal
(ya se hizo 2 veces). Cuando el cliente pague, el merge es:

```bash
git checkout claude/repo-setup-database-mhgb8x
git merge feature/remates
git push origin claude/repo-setup-database-mhgb8x
# y ejecutar api/supabase/remates.sql en Supabase (ver sección 5)
```

**Gates de pago (de CLAUDE.md, siguen vigentes):**
- Hito 1 ($100.000): entregado, **pago pendiente de acreditar**.
- Hito 2 ($240.000): código listo; se cobra al entregar 2.8 (deploy).
- Hito 3 ($120.000): no arrancar sin pago del Hito 2.
- Remates ($180.000): no mergear sin aprobación + pago.
- Fuera de alcance: $15.000/hr por escrito y pagado antes.

---

## 2. LO QUE ESTÁ CONSTRUIDO (rama principal)

### Estructura del repo
```
CLAUDE.md                    ← reglas de negocio + plan de hitos (leer siempre)
ESTADO.md                    ← este archivo
.github/workflows/keepalive.yml  ← cron diario anti-pausa de Supabase (ver §6)
api/
  .env.example               ← plantilla de variables (el .env real NUNCA va al repo)
  package.json               ← express, supabase-js, bcryptjs, jsonwebtoken, multer 2.x,
                               cors, dotenv, express-rate-limit
  src/index.js               ← server Express, CORS estricto, trust proxy
  src/db/supabase.js         ← cliente con SERVICE_KEY (bypassa RLS)
  src/middleware/auth.js     ← verifica JWT Bearer en /admin/*
  src/routes/public.js       ← endpoints públicos
  src/routes/admin.js        ← endpoints protegidos
  supabase/README.md         ← ⚠️ ORDEN OBLIGATORIO de los SQL
  supabase/schema.sql        ← 5 tablas base
  supabase/seed.sql          ← 2 proyectos reales + admin (hash placeholder)
  supabase/mejoras.sql       ← campos comerciales + RLS (OBLIGATORIO, ver §5)
landing/
  index.html                 ← landing completa, sección proyectos DINÁMICA + form contacto
  script.js                  ← fetch a la API, render de tarjetas, envío de leads
  style.css                  ← estilos originales del Hito 1 (no tocados)
  assets/                    ← imágenes (founder, hero, logo, sando)
  admin/index.html           ← panel admin completo (una sola página autocontenida)
```

### API — endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | no | ping del server (NO toca la DB) |
| GET | `/api/proyectos` | no | listado con portada, features, campos comerciales |
| GET | `/api/proyectos/:slug` | no | detalle completo (imágenes, features, GPS) |
| POST | `/api/leads` | no | recibe consultas; honeypot + rate limit 5/10min + valida email/largos |
| POST | `/admin/login` | no | JWT 8h; rate limit 10 intentos/15min |
| PUT | `/admin/password` | JWT | cambio de clave (verifica la actual, bcrypt) |
| GET | `/admin/proyectos` | JWT | lista completa sin filtro de estado |
| POST/PUT/DELETE | `/admin/proyectos/:id?` | JWT | CRUD; DELETE borra también archivos de Storage |
| POST | `/admin/proyectos/:id/imagenes` | JWT | subida a Storage; solo JPG/PNG/WebP/GIF/AVIF, máx 10MB |
| DELETE | `/admin/proyectos/:id/imagenes/:imgId` | JWT | borra fila + archivo físico |
| PUT | `/admin/proyectos/:id/features` | JWT | reemplaza el set completo (atómico) — es el que usa el panel |
| POST/PUT/DELETE | `/admin/proyectos/:id/features/:fId?` | JWT | CRUD individual (legacy, sigue disponible) |
| GET | `/admin/leads?limit=&offset=` | JWT | paginado (default 100, máx 500) + contador `no_leidos` |
| PATCH | `/admin/leads/:id/leido` | JWT | marcar leído/no leído |

### Panel admin (`landing/admin/index.html`)
- Login JWT (token en localStorage, expira 8h, auto-relogin si hay token).
- Tab Proyectos: lista con badges de estado, crear/editar/eliminar.
- Formulario: todos los campos + datos comerciales (precio desde, superficie,
  lotes) + features inline + **imágenes** (subir, marcar portada, eliminar —
  solo visible al editar, porque necesita el id del proyecto).
- **Slug autogenerado** desde el nombre (normaliza tildes/espacios); editable.
- Tab Leads: paginado de a 100 con "Cargar más", badge de no leídos, marcar leído.
- Botón "Cambiar clave" en la topbar.
- **Todo dato externo pasa por `esc()` antes de innerHTML** (regla de seguridad
  no negociable: los leads los escribe cualquier visitante anónimo).
- Responsive: tablas con scroll horizontal — usable desde celular.

### Landing (`landing/`)
- Sección "Proyectos Estructurados" se renderiza desde `GET /api/proyectos`
  (línea 1 de `script.js` define `API_URL`, hoy `https://api.landbrokers.cl`).
- Tarjetas muestran datos comerciales si existen, botón CONSULTAR (pre-selecciona
  el proyecto en el formulario) y VER PROYECTO (url_externa).
- Formulario de contacto → `POST /api/leads` con `proyecto_id` + honeypot
  invisible anti-bots. Mensajes de éxito/error con fallback a WhatsApp.
- El resto de la landing es estática (regla: no sobre-ingenierar).

### Seguridad implementada (auditorías 1 y 2)
- XSS almacenado corregido (esc() en panel y landing).
- Honeypot con 201 falso (no delata la detección a los bots).
- Rate limiting en leads y login. `trust proxy` habilitado para Hostinger.
- multer 2.x + fileFilter por mimetype (extensión derivada del mimetype).
- CORS nunca cae a `*` (default: landbrokers.cl con warning).
- RLS habilitado en las 5 tablas (deny-all para anon; el backend usa service key).
- Archivos de Storage se limpian al borrar proyectos/imágenes (sin huérfanos).

---

## 3. RAMA `feature/remates` — QUÉ TIENE (NO MERGEADA)

- `api/supabase/remates.sql`: columnas `es_remate`, `remate_fecha`,
  `remate_precio_minimo`, `remate_estado` (enum: programado/en_curso/adjudicado/suspendido).
- `GET /api/remates`: proyectos en remate ordenados por fecha ascendente.
- Validación backend: si `es_remate=true` → fecha y precio mínimo obligatorios.
- Panel: checkbox "Es remate" que despliega los 3 campos; badge naranja REMATE en la lista.
- Landing: sección "Propiedades en Remate" después de Proyectos Estructurados,
  **oculta con display:none si hay 0 remates** (con 0 remates la web se ve idéntica).
- Fuera de alcance de esa cotización (NO construir sin nueva cotización):
  countdown en vivo, página propia de remates, sistema de pujas, notificaciones.

---

## 4. LO QUE FALTA — CHECKLIST

### Pasos manuales de Gueremy (bloquean todo lo demás)
- [ ] Crear proyecto en supabase.com (región São Paulo)
- [ ] SQL Editor: ejecutar `schema.sql` → `seed.sql` → `mejoras.sql` (ORDEN OBLIGATORIO, ver `api/supabase/README.md`)
- [ ] Antes del seed: generar hash bcrypt y reemplazar el placeholder:
      `cd api && npm install && node -e "const b=require('bcryptjs'); b.hash('CLAVE_DE_JOAN',10).then(console.log)"`
      También revisar/cambiar el email `joan@landbrokers.cl` en seed.sql
- [ ] Storage: crear bucket `proyectos` marcado como **público**
- [ ] Crear `api/.env` (plantilla en `.env.example`; service_role key, NO la anon)
- [ ] Probar local: `node src/index.js` → `http://localhost:3000/api/proyectos` debe devolver los 2 proyectos
- [ ] Probar panel local: abrir `landing/admin/index.html` cambiando temporalmente
      `const API = 'http://localhost:3000'` (línea ~530; revertir después)

### Hito 2.8 — Deploy (última tarea del Hito 2, hacerla en sesión con Claude)
- [ ] Decidir hosting: Opción A (Hostinger de Joan) u Opción B (slot de Gueremy $25.000/mes)
- [ ] Subir `api/` al servidor, `.env` de producción (nunca al repo), Node + PM2
- [ ] Subdominio `api.landbrokers.cl` + SSL
- [ ] Subir `landing/` a public_html (reemplaza la landing vieja hardcodeada)
- [ ] Verificar `API_URL` en `landing/script.js` línea 1 y `const API` en `landing/admin/index.html`
- [ ] **Post-deploy:** configurar UptimeRobot → `https://api.landbrokers.cl/api/proyectos`
      cada 5 min (ver §6 — es el keep-alive principal, NO el GitHub Action)
- [ ] Cobrar Hito 2 ($240.000)

### Hito 3 — Fichas Puntra y Patagonia ($120.000, NO arrancar sin pago H2)
- [ ] Fichas individuales con URL por slug + galería + mapa GPS + formulario
- [ ] Migrar contenido real de ambos proyectos
- [ ] **Decisión de diseño previa:** SEO/Open Graph por proyecto (hoy el render es
      client-side → invisible para Google y sin preview al compartir por WhatsApp).
      Resolver ANTES de construir las fichas, no después.
- [ ] Confirmar con Joan si mantiene los dominios externos (refugiopatagonia.cl /
      refugiopuntrachiloe.cl) o consolida todo en landbrokers.cl

### Feature Remates (cuando Joan apruebe y pague $180.000)
- [ ] Merge según comando de §1 + ejecutar `remates.sql` en Supabase
- [ ] Detalle visual pendiente en esa rama: la sección remates y contacto quedan
      con dos fondos blancos seguidos — agregar `bg-light` a una de las dos

### Deuda técnica conocida (auditoría 2, NO crítica — pulido post-deploy o garantía)
- [ ] `PUT /admin/proyectos/:id` es destructivo con campos omitidos (el panel manda todo, no duele hoy)
- [ ] Validar formato de slug en backend (`^[a-z0-9-]+$`)
- [ ] Validar esquema de `url_externa` (`^https?://`) — hoy un `javascript:` sobreviviría
- [ ] Interceptor común de 401 en el panel (hoy si expira el JWT a mitad de edición, el error es confuso)
- [ ] `parseFloat(x) || null` convierte 0 en null (precio 0, lat 0 — irrelevante en la práctica)
- [ ] `<meta name="robots" content="noindex">` en `/admin`
- [ ] `esc()` en `renderImagenes` del panel (consistencia; las URLs son del propio bucket)

### Ideas vendibles (cotizar aparte a $15.000/hr SI Joan las pide — NO construir gratis)
Catálogo completo con precios y packs en **`ACTUALIZACIONES.md`** (13 módulos
cotizados: notificaciones, inventario de lotes, mapa interactivo del masterplan,
simulador de cuotas, CRM de leads, etc.).

---

## 5. BASE DE DATOS — RESUMEN OPERATIVO

5 tablas: `proyectos`, `proyecto_imagenes`, `proyecto_features`, `leads`, `admin_user`
(detalle de columnas en CLAUDE.md §MODELO DE DATOS).

**Columnas agregadas por `mejoras.sql`** (la API las consulta — sin esta migración
`/api/proyectos` responde 500): `precio_desde numeric`, `superficie text`,
`lotes_totales int`, `lotes_disponibles int`. También habilita RLS en todo.

**Columnas de `remates.sql`** (solo rama feature/remates — misma regla de 500 si
se mergea sin migrar): `es_remate bool`, `remate_fecha timestamptz`,
`remate_precio_minimo numeric`, `remate_estado text check(...)`.

Todos los scripts son idempotentes: correrlos dos veces no rompe nada.

---

## 6. OPERACIÓN — COSAS QUE MUERDEN EN SILENCIO

1. **Supabase free se pausa tras ~7 días sin actividad en la DB.** La landing
   moriría con "no se pudieron cargar los proyectos".
   - Mecanismo principal: **UptimeRobot** → `https://api.landbrokers.cl/api/proyectos`
     cada 5 min (gratis; de paso avisa por email si el sitio se cae). Configurar post-deploy.
   - Respaldo: `.github/workflows/keepalive.yml` (cron diario 09:17 UTC).
     ⚠️ GitHub apaga los crons tras **60 días sin commits** — por eso NO puede ser el principal.
   - Pingear `/health` NO sirve: no toca la DB. Tiene que ser `/api/proyectos`.
   - El Action fallará todos los días hasta que exista api.landbrokers.cl —
     deshabilitarlo en GitHub > Actions si molestan los emails, reactivar post-deploy.
2. **El `.env` jamás va al repo** (está en .gitignore). En producción se crea a mano.
3. **La landing en producción HOY sigue siendo la vieja** (hardcodeada). La del
   repo la reemplaza recién en el deploy 2.8.
4. **El seed trae un hash placeholder** — si se ejecuta tal cual, el login del
   admin es imposible. Hay que reemplazarlo antes (ver §4).

---

## 7. HISTORIAL DE LA SESIÓN 2026-07-08 (qué se hizo y por qué)

1. **Setup inicial:** repo poblado desde los zips (Hito 2 completo 2.1→2.7).
2. **Cierre de gaps:** UI de imágenes en el panel, formulario de contacto en la
   landing, scroll horizontal en tablas mobile, fix de features duplicadas.
3. **Feature remates** en rama separada (cotización aparte, $180.000).
4. **Auditoría 1 + correcciones:** XSS almacenado en leads (crítico), anti-spam
   (honeypot + rate limits), multer 2.x, CORS estricto, lead asociado a proyecto,
   campos comerciales, slug automático, cambio de clave, features atómico,
   leads paginados, RLS, keep-alive.
5. **Auditoría 2 + correcciones críticas:** limpieza de Storage al borrar,
   fileFilter de imágenes, README de migraciones, trampa de los 60 días del cron,
   CLAUDE.md actualizado. Deuda menor documentada en §4.

Convención de commits: prefijo `[remates]` en la rama feature; conventional
commits (`fix:`, `feat:`, `docs:`, `chore:`) en la principal.

---

## 8. DATOS RÁPIDOS

```
Cliente:   Joan Sandoval — WhatsApp +56 9 8247 0858
Dominio:   landbrokers.cl (Hostinger)
Repo:      github.com/Gueremy/Landbrokers
Total:     $460.000 (hitos) + $180.000 (remates, condicional)
Stack:     HTML/CSS/JS estático + Node/Express + Supabase + JWT
Separado de TerraTokenX (Django/blockchain) — NUNCA mezclar.
```
