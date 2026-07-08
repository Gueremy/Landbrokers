require('dotenv').config();
const express = require('express');
const cors = require('cors');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: nunca abrir a '*' por defecto. Si falta la variable, se avisa
// fuerte y se cae al dominio de producción.
if (!process.env.CORS_ORIGIN) {
  console.warn('⚠ CORS_ORIGIN no está definido en .env — usando https://landbrokers.cl por defecto');
}
app.use(cors({ origin: process.env.CORS_ORIGIN || 'https://landbrokers.cl' }));
app.use(express.json());

// Hostinger/proxies: necesario para que el rate limit vea la IP real del cliente
app.set('trust proxy', 1);

app.use('/api', publicRoutes);
app.use('/admin', adminRoutes);

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`LandBrokers API corriendo en puerto ${PORT}`);
});
