const express = require('express');

const { db } = require('../config/db');
const autenticar = require('../middlewares/autenticar');

const router = express.Router();

const tagsPermitidas = [
  "Atendimento Ruim",
  "Lugar confortável",
  "Preço elevado",
  "Custo benefício",
  "Bom atendimento"
]

router.post('/avaliar', autenticar, (req, res) => {
  const { id_ponto, nota, tags } = req.body;
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
  let tagsFiltradas = [];
  if (typeof tags === 'string' && tags.trim() !== '') {
    const arrayTagsEnviadas = tags.split(',').map(t => t.trim());
    tagsFiltradas = arrayTagsEnviadas.filter(tag => tagsPermitidas.includes(tag));
  }
  const tagsParaSalvar = tagsFiltradas.join(', ');

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
  }
  );
});

module.exports = router;
