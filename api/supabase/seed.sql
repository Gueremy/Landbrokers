-- LandBrokers — Seed inicial
-- Inserta los 2 proyectos actuales migrados desde el HTML hardcodeado
-- IMPORTANTE: Cambiar el password_hash por uno generado con bcrypt antes de usar en producción
-- Para generar: node -e "const b=require('bcryptjs'); b.hash('TU_PASSWORD',10).then(console.log)"

-- Admin user (password de ejemplo: cambiar ANTES de producción)
insert into admin_user (email, password_hash) values (
  'joan@landbrokers.cl',
  '$2a$10$REEMPLAZA_ESTE_HASH_CON_UNO_REAL_GENERADO_CON_BCRYPT'
) on conflict (email) do nothing;

-- Proyecto 1: Refugio Patagonia
insert into proyectos (slug, nombre, ubicacion, descripcion, estado, url_externa, orden)
values (
  'refugio-patagonia',
  'Refugio Patagonia — Puerto Aysén',
  'Patagonia Chilena / Puerto Aysén',
  'Terrenos ricos en agua dulce en uno de los últimos jardines naturales intocados. Lotes exclusivos a solo 4km del Glaciar El Cóndor y 5 lagunas, el próximo polo de turismo outdoor de alta gama en la Región de Aysén.',
  'activo',
  'https://refugiopatagonia.cl/',
  1
) on conflict (slug) do nothing;

-- Features Refugio Patagonia
insert into proyecto_features (proyecto_id, titulo, descripcion, orden)
select p.id, f.titulo, f.descripcion, f.orden
from proyectos p, (values
  (1, 'Glaciar El Cóndor', 'Lotes exclusivos a solo 4km de la cumbre y 5 lagunas. El próximo polo de turismo outdoor de alta gama en la Región de Aysén.'),
  (2, 'Ubicación Estratégica', 'A solo 57km de Puerto Chacabuco y la ruta a Laguna San Rafael. Plusvalía asegurada por el flujo internacional de cruceros de lujo.'),
  (3, 'Reserva de la Biósfera', 'Inmerso en el circuito de pesca de ESPN. Agua pura de glaciar y biodiversidad única en una reserva natural reconocida por la UNESCO.'),
  (4, 'Activo Escaso', 'Terrenos 70% planos en una región con 75% de suelo protegido. Un legado patrimonial con proyección de crecimiento y rentabilidad superior.')
) as f(orden, titulo, descripcion)
where p.slug = 'refugio-patagonia';

-- Proyecto 2: Refugio Puntra
insert into proyectos (slug, nombre, ubicacion, descripcion, estado, url_externa, orden)
values (
  'refugio-puntra',
  'Refugio Puntra — Chiloé',
  'Isla Grande de Chiloé',
  'Existe un lugar en el sur del mundo donde la historia, la naturaleza y la magia se unieron para crear una verdadera leyenda. Asegura tu refugio en el paraíso de la Isla Grande de Chiloé y sé parte de su riqueza.',
  'activo',
  'https://refugiopuntrachiloe.cl/',
  2
) on conflict (slug) do nothing;

-- Features Refugio Puntra
insert into proyecto_features (proyecto_id, titulo, descripcion, orden)
select p.id, f.titulo, f.descripcion, f.orden
from proyectos p, (values
  (1, 'Doble Mar: Pacífico + Mar Interior', 'Ubicación estratégica a 30-40 min del Océano Pacífico y del Mar Interior. Una combinación que amplía radicalmente el lifestyle con surf, pesca deportiva y navegación resguardada. No es costa aislada, es versatilidad geográfica.'),
  (2, 'Conectividad Superior', 'A pasos de la Ruta 5 y a 20 minutos del Aeropuerto de Mocopulli. La conectividad continental directa es el principal detonante de plusvalía, posicionando este refugio donde el crecimiento va a consolidarse primero.'),
  (3, 'Naturaleza Privada', 'Una combinación poco común: orilla de río, laguna cercana, bosque nativo y tranquilidad real. Conectividad más agua dulce y privacidad ideal para segunda vivienda, proyecto boutique o inversión de bajo riesgo.'),
  (4, 'Proyecto Boutique', 'Desarrollo no masivo de muy pocos lotes, comunidad pequeña e infraestructura básica garantizada. Un refugio territorial exclusivo donde la escala pequeña es una ventaja competitiva en los mercados premium.')
) as f(orden, titulo, descripcion)
where p.slug = 'refugio-puntra';
