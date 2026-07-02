-- LandBrokers — Schema Supabase
-- Ejecutar en Supabase > SQL Editor

-- Habilitar extensión uuid
create extension if not exists "pgcrypto";

-- Tabla proyectos
create table if not exists proyectos (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  nombre        text not null,
  ubicacion     text,
  descripcion   text,
  estado        text not null default 'activo' check (estado in ('activo', 'vendido', 'proximamente')),
  gps_lat       numeric,
  gps_lng       numeric,
  url_externa   text,
  orden         int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Tabla imágenes de proyectos
create table if not exists proyecto_imagenes (
  id            uuid primary key default gen_random_uuid(),
  proyecto_id   uuid not null references proyectos(id) on delete cascade,
  url           text not null,
  orden         int not null default 0,
  es_portada    boolean not null default false
);

-- Tabla features / características de proyectos
create table if not exists proyecto_features (
  id            uuid primary key default gen_random_uuid(),
  proyecto_id   uuid not null references proyectos(id) on delete cascade,
  titulo        text not null,
  descripcion   text,
  orden         int not null default 0
);

-- Tabla leads / consultas de clientes
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  proyecto_id   uuid references proyectos(id) on delete set null,
  nombre        text not null,
  email         text not null,
  telefono      text,
  mensaje       text,
  leido         boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Tabla usuario admin
create table if not exists admin_user (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- Índices
create index if not exists idx_proyectos_estado on proyectos(estado);
create index if not exists idx_proyectos_orden on proyectos(orden);
create index if not exists idx_proyecto_imagenes_proyecto_id on proyecto_imagenes(proyecto_id);
create index if not exists idx_proyecto_features_proyecto_id on proyecto_features(proyecto_id);
create index if not exists idx_leads_created_at on leads(created_at desc);
create index if not exists idx_leads_leido on leads(leido);
