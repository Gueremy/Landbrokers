const express = require('express');
const rateLimit = require('express-rate-limit');
const supabase = require('../db/supabase');

const router = express.Router();

// Máximo 5 consultas por IP cada 10 minutos — suficiente para humanos, corta bots
const leadsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas consultas. Intente nuevamente en unos minutos.' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/proyectos — listado público con imagen portada y features
router.get('/proyectos', async (req, res) => {
  const { data: proyectos, error } = await supabase
    .from('proyectos')
    .select(`
      id, slug, nombre, ubicacion, descripcion, estado,
      url_externa, orden,
      precio_desde, superficie, lotes_totales, lotes_disponibles,
      proyecto_imagenes ( url, es_portada ),
      proyecto_features ( titulo, descripcion, orden )
    `)
    .in('estado', ['activo', 'vendido', 'proximamente'])
    .order('orden', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const resultado = proyectos.map((p) => ({
    ...p,
    imagen_portada: p.proyecto_imagenes?.find((i) => i.es_portada)?.url || null,
    features: (p.proyecto_features || []).sort((a, b) => a.orden - b.orden),
  }));

  res.json(resultado);
});

// GET /api/proyectos/:slug — detalle con todas las imágenes y features
router.get('/proyectos/:slug', async (req, res) => {
  const { data: proyecto, error } = await supabase
    .from('proyectos')
    .select(`
      id, slug, nombre, ubicacion, descripcion, estado,
      gps_lat, gps_lng, url_externa, orden, created_at,
      precio_desde, superficie, lotes_totales, lotes_disponibles,
      proyecto_imagenes ( id, url, orden, es_portada ),
      proyecto_features ( id, titulo, descripcion, orden )
    `)
    .eq('slug', req.params.slug)
    .single();

  if (error) return res.status(404).json({ error: 'Proyecto no encontrado' });

  proyecto.proyecto_imagenes?.sort((a, b) => a.orden - b.orden);
  proyecto.proyecto_features?.sort((a, b) => a.orden - b.orden);

  res.json(proyecto);
});

// POST /api/leads — recibir consulta desde la landing
router.post('/leads', leadsLimiter, async (req, res) => {
  const { proyecto_id, nombre, email, telefono, mensaje, website } = req.body;

  // Honeypot: el campo "website" está oculto en el formulario; solo los bots lo llenan.
  // Se responde 201 falso para no darles señal de que fueron detectados.
  if (website) return res.status(201).json({ ok: true });

  if (!nombre || !email) {
    return res.status(400).json({ error: 'nombre y email son requeridos' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'email inválido' });
  }
  if (nombre.length > 200 || email.length > 200 || (telefono || '').length > 50 || (mensaje || '').length > 3000) {
    return res.status(400).json({ error: 'Campos demasiado largos' });
  }

  const { error } = await supabase.from('leads').insert([
    { proyecto_id: proyecto_id || null, nombre, email, telefono, mensaje, leido: false },
  ]);

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ ok: true });
});

module.exports = router;
