-- LandBrokers — Migración "mejoras comerciales + seguridad"
-- Ejecutar en Supabase > SQL Editor DESPUÉS de schema.sql (y seed.sql).
-- Aditiva: no modifica ni borra nada existente.

-- ── Campos comerciales: lo que un comprador de parcelas mira primero ──
alter table proyectos add column if not exists precio_desde numeric;          -- CLP, "Desde $X"
alter table proyectos add column if not exists superficie text;               -- ej "5.000 – 10.000 m²"
alter table proyectos add column if not exists lotes_totales int;
alter table proyectos add column if not exists lotes_disponibles int;

-- ── Row Level Security como cinturón de seguridad ──
-- El backend usa la service_role key, que NO es afectada por RLS.
-- Esto solo bloquea el acceso directo con la anon key si algún día se filtra
-- o alguien la usa desde un frontend por error.
alter table proyectos enable row level security;
alter table proyecto_imagenes enable row level security;
alter table proyecto_features enable row level security;
alter table leads enable row level security;
alter table admin_user enable row level security;

-- Sin políticas definidas = deny all para anon/authenticated. Intencional.
