const express = require('express');
const supabase = require('../db/supabase');

const router = express.Router();

// GET /api/proyectos — listado público con imagen portada y features
router.get('/proyectos', async (req, res) => {
  const { data: proyectos, error } = await supabase
    .from('proyectos')
    .select(`
      id, slug, nombre, ubicacion, descripcion, estado,
      url_externa, orden,
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
router.post('/leads', async (req, res) => {
  const { proyecto_id, nombre, email, telefono, mensaje } = req.body;

  if (!nombre || !email) {
    return res.status(400).json({ error: 'nombre y email son requeridos' });
  }

  const { error } = await supabase.from('leads').insert([
    { proyecto_id: proyecto_id || null, nombre, email, telefono, mensaje, leido: false },
  ]);

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ ok: true });
});

module.exports = router;
