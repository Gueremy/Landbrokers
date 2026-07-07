const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const supabase = require('../db/supabase');
const auth = require('../middleware/auth');

const router = express.Router();

// Solo imágenes reales: el accept="image/*" del navegador no protege nada por sí solo
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!MIME_EXT[file.mimetype]) {
      req.fileRechazado = `Tipo de archivo no permitido (${file.mimetype}). Solo JPG, PNG, WebP, GIF o AVIF.`;
      return cb(null, false);
    }
    cb(null, true);
  },
});

// Borra del bucket todos los archivos guardados bajo el prefijo de un proyecto
async function borrarArchivosProyecto(proyectoId) {
  const { data: archivos } = await supabase.storage.from('proyectos').list(proyectoId);
  if (archivos?.length) {
    await supabase.storage
      .from('proyectos')
      .remove(archivos.map((a) => `${proyectoId}/${a.name}`));
  }
}

// De una URL pública del bucket → path interno ("<proyectoId>/<archivo>")
function pathDesdeUrl(url) {
  const marca = '/object/public/proyectos/';
  const i = (url || '').indexOf(marca);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length));
}

// Frena fuerza bruta sobre el login: 10 intentos por IP cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de login. Espere 15 minutos.' },
});

const REMATE_ESTADOS = ['programado', 'en_curso', 'adjudicado', 'suspendido'];

// Valida los campos de remate de un body de proyecto. Devuelve un string de error o null.
function validarRemate(body) {
  if (!body.es_remate) return null;
  if (!body.remate_fecha || !body.remate_precio_minimo) {
    return 'remate_fecha y remate_precio_minimo son requeridos cuando es_remate es true';
  }
  if (body.remate_estado && !REMATE_ESTADOS.includes(body.remate_estado)) {
    return `remate_estado debe ser uno de: ${REMATE_ESTADOS.join(', ')}`;
  }
  return null;
}

// POST /admin/login
router.post('/login', loginLimiter, async (req, res) => {
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

// PUT /admin/password — cambiar contraseña del admin logueado
router.put('/password', async (req, res) => {
  const { actual, nueva } = req.body;
  if (!actual || !nueva) return res.status(400).json({ error: 'actual y nueva son requeridos' });
  if (nueva.length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });

  const { data: user, error } = await supabase
    .from('admin_user')
    .select('id, password_hash')
    .eq('id', req.admin.id)
    .single();

  if (error || !user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const valid = await bcrypt.compare(actual, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'La contraseña actual no es correcta' });

  const password_hash = await bcrypt.hash(nueva, 10);
  const { error: updateError } = await supabase
    .from('admin_user')
    .update({ password_hash })
    .eq('id', user.id);

  if (updateError) return res.status(500).json({ error: updateError.message });
  res.json({ ok: true });
});

// GET /admin/proyectos — todos (sin filtro de estado)
router.get('/proyectos', async (req, res) => {
  const { data, error } = await supabase
    .from('proyectos')
    .select('id, slug, nombre, ubicacion, estado, orden, created_at, es_remate, remate_estado')
    .order('orden', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /admin/proyectos — crear proyecto
router.post('/proyectos', async (req, res) => {
  const {
    slug, nombre, ubicacion, descripcion, estado, gps_lat, gps_lng, url_externa, orden,
    precio_desde, superficie, lotes_totales, lotes_disponibles,
    es_remate, remate_fecha, remate_precio_minimo, remate_estado,
  } = req.body;

  const errorRemate = validarRemate(req.body);
  if (errorRemate) return res.status(400).json({ error: errorRemate });

  const { data, error } = await supabase
    .from('proyectos')
    .insert([{
      slug, nombre, ubicacion, descripcion, estado: estado || 'activo', gps_lat, gps_lng, url_externa, orden: orden || 0,
      precio_desde: precio_desde ?? null,
      superficie: superficie || null,
      lotes_totales: lotes_totales ?? null,
      lotes_disponibles: lotes_disponibles ?? null,
      es_remate: Boolean(es_remate),
      remate_fecha: es_remate ? remate_fecha : null,
      remate_precio_minimo: es_remate ? remate_precio_minimo : null,
      remate_estado: es_remate ? (remate_estado || 'programado') : null,
    }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /admin/proyectos/:id — editar proyecto
router.put('/proyectos/:id', async (req, res) => {
  const {
    slug, nombre, ubicacion, descripcion, estado, gps_lat, gps_lng, url_externa, orden,
    precio_desde, superficie, lotes_totales, lotes_disponibles,
    es_remate, remate_fecha, remate_precio_minimo, remate_estado,
  } = req.body;

  const errorRemate = validarRemate(req.body);
  if (errorRemate) return res.status(400).json({ error: errorRemate });

  const { data, error } = await supabase
    .from('proyectos')
    .update({
      slug, nombre, ubicacion, descripcion, estado, gps_lat, gps_lng, url_externa, orden,
      precio_desde: precio_desde ?? null,
      superficie: superficie || null,
      lotes_totales: lotes_totales ?? null,
      lotes_disponibles: lotes_disponibles ?? null,
      es_remate: Boolean(es_remate),
      remate_fecha: es_remate ? remate_fecha : null,
      remate_precio_minimo: es_remate ? remate_precio_minimo : null,
      remate_estado: es_remate ? (remate_estado || 'programado') : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /admin/proyectos/:id — eliminar proyecto (incluye sus archivos en Storage)
router.delete('/proyectos/:id', async (req, res) => {
  // Primero los archivos: si se borrara el proyecto primero, los paths quedarían huérfanos para siempre
  await borrarArchivosProyecto(req.params.id);

  const { error } = await supabase.from('proyectos').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// POST /admin/proyectos/:id/imagenes — subir imagen a Supabase Storage
router.post('/proyectos/:id/imagenes', upload.single('imagen'), async (req, res) => {
  if (req.fileRechazado) return res.status(400).json({ error: req.fileRechazado });
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });

  const ext = MIME_EXT[req.file.mimetype];
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

// DELETE /admin/proyectos/:id/imagenes/:imgId — eliminar imagen (fila + archivo en Storage)
router.delete('/proyectos/:id/imagenes/:imgId', async (req, res) => {
  const { data: img } = await supabase
    .from('proyecto_imagenes')
    .select('url')
    .eq('id', req.params.imgId)
    .eq('proyecto_id', req.params.id)
    .single();

  const { error } = await supabase
    .from('proyecto_imagenes')
    .delete()
    .eq('id', req.params.imgId)
    .eq('proyecto_id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });

  // El archivo se borra después de la fila: si esto falla queda un huérfano
  // (tolerable), pero nunca una fila apuntando a un archivo inexistente.
  const path = pathDesdeUrl(img?.url);
  if (path) await supabase.storage.from('proyectos').remove([path]);

  res.json({ ok: true });
});

// PUT /admin/proyectos/:id/features — reemplazar TODAS las features en una sola operación.
// Evita el borrado/inserción uno a uno desde el panel (que podía quedar a medias).
router.put('/proyectos/:id/features', async (req, res) => {
  const { features } = req.body;
  if (!Array.isArray(features)) return res.status(400).json({ error: 'features debe ser un array' });

  const limpias = features
    .filter((f) => f && f.titulo && f.titulo.trim())
    .map((f, i) => ({
      proyecto_id: req.params.id,
      titulo: f.titulo.trim(),
      descripcion: (f.descripcion || '').trim(),
      orden: i,
    }));

  const { error: delError } = await supabase
    .from('proyecto_features')
    .delete()
    .eq('proyecto_id', req.params.id);

  if (delError) return res.status(500).json({ error: delError.message });

  if (limpias.length) {
    const { error: insError } = await supabase.from('proyecto_features').insert(limpias);
    if (insError) return res.status(500).json({ error: insError.message });
  }

  res.json({ ok: true, count: limpias.length });
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

// GET /admin/leads — paginado (?limit=&offset=) + total de no leídos
router.get('/leads', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const offset = parseInt(req.query.offset) || 0;

  const { data, error, count } = await supabase
    .from('leads')
    .select('id, proyecto_id, nombre, email, telefono, mensaje, created_at, leido, proyectos(nombre)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });

  const { count: noLeidos } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('leido', false);

  res.json({ leads: data, total: count, no_leidos: noLeidos || 0, limit, offset });
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
