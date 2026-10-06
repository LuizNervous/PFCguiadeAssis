const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { limitadorGeral, limitadorRigoroso } = require('./middlewares/limitadores');

const app = express();
const origensPermitidas = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean)
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (origensPermitidas.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origem não permitida pelo CORS'));
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));
app.set('trust proxy', 1);
app.use(helmet());

app.use('/api/cadastro', limitadorRigoroso);
app.use('/api/login', limitadorRigoroso);
app.use('/api/', limitadorGeral);

app.use('/api', require('./routes/pontos.routes'));
app.use('/api', require('./routes/auth.routes'));
app.use('/api', require('./routes/avaliacoes.routes'));
app.use('/api/usuario', require('./routes/usuario.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  const mensagem = status === 500 ? 'Erro interno no servidor.' : 'Requisição inválida.';

  res.status(status).json({ mensagem });
});

module.exports = app;