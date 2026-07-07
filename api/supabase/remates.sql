-- LandBrokers — Migración "Propiedades en Remate"
-- Ejecutar en Supabase > SQL Editor DESPUÉS de schema.sql
-- No modifica schema.sql: es una migración aditiva independiente.

alter table proyectos add column if not exists es_remate boolean not null default false;
alter table proyectos add column if not exists remate_fecha timestamptz;
alter table proyectos add column if not exists remate_precio_minimo numeric;
alter table proyectos add column if not exists remate_estado text
  check (remate_estado in ('programado', 'en_curso', 'adjudicado', 'suspendido'));

-- Índices para el listado ordenado por fecha de remate
create index if not exists idx_proyectos_es_remate on proyectos(es_remate);
create index if not exists idx_proyectos_remate_fecha on proyectos(remate_fecha);
