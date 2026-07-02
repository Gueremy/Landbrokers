const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const supabase = require('../db/supabase');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /admin/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });

  const { data: user, error } = await supabase
    .from('admin_user')
    .select('id, email, password_hash')
    .eq('email', email)
    .single();

  if (error || !user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// Todas las rutas de acá en adelante requieren JWT
router.use(auth);

// GET /admin/proyectos — todos (sin filtro de estado)
router.get('/proyectos', async (req, res) => {
  const { data, error } = await supabase
    .from('proyectos')
    .select('id, slug, nombre, ubicacion, estado, orden, created_at')
    .order('orden', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /admin/proyectos — crear proyecto
router.post('/proyectos', async (req, res) => {
  const { slug, nombre, ubicacion, descripcion, estado, gps_lat, gps_lng, url_externa, orden } = req.body;

  const { data, error } = await supabase
    .from('proyectos')
    .insert([{ slug, nombre, ubicacion, descripcion, estado: estado || 'activo', gps_lat, gps_lng, url_externa, orden: orden || 0 }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /admin/proyectos/:id — editar proyecto
router.put('/proyectos/:id', async (req, res) => {
  const { slug, nombre, ubicacion, descripcion, estado, gps_lat, gps_lng, url_externa, orden } = req.body;

  const { data, error } = await supabase
    .from('proyectos')
    .update({ slug, nombre, ubicacion, descripcion, estado, gps_lat, gps_lng, url_externa, orden, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /admin/proyectos/:id — eliminar proyecto
router.delete('/proyectos/:id', async (req, res) => {
  const { error } = await supabase.from('proyectos').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// POST /admin/proyectos/:id/imagenes — subir imagen a Supabase Storage
router.post('/proyectos/:id/imagenes', upload.single('imagen'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });

  const ext = req.file.originalname.split('.').pop();
  const filename = `${req.params.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('proyectos')
    .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const { data: { publicUrl } } = supabase.storage.from('proyectos').getPublicUrl(filename);

  const es_portada = req.body.es_portada === 'true';

  // Si es portada, quitar portada anterior
  if (es_portada) {
    await supabase
      .from('proyecto_imagenes')
      .update({ es_portada: false })
      .eq('proyecto_id', req.params.id);
  }

  const orden = parseInt(req.body.orden) || 0;
  const { data, error } = await supabase
    .from('proyecto_imagenes')
    .insert([{ proyecto_id: req.params.id, url: publicUrl, orden, es_portada }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /admin/proyectos/:id/imagenes/:imgId — eliminar imagen
router.delete('/proyectos/:id/imagenes/:imgId', async (req, res) => {
  const { error } = await supabase
    .from('proyecto_imagenes')
    .delete()
    .eq('id', req.params.imgId)
    .eq('proyecto_id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// POST /admin/proyectos/:id/features — agregar feature
router.post('/proyectos/:id/features', async (req, res) => {
  const { titulo, descripcion, orden } = req.body;
  const { data, error } = await supabase
    .from('proyecto_features')
    .insert([{ proyecto_id: req.params.id, titulo, descripcion, orden: orden || 0 }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /admin/proyectos/:id/features/:fId — editar feature
router.put('/proyectos/:id/features/:fId', async (req, res) => {
  const { titulo, descripcion, orden } = req.body;
  const { data, error } = await supabase
    .from('proyecto_features')
    .update({ titulo, descripcion, orden })
    .eq('id', req.params.fId)
    .eq('proyecto_id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /admin/proyectos/:id/features/:fId — eliminar feature
router.delete('/proyectos/:id/features/:fId', async (req, res) => {
  const { error } = await supabase
    .from('proyecto_features')
    .delete()
    .eq('id', req.params.fId)
    .eq('proyecto_id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// GET /admin/leads — ver todos los leads
router.get('/leads', async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('id, proyecto_id, nombre, email, telefono, mensaje, created_at, leido, proyectos(nombre)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /admin/leads/:id/leido — marcar como leído/no leído
router.patch('/leads/:id/leido', async (req, res) => {
  const { leido } = req.body;
  const { data, error } = await supabase
    .from('leads')
    .update({ leido: Boolean(leido) })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;
