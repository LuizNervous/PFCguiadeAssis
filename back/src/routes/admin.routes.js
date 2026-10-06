const express = require('express');
const { dbp } = require('../config/db');
const autenticar = require('../middlewares/autenticar');
const exigirAdmin = require('../middlewares/exigirAdmin');
const { receberImagemPonto } = require('../middlewares/upload');
const { ehTexto, lerId, lerNumero } = require('../utils/validacoes');
const { PASTAS, PRESETS, ImagemInvalidaError, prepararImagem, enviarImagem, apagarImagem } = require('../services/imagens');

const router = express.Router();


router.use(autenticar, exigirAdmin);


async function validarPonto(corpo) {
  const { nome, endereco, descricao, id_categoria, latitude, longitude } = corpo ?? {};

  if (![nome, endereco, latitude, longitude, id_categoria].every(ehTexto)) {
    return { erro: 'Preencha nome, endereço, latitude, longitude e categoria.' };
  }
  const dados = { nome: nome.trim(), endereco: endereco.trim(), descricao: typeof descricao === 'string' ? descricao.trim() : '' }

  if (!dados.nome || !dados.endereco) {
    return { erro: 'Preencha nome, endereço.' };
  }
  if (dados.nome.length > 100) return { erro: 'O nome pode ter no máximo 100 caracteres.' };
  if (dados.endereco.length > 255) return { erro: 'O endereço pode ter no máximo 255 caracteres.' };
  if (dados.descricao.length > 1000) return { erro: 'A descrição pode ter no máximo 1000 caracteres.' };

  const categoriaId = lerNumero(id_categoria);
  if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
    return { erro: 'Categoria inválida.' }
  }
  const lat = lerNumero(latitude);
  const lng = lerNumero(longitude);
  if (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180)) {
    return { erro: "Latitude ou Longitude inválido." };
  }
  const [categoria] = await dbp.query('SELECT id FROM categorias WHERE id = ? ', [categoriaId]);
  if (categoria.length === 0) {
    return { erro: "Categoria não encontrada." }
  }
  return { dados: { ...dados, id_categoria: categoriaId, latitude: lat, longitude: lng } };
}
async function processarImagemPonto(arquivo) {
  const otimizada = await prepararImagem(arquivo.buffer, PRESETS.fotoPonto);
  return enviarImagem(otimizada, PASTAS.pontos);
}
function responderErroImagem(res, erro) {
  if (erro instanceof ImagemInvalidaError) {
    return res.status(400).json({ mensagem: erro.message });
  }
  console.error("Falha ao enviar imagem do ponto: ", erro.message);
  return res.status(502).json({ mensagem: 'Não foi possível salvar a imagem agora. Tente novamente.' });
}

function erroInterno(res, contexto, erro) {
  console.error(contexto, erro);
  return res.status(500).json({ mensagem: "Erro interno do servidor." })
}

router.get('/verificar', (req, res) => { res.json({ admin: true }); });
router.get('/categorias', async (req, res) => {
  try {
    const [linhas] = await dbp.query('SELECT id,nome FROM categorias ORDER BY nome');
    res.json(linhas);
  } catch (erro) {
    erroInterno(res, 'Erro ao listar categorias :', erro);
  }
});
router.post('/pontos', receberImagemPonto, async (req, res) => {
  try {
    const validacao = await validarPonto(req.body);
    if (validacao.erro) return res.status(400).json({ mensagem: validacao.erro });
    if (!req.file) {
      return res.status(400).json({ mensagem: "Envie uma imagem JPEG, PNG ou WebP." });
    }

    let imagem;
    try {
      imagem = await processarImagemPonto(req.file);
    } catch (erro) {
      return responderErroImagem(res, erro);
    }
    const d = validacao.dados;
    try {
      const [resultado] = await dbp.query(`
                    INSERT INTO pontos (nome,endereco,descricao, imagem, imagem_file_id, id_categoria, latitude, longitude)
                    VALUES (?,?,?,?,?,?,?,?)`, [d.nome, d.endereco, d.descricao, imagem.url, imagem.fileId, d.id_categoria, d.latitude, d.longitude]);
      return res.status(201).json({ mensagem: 'Ponto criado com sucesso!', id: resultado.insertId });

    } catch (erro) {
      apagarImagem(imagem.fileId).catch(e => console.error('Falha ao limpar imagem órfã', e.message));
      throw erro;
    }
  } catch (erro) {
    erroInterno(res, 'Erro ao criar ponto : ', erro)
  }
});
router.put('/pontos/:id', receberImagemPonto, async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ mensagem: "ID do ponto inválido." })

  try {
    const [existente] = await dbp.query('SELECT imagem_file_id FROM pontos WHERE id=?', [id]);
    if (existente.length === 0) return res.status(404).json({ mensagem: "Ponto não encontrado" });

    const validacao = await validarPonto(req.body);
    if (validacao.erro) return res.status(400).json({ mensagem: validacao.erro });

    let imagem = null;
    if (req.file) {
      try {
        imagem = await processarImagemPonto(req.file);
      } catch (erro) {
        return responderErroImagem(res, erro);
      }
    }
    const d = validacao.dados;
    let campos = 'nome=?, endereco=?,descricao=?,id_categoria=?,latitude=?, longitude=?';
    const valores = [d.nome, d.endereco, d.descricao, d.id_categoria, d.latitude, d.longitude];

    if (imagem) {
      campos += ',imagem=?, imagem_file_id=?';
      valores.push(imagem.url, imagem.fileId);
    }
    valores.push(id);
    try {
      await dbp.query(`UPDATE pontos SET ${campos} WHERE id =?`, valores);
    } catch (erro) {
      if (imagem) {
        apagarImagem(imagem.fileId).catch(e => console.error('Falha ao limpar imagem órfã : ', e.message));
      }
      throw erro;
    }
    const fotoAntigaId = existente[0].imagem_file_id;
    if (imagem && fotoAntigaId) {
      apagarImagem(fotoAntigaId).catch(e => console.error('Falha ao apagar imagem órfã: ', e.message));
    }
    return res.json({ mensagem: "Ponto atualizado com sucesso!" });
  } catch (erro) {
    erroInterno(res, "Erro ao editar ponto : ", erro);
  }
});

router.delete('/pontos/:id', async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ mensagem: "ID do ponto inválido." });

  let conexao;
  try {
    const [linhas] = await dbp.query('SELECT imagem_file_id FROM pontos WHERE id = ?', [id])
    if (linhas.length === 0) return res.status(404).json({ mensagem: "Ponto não encontrado." });

    conexao = await dbp.getConnection();
    await conexao.beginTransaction();
    await conexao.query('DELETE FROM avaliacoes WHERE id_ponto = ?', [id]);
    await conexao.query('DELETE FROM pontos WHERE id= ?', [id]);
    await conexao.commit();

    if (linhas[0].imagem_file_id) {
      apagarImagem(linhas[0].imagem_file_id).catch(e => console.error("Falha ao apagar imagem do ponto :", e.message));
    }
    return res.json({ mensagem: "Ponto excluído." });
  } catch (erro) {
    if (conexao) {
      await conexao.rollback().catch(() => { });
    }
    erroInterno(res, "Erro ao excluir ponto : ", erro)
  } finally {
    if (conexao) conexao.release();
  }
});


module.exports = router;