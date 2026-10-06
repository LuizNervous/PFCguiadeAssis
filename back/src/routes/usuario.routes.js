const express = require('express');
const { db, dbp } = require('../config/db');
const autenticar = require('../middlewares/autenticar');
const { limitadorFotoPerfil } = require('../middlewares/limitadores');
const { receberFoto } = require('../middlewares/upload');
const { ehTexto, validarDominioEmail } = require('../utils/validacoes');
const { PASTAS, PRESETS, ImagemInvalidaError, prepararImagem, enviarImagem, apagarImagem } = require('../services/imagens');

const router = express.Router();


router.put('/', autenticar, async (req, res) => {
  const { nome, email } = req.body ?? {};
  const usuarioId = req.usuario.id

  if (!ehTexto(nome) || !ehTexto(email)) {
    return res.status(400).json({ mensagem: 'Nome e e-mail devem ser texto.' });
  }

  if (!nome || !email) {
    return res.status(400).json({ mensagem: "Nome e e-mail são obrigátorios ." })
  }
  const emailValido = await validarDominioEmail(email);
  if (!emailValido) {
    return res.status(400).json({ mensagem: "Escreva um e-mail válido." })
  }

  const checkEmailQuery = 'SELECT id FROM usuarios WHERE email=? AND id != ?'
  db.query(checkEmailQuery, [email, usuarioId], (err, results) => {
    if (err) {
      return res.status(500).json({ mensagem: 'Erro no servidor' });
    }
    if (results.length > 0) {
      return res.status(400).json({ mensagem: 'Este e-mail ja sendo usado por outra conta' })
    }
    const updateQuery = 'UPDATE usuarios SET nome =?, email =? WHERE id= ?'
    db.query(updateQuery, [nome, email, usuarioId], (err) => {
      if (err) {
        return res.status(500).json({ mensagem: "Erro ao atualizar os dados." })
      }
      return res.json({
        mensagem: "Atualizado com sucesso . ",
        usuario: { id: usuarioId, nome, email }
      })
    })
  })
});

router.get("/", autenticar, async (req, res) => {
  try {
    const [linhas] = await dbp.query(
      'SELECT id,nome,email, foto_url, eh_admin FROM usuarios WHERE id=?', [req.usuario.id]
    );
    if (linhas.length === 0) {
      return res.status(401).json({ mensagem: "Usuário não encontrado." })
    }
    return res.json({ usuario: linhas[0] });
  } catch (erro) {
    console.error('Erro ao buscar usuário:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

router.put('/foto', autenticar, limitadorFotoPerfil, receberFoto, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ mensagem: 'Envie uma imagem JPEG, PNG ou WebP.' });
  }
  const usuarioId = req.usuario.id;
  try {
    const [linhas] = await dbp.query('SELECT foto_file_id FROM usuarios WHERE id = ?', [usuarioId]);
    if (linhas.length === 0) {
      return res.status(401).json({ mensagem: 'Usuário não encontrado.' });
    }
    const fotoAntigaId = linhas[0].foto_file_id;
    let imagem;
    try {
      const otimizada = await prepararImagem(req.file.buffer, PRESETS.avatar);
      imagem = await enviarImagem(otimizada, PASTAS.perfis);
    } catch (erro) {
      if (erro instanceof ImagemInvalidaError) {
        return res.status(400).json({ mensagem: erro.message });
      }
      console.error('Falha ao enviar foto de perfil:', erro.message);
      return res.status(502).json({ mensagem: 'Não foi possível salvar a imagem agora. Tente novamente.' });
    }
    try {
      await dbp.query(
        'UPDATE usuarios SET foto_url=?, foto_file_id=? WHERE id=?',
        [imagem.url, imagem.fileId, usuarioId]
      );
    } catch (erro) {
      apagarImagem(imagem.fileId).catch(e => console.error('Falha ao limpar imagem órfã:', e.message));
      throw erro;
    }
    if (fotoAntigaId) {
      apagarImagem(fotoAntigaId).catch(e => console.error('Falha ao apagar foto antiga : ', e.message));
    }
    return res.json({ mensagem: 'Foto atualizada com sucesso!', foto_url: imagem.url });
  } catch (erro) {
    console.error('Erro ao atualizar foto de perfil:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});
router.delete('/foto', autenticar, async (req, res) => {
  const usuarioId = req.usuario.id;

  try {
    const [linhas] = await dbp.query('SELECT foto_file_id FROM usuarios WHERE id=?', [usuarioId]);
    if (linhas.length === 0) {
      return res.status(401).json({ mensagem: 'Usuário não encontrado.' });
    }
    const fotoId = linhas[0].foto_file_id;

    await dbp.query('UPDATE usuarios SET foto_url =NULL, foto_file_id=NULL WHERE id=? ', [usuarioId]);
    if (fotoId) {
      apagarImagem(fotoId).catch(e => console.error('Falha ao apagar a foto do ImageKit ', e.message));
    }
    return res.json({ mensagem: 'Foto removida.' });
  } catch (erro) {
    console.error('Erro ao remover foto de perfil: ', erro);
    return res.status(500).json({ mensagem: "Erro interno no servidor." })
  }
});

module.exports = router;