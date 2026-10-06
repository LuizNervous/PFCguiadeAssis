const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { limitadorGeral, limitadorRigoroso } = require('./middlewares/limitadores');

const app = express();
app.use(cors());
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