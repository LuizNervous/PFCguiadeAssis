const express = require('express');
const bcrypt = require('bcryptjs');
const { db, dbp } = require('../config/db');
const autenticar = require('../middlewares/autenticar');
const { limitadorFotoPerfil, limitadorFavoritos, limitadorExclusaoConta } = require('../middlewares/limitadores');
const { receberFoto } = require('../middlewares/upload');
const { ehTexto, lerId } = require('../utils/validacoes');
const { PASTAS, PRESETS, ImagemInvalidaError, prepararImagem, enviarImagem, apagarImagem } = require('../services/imagens');

const router = express.Router();

const TEXTO_CONFIRMACAO_EXCLUSAO = 'EXCLUIR';


router.put('/', autenticar, (req, res) => {
  const { nome } = req.body ?? {};
  const usuarioId = req.usuario.id;

  if (!ehTexto(nome)) {
    return res.status(400).json({ mensagem: 'O nome deve ser um texto válido.' });
  }

  const nomeLimpo = nome.trim().replace(/\s+/g, ' ');

  if (!nomeLimpo) {
    return res.status(400).json({ mensagem: 'O nome é obrigatório.' });
  }

  if (nomeLimpo.length < 3 || !nomeLimpo.includes(' ')) {
    return res.status(400).json({ mensagem: 'Por favor, digite seu nome e sobrenome.' });
  }

  if (nomeLimpo.length > 150) {
    return res.status(400).json({ mensagem: 'O nome pode ter no máximo 150 caracteres.' });
  }

  const updateQuery = 'UPDATE usuarios SET nome = ? WHERE id = ?';
  db.query(updateQuery, [nomeLimpo, usuarioId], (err, resultado) => {
    if (err) {
      return res.status(500).json({ mensagem: 'Erro ao atualizar os dados.' });
    }
    if (!resultado || resultado.affectedRows === 0) {
      return res.status(401).json({ mensagem: 'Usuário não encontrado.' });
    }

    return res.json({
      mensagem: 'Nome atualizado com sucesso!',
      usuario: { id: usuarioId, nome: nomeLimpo }
    });
  });
});

router.get("/", autenticar, async (req, res) => {
  try {
    const [linhas] = await dbp.query(
      `SELECT id, nome, email, foto_url, eh_admin,
              (senha IS NOT NULL) AS tem_senha,
              (google_sub IS NOT NULL) AS tem_google
       FROM usuarios WHERE id = ?`,
      [req.usuario.id]
    );
    if (linhas.length === 0) {
      return res.status(401).json({ mensagem: "Usuário não encontrado." })
    }
    const usuario = {
      ...linhas[0],
      tem_senha: Number(linhas[0].tem_senha) === 1,
      tem_google: Number(linhas[0].tem_google) === 1
    };
    return res.json({ usuario });
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

router.get('/favoritos', autenticar, async (req, res) => {
  try {
    const [linhas] = await dbp.query(
      `SELECT p.id, p.nome, p.endereco, p.imagem, p.id_categoria,
              c.nome AS categoria_nome,
              COALESCE(ROUND(AVG(a.nota), 1), 0) AS media_nota,
              COUNT(a.id) AS total_avaliacoes,
              f.criado_em AS salvo_em
       FROM favoritos f
       JOIN pontos p ON p.id = f.id_ponto
       JOIN categorias c ON c.id = p.id_categoria
       LEFT JOIN avaliacoes a ON a.id_ponto = p.id
       WHERE f.id_usuario = ?
       GROUP BY f.id, p.id, c.nome
       ORDER BY f.criado_em DESC, f.id DESC`,
      [req.usuario.id]
    );
    return res.json({ favoritos: linhas });
  } catch (erro) {
    console.error('Erro ao listar favoritos:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

// Salva um ponto nos favoritos (idempotente: salvar duas vezes não duplica).
router.post('/favoritos/:idPonto', autenticar, limitadorFavoritos, async (req, res) => {
  const idPonto = lerId(req.params.idPonto);
  if (!idPonto) {
    return res.status(400).json({ mensagem: 'ID do local inválido.' });
  }

  try {
    const [usuarios] = await dbp.query('SELECT id FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (usuarios.length === 0) {
      return res.status(401).json({ mensagem: 'Usuário não encontrado.' });
    }

    const [pontos] = await dbp.query('SELECT id FROM pontos WHERE id = ?', [idPonto]);
    if (pontos.length === 0) {
      return res.status(404).json({ mensagem: 'Local não encontrado.' });
    }

    const [resultado] = await dbp.query(
      'INSERT IGNORE INTO favoritos (id_usuario, id_ponto) VALUES (?, ?)',
      [req.usuario.id, idPonto]
    );

    const criado = resultado.affectedRows > 0;
    return res.status(criado ? 201 : 200).json({
      mensagem: criado ? 'Local salvo nos favoritos!' : 'Este local já estava nos seus favoritos.',
      salvo: true,
      id_ponto: idPonto
    });
  } catch (erro) {
    if (erro.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(401).json({ mensagem: 'Sessão inválida para esta conta.' });
    }
    console.error('Erro ao salvar favorito:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

router.delete('/favoritos/:idPonto', autenticar, limitadorFavoritos, async (req, res) => {
  const idPonto = lerId(req.params.idPonto);
  if (!idPonto) {
    return res.status(400).json({ mensagem: 'ID do local inválido.' });
  }

  try {
    await dbp.query(
      'DELETE FROM favoritos WHERE id_usuario = ? AND id_ponto = ?',
      [req.usuario.id, idPonto]
    );
    return res.json({ mensagem: 'Local removido dos favoritos.', salvo: false, id_ponto: idPonto });
  } catch (erro) {
    console.error('Erro ao remover favorito:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

router.delete('/', autenticar, limitadorExclusaoConta, async (req, res) => {
  const { confirmacao, senha, emailConfirmacao } = req.body ?? {};
  const usuarioId = req.usuario.id;

  if (!ehTexto(confirmacao) || confirmacao.trim() !== TEXTO_CONFIRMACAO_EXCLUSAO) {
    return res.status(400).json({ mensagem: `Digite ${TEXTO_CONFIRMACAO_EXCLUSAO} para confirmar a exclusão.` });
  }

  let conexao;
  try {
    conexao = await dbp.getConnection();
    await conexao.beginTransaction();

    const [linhas] = await conexao.query(
      'SELECT id, email, senha, foto_file_id, eh_admin FROM usuarios WHERE id = ? FOR UPDATE',
      [usuarioId]
    );
    const usuario = linhas[0];
    if (!usuario) {
      await conexao.rollback();
      return res.status(401).json({ mensagem: 'Usuário não encontrado.' });
    }

    if (Number(usuario.eh_admin) === 1) {
      const [outrosAdmins] = await conexao.query(
        'SELECT COUNT(*) AS total FROM usuarios WHERE eh_admin = 1 AND bloqueado = 0 AND id <> ? FOR UPDATE',
        [usuarioId]
      );
      if (Number(outrosAdmins[0].total) === 0) {
        await conexao.rollback();
        return res.status(409).json({
          mensagem: 'Você é o único administrador ativo do sistema. Promova outro administrador antes de excluir sua conta.'
        });
      }
    }

    // Conta com senha: exige a senha atual. Conta só Google: exige o e-mail.
    if (usuario.senha) {
      if (!ehTexto(senha) || !senha || senha.length > 72) {
        await conexao.rollback();
        return res.status(400).json({ mensagem: 'Informe sua senha atual para excluir a conta.' });
      }
      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        await conexao.rollback();
        return res.status(403).json({ mensagem: 'Senha incorreta. A conta não foi excluída.' });
      }
    } else {
      const emailDigitado = ehTexto(emailConfirmacao) ? emailConfirmacao.trim().toLowerCase() : '';
      if (!emailDigitado || emailDigitado.length > 254 || emailDigitado !== String(usuario.email).toLowerCase()) {
        await conexao.rollback();
        return res.status(403).json({ mensagem: 'O e-mail digitado não confere com o da sua conta.' });
      }
    }

    await conexao.query('DELETE FROM tokens_verificacao WHERE id_usuario = ?', [usuarioId]);
    await conexao.query('DELETE FROM favoritos WHERE id_usuario = ?', [usuarioId]);
    await conexao.query('DELETE FROM avaliacoes WHERE id_usuario = ?', [usuarioId]);
    await conexao.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);

    await conexao.commit();

    // Só apaga a foto do ImageKit depois que o banco confirmou a exclusão.
    if (usuario.foto_file_id) {
      apagarImagem(usuario.foto_file_id).catch(e => console.error('Falha ao apagar foto da conta excluída:', e.message));
    }

    return res.json({ mensagem: 'Sua conta foi excluída permanentemente.' });
  } catch (erro) {
    if (conexao) await conexao.rollback().catch(() => { });
    console.error('Erro ao excluir conta:', erro);
    return res.status(500).json({ mensagem: 'Não foi possível excluir a conta agora. Nada foi apagado.' });
  } finally {
    if (conexao) conexao.release();
  }
});

module.exports = router;