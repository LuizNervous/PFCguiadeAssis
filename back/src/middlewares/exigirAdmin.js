const { dbp } = require('../config/db');

async function exigirAdmin(req, res, next) {
  try {
    if (req.usuario && req.usuario.eh_admin !== undefined && req.usuario.bloqueado !== undefined) {
      if (Number(req.usuario.bloqueado) === 1) {
        return res.status(403).json({
          codigo: 'CONTA_BLOQUEADA',
          mensagem: 'Sua conta está bloqueada pelo administrador.'
        });
      }
      if (Number(req.usuario.eh_admin) !== 1) {
        return res.status(403).json({ mensagem: 'Acesso negado.' });
      }
      return next();
    }

    const [linhas] = await dbp.query(
      'SELECT eh_admin, bloqueado FROM usuarios WHERE id = ? LIMIT 1',
      [req.usuario?.id]
    );
    if (linhas.length === 0) {
      return res.status(401).json({ mensagem: 'Usuário não encontrado.' });
    }
    if (Number(linhas[0].bloqueado) === 1) {
      return res.status(403).json({
        codigo: 'CONTA_BLOQUEADA',
        mensagem: 'Sua conta está bloqueada pelo administrador.'
      });
    }
    if (Number(linhas[0].eh_admin) !== 1) {
      return res.status(403).json({ mensagem: 'Acesso negado.' });
    }
    return next();
  } catch (erro) {
    console.error('Erro ao verificar administrador:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
}

module.exports = exigirAdmin;
