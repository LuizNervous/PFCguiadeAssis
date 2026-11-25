const express = require('express');

const { db, dbp } = require('../config/db');
const autenticar = require('../middlewares/autenticar');
const { limitadorAvaliacoes } = require('../middlewares/limitadores');
const { lerId } = require('../utils/validacoes');

const router = express.Router();

const tagsPermitidas = [
  "Atendimento Ruim",
  "Lugar confortável",
  "Preço elevado",
  "Custo benefício",
  "Bom atendimento"
]
function filtrarTags(tags) {
  let lista = [];
  if (Array.isArray(tags)) {
    lista = tags.filter(t => typeof t === 'string');
  } else if (typeof tags === 'string' && tags.trim() !== '') {
    lista = tags.split(',');
  }
  const filtradas = lista.map(t => t.trim()).filter(t => tagsPermitidas.includes(t));
  return [...new Set(filtradas)].join(', ');
}

router.post('/avaliar', autenticar, limitadorAvaliacoes, (req, res) => {
  const { id_ponto, nota, tags } = req.body ?? {};
  const pontoId = Number(id_ponto);
  const notaNumero = Number(nota);

  if (
    !Number.isInteger(pontoId) || pontoId <= 0 ||
    !Number.isInteger(notaNumero) || notaNumero < 1 || notaNumero > 5
  ) {
    return res.status(400).json({
      mensagem: 'Dados inválidos para a avaliação.'
    });
  }
  const tagsParaSalvar = filtrarTags(tags);

  const usuarioId = req.usuario.id;
  const checkUserQuery =
    'SELECT id FROM usuarios WHERE id = ?';

  db.query(checkUserQuery, [usuarioId], (errUser, userResults) => {
    if (errUser) {
      console.error(errUser);
      return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
    if (userResults.length === 0) {
      return res.status(401).json({ mensagem: 'Usuário não encontrado.' });
    }

    db.query('SELECT id FROM pontos WHERE id = ?', [pontoId], (errPonto, pontoResults) => {
      if (errPonto) {
        console.error(errPonto);
        return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
      }
      if (pontoResults.length === 0) {
        return res.status(404).json({ mensagem: 'Local não encontrado.' });
      }

      const query = `
                  INSERT INTO avaliacoes
                  (id_usuario, id_ponto, nota, tags)
                  VALUES (?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE
                  nota = VALUES(nota),
                  tags = VALUES(tags)
              `;

      db.query(query, [usuarioId, pontoId, notaNumero, tagsParaSalvar],
        (err) => {
          if (err) {
            console.error('Erro ao salvar avaliação:', err);
            return res.status(500).json({ mensagem: 'Erro interno no banco de dados.' });
          }
          return res.json({
            mensagem: 'Avaliação salva com sucesso!'
          });
        }
      );
    });
  });
});


router.get('/usuario/avaliacoes', autenticar, async (req, res) => {
  try {
    const [linhas] = await dbp.query(
      `SELECT a.id, a.id_ponto, a.nota, a.tags,
              p.nome AS ponto_nome, p.endereco AS ponto_endereco, p.imagem AS ponto_imagem,
              c.nome AS categoria_nome
       FROM avaliacoes a
       JOIN pontos p ON p.id = a.id_ponto
       JOIN categorias c ON c.id = p.id_categoria
       WHERE a.id_usuario = ?
       ORDER BY a.id DESC`,
      [req.usuario.id]
    );
    return res.json({ avaliacoes: linhas });
  } catch (erro) {
    console.error('Erro ao listar avaliações do usuário:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

router.put('/usuario/avaliacoes/:id', autenticar, limitadorAvaliacoes, async (req, res) => {
  const idAvaliacao = lerId(req.params.id);
  const notaNumero = Number(req.body?.nota);

  if (!idAvaliacao) {
    return res.status(400).json({ mensagem: 'ID da avaliação inválido.' });
  }
  if (!Number.isInteger(notaNumero) || notaNumero < 1 || notaNumero > 5) {
    return res.status(400).json({ mensagem: 'A nota deve ser um número inteiro de 1 a 5.' });
  }

  const tagsParaSalvar = filtrarTags(req.body?.tags);

  try {
    const [resultado] = await dbp.query(
      'UPDATE avaliacoes SET nota = ?, tags = ? WHERE id = ? AND id_usuario = ?',
      [notaNumero, tagsParaSalvar, idAvaliacao, req.usuario.id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Avaliação não encontrada.' });
    }
    return res.json({
      mensagem: 'Avaliação atualizada com sucesso!',
      avaliacao: { id: idAvaliacao, nota: notaNumero, tags: tagsParaSalvar }
    });
  } catch (erro) {
    console.error('Erro ao editar avaliação:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

router.delete('/usuario/avaliacoes/:id', autenticar, limitadorAvaliacoes, async (req, res) => {
  const idAvaliacao = lerId(req.params.id);
  if (!idAvaliacao) {
    return res.status(400).json({ mensagem: 'ID da avaliação inválido.' });
  }

  try {
    const [resultado] = await dbp.query(
      'DELETE FROM avaliacoes WHERE id = ? AND id_usuario = ?',
      [idAvaliacao, req.usuario.id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Avaliação não encontrada.' });
    }
    return res.json({ mensagem: 'Avaliação excluída.' });
  } catch (erro) {
    console.error('Erro ao excluir avaliação:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

module.exports = router;
