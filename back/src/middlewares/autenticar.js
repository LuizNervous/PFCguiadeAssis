const jwt = require('jsonwebtoken');
const { dbp } = require('../config/db');

const segredo = process.env.JWT_SECRET;

async function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho) {
    return res.status(401).json({ mensagem: 'Token não fornecido.' });
  }
  const partes = cabecalho.split(' ');

  if (partes.length !== 2 || partes[0] !== 'Bearer') {
    return res.status(401).json({
      mensagem: 'Formato do token inválido.'
    });
  }
  const token = partes[1];

  let payload;
  try {
    payload = jwt.verify(token, segredo, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
  }

  const usuarioId = Number(payload?.id);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
  }

  try {
    const [linhas] = await dbp.query(
      'SELECT id, nome, email, eh_admin, bloqueado, token_version FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );
    if (linhas.length === 0) {
      return res.status(401).json({ mensagem: 'Sessão inválida ou usuário não encontrado.' });
    }

    const u = linhas[0];
    const tvToken = payload.tv ?? 1;
    const tvBanco = Number(u.token_version) || 1;
    if (Number(tvToken) !== tvBanco) {
      return res.status(401).json({ mensagem: 'Sua sessão expirou. Faça login novamente.' });
    }

    if (Number(u.bloqueado) === 1) {
      return res.status(403).json({
        codigo: 'CONTA_BLOQUEADA',
        mensagem: 'Sua conta está bloqueada pelo administrador.'
      });
    }

    req.usuario = {
      id: u.id,
      nome: u.nome,
      email: u.email,
      eh_admin: Number(u.eh_admin) === 1 ? 1 : 0,
      bloqueado: 0,
      token_version: tvBanco
    };
    return next();
  } catch (erro) {
    console.error('Erro ao validar sessão do usuário:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
}

module.exports = autenticar;
