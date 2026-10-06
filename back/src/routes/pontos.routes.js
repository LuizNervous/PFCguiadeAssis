const express = require('express');
const { db } = require('../config/db');

const router = express.Router();

router.get('/pontos', (req, res) => {
  const query = `
    SELECT p.id, p.nome, p.endereco, p.descricao, p.imagem, p.id_categoria, p.latitude, p.longitude, 
    c.nome AS categoria_nome,
     COALESCE(ROUND(AVG(a.nota), 1), 0) AS media_nota, 
     COUNT(a.id) AS total_avaliacoes,
     GROUP_CONCAT(DISTINCT a.tags SEPARATOR ', ') AS tags
    FROM pontos p
    JOIN categorias c ON p.id_categoria = c.id
    LEFT JOIN avaliacoes a ON p.id = a.id_ponto
    GROUP  BY p.id, c.nome`;

  db.query(query, (erro, results) => {
    if (erro) {
      console.error("Erro ao buscar pontos:", erro);
      return res.status(500).json({ mensagem: "Erro ao buscar os pontos." });
    };
    res.json(results);
  });
});

router.get('/pontos/:id', (req, res) => {
  const { id } = req.params;
  const query = `
        SELECT p.id, p.nome, p.endereco, p.descricao, p.imagem, p.id_categoria, p.latitude, p.longitude,
                c.nome AS categoria_nome,
                COALESCE(ROUND(AVG(a.nota), 1), 0) AS media_nota,
                COUNT(a.id) AS total_avaliacoes
        FROM pontos p
        JOIN categorias c ON p.id_categoria=c.id
        LEFT JOIN avaliacoes a ON p.id = a.id_ponto
        WHERE p.id=?
        GROUP BY p.id, c.nome`;

  db.query(query, [id], (erro, results) => {
    if (erro) {
      console.error("Erro ao buscar o ponto:", erro);
      return res.status(500).json({ mensagem: "Erro ao buscar o ponto" });
    }
    if (results.length === 0) {
      return res.status(404).json({ mensagem: "Ponto não encontrado" });
    }
    res.json(results[0]);
  })
});


router.get('/pontos/:id/avaliacoes', (req, res) => {
  const { id } = req.params;
  const idPonto = parseInt(id, 10);
  if (isNaN(idPonto)) {
    return res.status(400).json({
      mensagem: "ID do ponto turístico inválido."
    });
  }
  const query = `
        SELECT a.id, a.nota, a.tags, u.nome AS usuario_nome, u.foto_url AS usuario_foto
        FROM avaliacoes a
        JOIN usuarios u ON a.id_usuario =u.id
        WHERE a.id_ponto=?
        ORDER BY a.id DESC`;
  db.query(query, [idPonto], (erro, results) => {
    if (erro) {
      console.error("Erro ao buscar avaliações:", erro);
      return res.status(500).json({
        mensagem: "Erro interno ao buscar avaliações."
      });
    }
    res.json(results);
  });
});

module.exports = router;