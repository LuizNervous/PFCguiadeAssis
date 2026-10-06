const rateLimit = require('express-rate-limit');

const limitadorGeral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { mensagem: "Muitas requisições vindas deste IP. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});
const limitadorRigoroso = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { mensagem: 'Limite de tentativas atingido. Tente novamente mais tarde' }
});

const limitadorFotoPerfil = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => String(req.usuario.id),
  message: { mensagem: 'Você trocou a foto muitas vezes. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { limitadorGeral, limitadorRigoroso, limitadorFotoPerfil };