# Migraciones Supabase — LandBrokers

## ⚠️ Orden de ejecución OBLIGATORIO

Ejecutar en **Supabase > SQL Editor**, en este orden exacto:

| # | Archivo | Qué hace | ¿Obligatorio? |
|---|---------|----------|---------------|
| 1 | `schema.sql` | Crea las 5 tablas base + índices | **SÍ** |
| 2 | `seed.sql` | Carga los 2 proyectos + usuario admin (⚠️ reemplazar el hash bcrypt antes) | **SÍ** |
| 3 | `mejoras.sql` | Campos comerciales (precio, superficie, lotes) + RLS | **SÍ** — la API los consulta; sin esto `/api/proyectos` responde 500 |
| 4 | `remates.sql` | Campos de remate | Solo si se aprueba/mergea `feature/remates` — en esa rama la API los consulta y sin esto responde 500 |

## Además, crear a mano

- **Storage**: bucket `proyectos`, marcado como **público** (Storage > New bucket).

## Regla general

El código de la API asume que TODAS las migraciones de su rama están aplicadas.
Si un `SELECT` falla con "column does not exist", falta correr una de esta lista.
Los scripts son idempotentes (`if not exists` / `add column if not exists`):
correrlos dos veces no rompe nada.
