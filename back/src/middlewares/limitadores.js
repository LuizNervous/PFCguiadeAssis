const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

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
const limitadorVerificacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { mensagem: 'Muitas tentativas. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const limitadorGoogle = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10, 
  message: { mensagem: 'Muitas tentativas de login Google. Tente novamente mais tarde.'},
  standardHeaders: true,
  legacyHeaders: false,

});

const limitadorFavoritos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => String(req.usuario.id),
  message: { mensagem: 'Você alterou seus favoritos muitas vezes. Aguarde alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const limitadorExclusaoConta = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => String(req.usuario.id),
  message: { mensagem: 'Muitas tentativas de excluir a conta. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limita criação, edição e exclusão de avaliações por usuário autenticado.
const limitadorAvaliacoes = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => String(req.usuario.id),
  message: { mensagem: 'Muitas alterações de avaliações em pouco tempo. Aguarde alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const limitadorAdmin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => (req.usuario?.id ? String(req.usuario.id) : ipKeyGenerator(req.ip)),
  message: { mensagem: 'Muitas operações administrativas em pouco tempo. Aguarde alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const limitadorAcaoCriticaAdmin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => (req.usuario?.id ? String(req.usuario.id) : ipKeyGenerator(req.ip)),
  message: { mensagem: 'Muitas tentativas em ações críticas. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  limitadorGeral,
  limitadorRigoroso,
  limitadorFotoPerfil,
  limitadorVerificacao,
  limitadorGoogle,
  limitadorFavoritos,
  limitadorExclusaoConta,
  limitadorAvaliacoes,
  limitadorAdmin,
  limitadorAcaoCriticaAdmin
};