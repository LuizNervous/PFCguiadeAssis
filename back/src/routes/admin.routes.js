const express = require('express');
const bcrypt = require('bcryptjs');
const { dbp } = require('../config/db');
const autenticar = require('../middlewares/autenticar');
const exigirAdmin = require('../middlewares/exigirAdmin');
const { limitadorAdmin, limitadorAcaoCriticaAdmin } = require('../middlewares/limitadores');
const { receberImagemPonto } = require('../middlewares/upload');
const { ehTexto, lerId, lerNumero } = require('../utils/validacoes');
const { PASTAS, PRESETS, ImagemInvalidaError, prepararImagem, enviarImagem, apagarImagem } = require('../services/imagens');
const { ACOES_AUDITORIA, registrarAuditoria } = require('../services/auditoria');

const router = express.Router();

router.use(autenticar, exigirAdmin);

const ORDEM_USUARIOS = Object.freeze({
  id: 'u.id',
  nome: 'u.nome',
  email: 'u.email',
  criado_em: 'u.criado_em',
  eh_admin: 'u.eh_admin',
  bloqueado: 'u.bloqueado',
  total_avaliacoes: 'total_avaliacoes'
});

const ORDEM_AVALIACOES = Object.freeze({
  id: 'a.id',
  nota: 'a.nota',
  ponto_nome: 'p.nome',
  usuario_nome: 'u.nome',
  categoria_nome: 'c.nome'
});

const ORDEM_AUDITORIA = Object.freeze({
  criado_em: 'l.criado_em',
  acao: 'l.acao',
  alvo_tipo: 'l.alvo_tipo',
  admin_nome: 'l.admin_nome'
});

const ALVOS_AUDITORIA_VALIDOS = new Set(['usuario', 'ponto', 'categoria', 'avaliacao']);
const ACOES_AUDITORIA_VALIDAS = new Set(Object.values(ACOES_AUDITORIA));

function lerPaginacao(query, padraoLimite = 10, maxLimite = 50) {
  const paginaRaw = parseInt(query?.pagina, 10);
  const limiteRaw = parseInt(query?.limite, 10);
  const pagina = Number.isInteger(paginaRaw) && paginaRaw > 0 ? paginaRaw : 1;
  const limite = Number.isInteger(limiteRaw) && limiteRaw > 0 ? Math.min(maxLimite, limiteRaw) : padraoLimite;
  return { pagina, limite, offset: (pagina - 1) * limite };
}

function escaparLike(texto) {
  return String(texto).replace(/[\\%_]/g, '\\$&');
}

function limparBusca(valor) {
  if (!ehTexto(valor)) return '';
  return valor.trim().slice(0, 100);
}

function validarNomeCategoria(nome) {
  if (!ehTexto(nome)) {
    return { erro: 'Informe o nome da categoria.' };
  }
  const limpo = nome.trim().replace(/\s+/g, ' ');
  if (limpo.length < 2) {
    return { erro: 'O nome da categoria deve ter pelo menos 2 caracteres.' };
  }
  if (limpo.length > 50) {
    return { erro: 'O nome da categoria pode ter no máximo 50 caracteres.' };
  }
  return { nome: limpo };
}

async function contarOutrosAdminsAtivos(conexao, idAlvo) {
  const [linhas] = await conexao.query(
    'SELECT COUNT(*) AS total FROM usuarios WHERE eh_admin = 1 AND bloqueado = 0 AND id <> ? FOR UPDATE',
    [idAlvo]
  );
  return Number(linhas[0]?.total || 0);
}

async function verificarReconfirmacaoAdmin(executor, idAdmin, corpo) {
  const [linhas] = await executor.query(
    'SELECT id, email, senha FROM usuarios WHERE id = ? LIMIT 1',
    [idAdmin]
  );
  const admin = linhas[0];
  if (!admin) {
    return { ok: false, status: 401, mensagem: 'Administrador não encontrado.' };
  }

  if (admin.senha) {
    const senhaAdmin = corpo?.senhaAdmin;
    if (!ehTexto(senhaAdmin) || senhaAdmin.length === 0 || senhaAdmin.length > 72) {
      return { ok: false, status: 400, mensagem: 'Digite sua senha de administrador para confirmar esta ação.' };
    }
    const confere = await bcrypt.compare(senhaAdmin, admin.senha);
    if (!confere) {
      return { ok: false, status: 403, mensagem: 'Senha de administrador incorreta. A ação não foi realizada.' };
    }
    return { ok: true };
  }

  const emailDigitado = ehTexto(corpo?.emailConfirmacao) ? corpo.emailConfirmacao.trim().toLowerCase() : '';
  if (!emailDigitado || emailDigitado.length > 254 || emailDigitado !== String(admin.email).toLowerCase()) {
    return { ok: false, status: 403, mensagem: 'O e-mail digitado não confere com o da sua conta de administrador.' };
  }
  return { ok: true };
}

async function validarPonto(corpo) {
  const { nome, endereco, descricao, id_categoria, latitude, longitude } = corpo ?? {};

  if (![nome, endereco, latitude, longitude, id_categoria].every(ehTexto)) {
    return { erro: 'Preencha nome, endereço, latitude, longitude e categoria.' };
  }
  const dados = {
    nome: nome.trim(),
    endereco: endereco.trim(),
    descricao: typeof descricao === 'string' ? descricao.trim() : ''
  };

  if (!dados.nome || !dados.endereco) {
    return { erro: 'Preencha nome, endereço.' };
  }
  if (dados.nome.length > 100) return { erro: 'O nome pode ter no máximo 100 caracteres.' };
  if (dados.endereco.length > 255) return { erro: 'O endereço pode ter no máximo 255 caracteres.' };
  if (dados.descricao.length > 1000) return { erro: 'A descrição pode ter no máximo 1000 caracteres.' };

  const categoriaId = lerNumero(id_categoria);
  if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
    return { erro: 'Categoria inválida.' };
  }
  const lat = lerNumero(latitude);
  const lng = lerNumero(longitude);
  if (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180)) {
    return { erro: 'Latitude ou Longitude inválido.' };
  }
  const [categoria] = await dbp.query('SELECT id FROM categorias WHERE id = ?', [categoriaId]);
  if (categoria.length === 0) {
    return { erro: 'Categoria não encontrada.' };
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
  console.error('Falha ao enviar imagem do ponto:', erro.message);
  return res.status(502).json({ mensagem: 'Não foi possível salvar a imagem agora. Tente novamente.' });
}

function erroInterno(res, contexto, erro) {
  console.error(contexto, erro);
  return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
}

/* ==========================================
   VERIFICAÇÃO E VISÃO GERAL
   ========================================== */
router.get('/verificar', async (req, res) => {
  try {
    const [linhas] = await dbp.query(
      'SELECT id, nome, email, (senha IS NOT NULL) AS tem_senha FROM usuarios WHERE id = ? LIMIT 1',
      [req.usuario.id]
    );
    const u = linhas[0];
    if (!u) return res.status(401).json({ mensagem: 'Usuário não encontrado.' });

    return res.json({
      admin: true,
      usuario: {
        id: u.id,
        nome: u.nome,
        email: u.email,
        tem_senha: Number(u.tem_senha) === 1
      }
    });
  } catch (erro) {
    return erroInterno(res, 'Erro ao verificar administrador:', erro);
  }
});

router.get('/resumo', async (req, res) => {
  try {
    const [[pontosRes], [catsRes], [avRes], [usersRes]] = await Promise.all([
      dbp.query('SELECT COUNT(*) AS total_pontos, COUNT(DISTINCT id_categoria) AS categorias_em_uso FROM pontos'),
      dbp.query('SELECT COUNT(*) AS total_categorias FROM categorias'),
      dbp.query('SELECT COUNT(*) AS total_avaliacoes, COALESCE(ROUND(AVG(nota), 1), 0) AS media_avaliacoes FROM avaliacoes'),
      dbp.query(`
        SELECT COUNT(*) AS total_usuarios,
               COALESCE(SUM(CASE WHEN eh_admin = 1 AND bloqueado = 0 THEN 1 ELSE 0 END), 0) AS total_admins,
               COALESCE(SUM(CASE WHEN bloqueado = 1 THEN 1 ELSE 0 END), 0) AS total_bloqueados,
               COALESCE(SUM(CASE WHEN email_verificado = 0 THEN 1 ELSE 0 END), 0) AS total_pendentes
        FROM usuarios
      `)
    ]);

    return res.json({
      total_pontos: Number(pontosRes[0]?.total_pontos || 0),
      categorias_em_uso: Number(pontosRes[0]?.categorias_em_uso || 0),
      total_categorias: Number(catsRes[0]?.total_categorias || 0),
      total_avaliacoes: Number(avRes[0]?.total_avaliacoes || 0),
      media_avaliacoes: Number(avRes[0]?.media_avaliacoes || 0),
      total_usuarios: Number(usersRes[0]?.total_usuarios || 0),
      total_admins: Number(usersRes[0]?.total_admins || 0),
      total_bloqueados: Number(usersRes[0]?.total_bloqueados || 0),
      total_pendentes: Number(usersRes[0]?.total_pendentes || 0)
    });
  } catch (erro) {
    return erroInterno(res, 'Erro ao carregar resumo administrativo:', erro);
  }
});

/* ==========================================
   CATEGORIAS
   ========================================== */
router.get('/categorias', async (req, res) => {
  try {
    const [linhas] = await dbp.query(`
      SELECT c.id, c.nome, COUNT(p.id) AS total_pontos
      FROM categorias c
      LEFT JOIN pontos p ON p.id_categoria = c.id
      GROUP BY c.id, c.nome
      ORDER BY c.nome ASC
    `);
    return res.json(linhas);
  } catch (erro) {
    return erroInterno(res, 'Erro ao listar categorias:', erro);
  }
});

router.post('/categorias', limitadorAdmin, async (req, res) => {
  const validacao = validarNomeCategoria(req.body?.nome);
  if (validacao.erro) return res.status(400).json({ mensagem: validacao.erro });

  let conexao;
  try {
    conexao = await dbp.getConnection();
    await conexao.beginTransaction();

    const [duplicadas] = await conexao.query(
      'SELECT id FROM categorias WHERE LOWER(nome) = LOWER(?) LIMIT 1 FOR UPDATE',
      [validacao.nome]
    );
    if (duplicadas.length > 0) {
      await conexao.rollback();
      return res.status(409).json({ mensagem: 'Já existe uma categoria com esse nome.' });
    }

    const [[maxRow]] = await conexao.query(
      'SELECT COALESCE(MAX(id), 0) + 1 AS proximoId FROM categorias FOR UPDATE'
    );
    const novoId = Number(maxRow?.proximoId || 1);

    await conexao.query('INSERT INTO categorias (id, nome) VALUES (?, ?)', [novoId, validacao.nome]);
    await conexao.commit();

    await registrarAuditoria(req, {
      acao: ACOES_AUDITORIA.CRIAR_CATEGORIA,
      alvoTipo: 'categoria',
      alvoId: novoId,
      detalhes: `Categoria criada: "${validacao.nome}"`
    });

    return res.status(201).json({
      mensagem: 'Categoria criada com sucesso!',
      id: novoId,
      nome: validacao.nome
    });
  } catch (erro) {
    if (conexao) await conexao.rollback().catch(() => {});
    return erroInterno(res, 'Erro ao criar categoria:', erro);
  } finally {
    if (conexao) conexao.release();
  }
});

router.put('/categorias/:id', limitadorAdmin, async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ mensagem: 'ID da categoria inválido.' });

  const validacao = validarNomeCategoria(req.body?.nome);
  if (validacao.erro) return res.status(400).json({ mensagem: validacao.erro });

  try {
    const [existentes] = await dbp.query('SELECT id, nome FROM categorias WHERE id = ? LIMIT 1', [id]);
    if (existentes.length === 0) {
      return res.status(404).json({ mensagem: 'Categoria não encontrada.' });
    }

    const [duplicadas] = await dbp.query(
      'SELECT id FROM categorias WHERE LOWER(nome) = LOWER(?) AND id <> ? LIMIT 1',
      [validacao.nome, id]
    );
    if (duplicadas.length > 0) {
      return res.status(409).json({ mensagem: 'Já existe outra categoria com esse nome.' });
    }

    await dbp.query('UPDATE categorias SET nome = ? WHERE id = ?', [validacao.nome, id]);
    await registrarAuditoria(req, {
      acao: ACOES_AUDITORIA.EDITAR_CATEGORIA,
      alvoTipo: 'categoria',
      alvoId: id,
      detalhes: `Categoria renomeada: "${existentes[0].nome}" -> "${validacao.nome}"`
    });

    return res.json({ mensagem: 'Categoria atualizada com sucesso!' });
  } catch (erro) {
    return erroInterno(res, 'Erro ao editar categoria:', erro);
  }
});

router.delete('/categorias/:id', limitadorAdmin, async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ mensagem: 'ID da categoria inválido.' });

  let conexao;
  try {
    conexao = await dbp.getConnection();
    await conexao.beginTransaction();

    const [existentes] = await conexao.query('SELECT id, nome FROM categorias WHERE id = ? FOR UPDATE', [id]);
    if (existentes.length === 0) {
      await conexao.rollback();
      return res.status(404).json({ mensagem: 'Categoria não encontrada.' });
    }

    const [vinculos] = await conexao.query(
      'SELECT COUNT(*) AS total FROM pontos WHERE id_categoria = ? FOR UPDATE',
      [id]
    );
    const totalPontos = Number(vinculos[0]?.total || 0);
    if (totalPontos > 0) {
      await conexao.rollback();
      return res.status(409).json({
        mensagem: `Não é possível excluir esta categoria pois há ${totalPontos} ponto(s) vinculado(s) a ela.`
      });
    }

    await conexao.query('DELETE FROM categorias WHERE id = ?', [id]);
    await conexao.commit();

    await registrarAuditoria(req, {
      acao: ACOES_AUDITORIA.EXCLUIR_CATEGORIA,
      alvoTipo: 'categoria',
      alvoId: id,
      detalhes: `Categoria excluída: "${existentes[0].nome}"`
    });

    return res.json({ mensagem: 'Categoria excluída com sucesso!' });
  } catch (erro) {
    if (conexao) await conexao.rollback().catch(() => {});
    if (erro?.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ mensagem: 'Não é possível excluir uma categoria que possui pontos vinculados.' });
    }
    return erroInterno(res, 'Erro ao excluir categoria:', erro);
  } finally {
    if (conexao) conexao.release();
  }
});

/* ==========================================
   PONTOS
   ========================================== */
router.post('/pontos', limitadorAdmin, receberImagemPonto, async (req, res) => {
  try {
    const validacao = await validarPonto(req.body);
    if (validacao.erro) return res.status(400).json({ mensagem: validacao.erro });
    if (!req.file) {
      return res.status(400).json({ mensagem: 'Envie uma imagem JPEG, PNG ou WebP.' });
    }

    let imagem;
    try {
      imagem = await processarImagemPonto(req.file);
    } catch (erro) {
      return responderErroImagem(res, erro);
    }
    const d = validacao.dados;
    try {
      const [resultado] = await dbp.query(
        `INSERT INTO pontos (nome, endereco, descricao, imagem, imagem_file_id, id_categoria, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.nome, d.endereco, d.descricao, imagem.url, imagem.fileId, d.id_categoria, d.latitude, d.longitude]
      );
      await registrarAuditoria(req, {
        acao: ACOES_AUDITORIA.CRIAR_PONTO,
        alvoTipo: 'ponto',
        alvoId: resultado.insertId,
        detalhes: `Ponto criado: "${d.nome}"`
      });
      return res.status(201).json({ mensagem: 'Ponto criado com sucesso!', id: resultado.insertId });
    } catch (erro) {
      apagarImagem(imagem.fileId).catch(e => console.error('Falha ao limpar imagem órfã', e.message));
      throw erro;
    }
  } catch (erro) {
    return erroInterno(res, 'Erro ao criar ponto:', erro);
  }
});

router.put('/pontos/:id', limitadorAdmin, receberImagemPonto, async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ mensagem: 'ID do ponto inválido.' });

  try {
    const [existente] = await dbp.query('SELECT nome, imagem_file_id FROM pontos WHERE id = ?', [id]);
    if (existente.length === 0) return res.status(404).json({ mensagem: 'Ponto não encontrado.' });

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
    let campos = 'nome=?, endereco=?, descricao=?, id_categoria=?, latitude=?, longitude=?';
    const valores = [d.nome, d.endereco, d.descricao, d.id_categoria, d.latitude, d.longitude];

    if (imagem) {
      campos += ', imagem=?, imagem_file_id=?';
      valores.push(imagem.url, imagem.fileId);
    }
    valores.push(id);
    try {
      await dbp.query(`UPDATE pontos SET ${campos} WHERE id = ?`, valores);
    } catch (erro) {
      if (imagem) {
        apagarImagem(imagem.fileId).catch(e => console.error('Falha ao limpar imagem órfã:', e.message));
      }
      throw erro;
    }
    const fotoAntigaId = existente[0].imagem_file_id;
    if (imagem && fotoAntigaId) {
      apagarImagem(fotoAntigaId).catch(e => console.error('Falha ao apagar imagem órfã:', e.message));
    }

    await registrarAuditoria(req, {
      acao: ACOES_AUDITORIA.EDITAR_PONTO,
      alvoTipo: 'ponto',
      alvoId: id,
      detalhes: existente[0].nome !== d.nome
        ? `Ponto editado: "${existente[0].nome}" -> "${d.nome}"`
        : `Ponto editado: "${d.nome}"`
    });
    return res.json({ mensagem: 'Ponto atualizado com sucesso!' });
  } catch (erro) {
    return erroInterno(res, 'Erro ao editar ponto:', erro);
  }
});

router.delete('/pontos/:id', limitadorAdmin, async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ mensagem: 'ID do ponto inválido.' });

  let conexao;
  try {
    const [linhas] = await dbp.query('SELECT nome, imagem_file_id FROM pontos WHERE id = ?', [id]);
    if (linhas.length === 0) return res.status(404).json({ mensagem: 'Ponto não encontrado.' });

    conexao = await dbp.getConnection();
    await conexao.beginTransaction();
    await conexao.query('DELETE FROM avaliacoes WHERE id_ponto = ?', [id]);
    await conexao.query('DELETE FROM favoritos WHERE id_ponto = ?', [id]);
    await conexao.query('DELETE FROM pontos WHERE id = ?', [id]);
    await conexao.commit();

    if (linhas[0].imagem_file_id) {
      apagarImagem(linhas[0].imagem_file_id).catch(e => console.error('Falha ao apagar imagem do ponto:', e.message));
    }

    await registrarAuditoria(req, {
      acao: ACOES_AUDITORIA.EXCLUIR_PONTO,
      alvoTipo: 'ponto',
      alvoId: id,
      detalhes: `Ponto excluído: "${linhas[0].nome}"`
    });
    return res.json({ mensagem: 'Ponto excluído.' });
  } catch (erro) {
    if (conexao) {
      await conexao.rollback().catch(() => {});
    }
    return erroInterno(res, 'Erro ao excluir ponto:', erro);
  } finally {
    if (conexao) conexao.release();
  }
});

/* ==========================================
   USUÁRIOS (GESTÃO SEGURA)
   ========================================== */
router.get('/usuarios', async (req, res) => {
  const busca = limparBusca(req.query.busca);
  const cargo = ehTexto(req.query.cargo) ? req.query.cargo : 'todos';
  const status = ehTexto(req.query.status) ? req.query.status : 'todos';
  const { pagina, limite, offset } = lerPaginacao(req.query, 10, 50);

  const colunaOrdem = ORDEM_USUARIOS[req.query.ordenar] || 'u.id';
  const direcaoOrdem = req.query.direcao === 'asc' ? 'ASC' : 'DESC';

  const condicoes = [];
  const params = [];

  if (busca) {
    const padrao = `%${escaparLike(busca)}%`;
    condicoes.push("(u.nome LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\')");
    params.push(padrao, padrao);
  }
  if (cargo === 'admin') {
    condicoes.push('u.eh_admin = 1');
  } else if (cargo === 'comum') {
    condicoes.push('u.eh_admin = 0');
  }

  if (status === 'bloqueado') {
    condicoes.push('u.bloqueado = 1');
  } else if (status === 'ativo') {
    condicoes.push('u.bloqueado = 0 AND u.email_verificado = 1');
  } else if (status === 'pendente') {
    condicoes.push('u.bloqueado = 0 AND u.email_verificado = 0');
  }

  const whereSql = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

  try {
    const [[contagem]] = await dbp.query(`SELECT COUNT(*) AS total FROM usuarios u ${whereSql}`, params);
    const total = Number(contagem?.total || 0);

    const [linhas] = await dbp.query(
      `SELECT u.id, u.nome, u.email, u.foto_url, u.eh_admin, u.email_verificado,
              u.bloqueado, u.bloqueado_em, u.motivo_bloqueio, u.criado_em,
              (u.senha IS NOT NULL) AS tem_senha,
              (u.google_sub IS NOT NULL) AS tem_google,
              (SELECT COUNT(*) FROM avaliacoes a WHERE a.id_usuario = u.id) AS total_avaliacoes,
              (SELECT COUNT(*) FROM favoritos f WHERE f.id_usuario = u.id) AS total_favoritos
       FROM usuarios u
       ${whereSql}
       ORDER BY ${colunaOrdem} ${direcaoOrdem}, u.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limite, offset]
    );

    const itens = linhas.map((u) => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      foto_url: u.foto_url || null,
      eh_admin: Number(u.eh_admin) === 1,
      email_verificado: Number(u.email_verificado) === 1,
      bloqueado: Number(u.bloqueado) === 1,
      bloqueado_em: u.bloqueado_em,
      motivo_bloqueio: u.motivo_bloqueio || null,
      criado_em: u.criado_em,
      tem_senha: Number(u.tem_senha) === 1,
      tem_google: Number(u.tem_google) === 1,
      total_avaliacoes: Number(u.total_avaliacoes || 0),
      total_favoritos: Number(u.total_favoritos || 0)
    }));

    return res.json({
      itens,
      total,
      pagina,
      limite,
      totalPaginas: Math.max(1, Math.ceil(total / limite))
    });
  } catch (erro) {
    return erroInterno(res, 'Erro ao listar usuários:', erro);
  }
});

router.patch('/usuarios/:id/admin', limitadorAdmin, limitadorAcaoCriticaAdmin, async (req, res) => {
  const idAlvo = lerId(req.params.id);
  if (!idAlvo) return res.status(400).json({ mensagem: 'ID de usuário inválido.' });

  if (idAlvo === Number(req.usuario.id)) {
    return res.status(400).json({ mensagem: 'Você não pode alterar seu próprio cargo de administrador.' });
  }

  const { eh_admin: novoAdmin } = req.body ?? {};
  if (typeof novoAdmin !== 'boolean') {
    return res.status(400).json({ mensagem: 'Informe eh_admin como booleano (true ou false).' });
  }

  let conexao;
  try {
    const reauth = await verificarReconfirmacaoAdmin(dbp, req.usuario.id, req.body);
    if (!reauth.ok) {
      return res.status(reauth.status).json({ mensagem: reauth.mensagem });
    }

    conexao = await dbp.getConnection();
    await conexao.beginTransaction();

    const [linhas] = await conexao.query(
      'SELECT id, nome, email, eh_admin, bloqueado, email_verificado FROM usuarios WHERE id = ? FOR UPDATE',
      [idAlvo]
    );
    const alvo = linhas[0];
    if (!alvo) {
      await conexao.rollback();
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    if (novoAdmin) {
      if (Number(alvo.bloqueado) === 1) {
        await conexao.rollback();
        return res.status(400).json({ mensagem: 'Desbloqueie o usuário antes de torná-lo administrador.' });
      }
      if (Number(alvo.email_verificado) !== 1) {
        await conexao.rollback();
        return res.status(400).json({ mensagem: 'Apenas usuários com e-mail verificado podem se tornar administradores.' });
      }
      await conexao.query('UPDATE usuarios SET eh_admin = 1 WHERE id = ?', [idAlvo]);
    } else {
      if (Number(alvo.eh_admin) === 1) {
        const outros = await contarOutrosAdminsAtivos(conexao, idAlvo);
        if (outros === 0) {
          await conexao.rollback();
          return res.status(409).json({ mensagem: 'Não é possível remover o único administrador ativo do sistema.' });
        }
      }
      await conexao.query(
        'UPDATE usuarios SET eh_admin = 0, token_version = token_version + 1 WHERE id = ?',
        [idAlvo]
      );
    }

    await conexao.commit();

    await registrarAuditoria(req, {
      acao: novoAdmin ? ACOES_AUDITORIA.PROMOVER_ADMIN : ACOES_AUDITORIA.REBAIXAR_ADMIN,
      alvoTipo: 'usuario',
      alvoId: idAlvo,
      detalhes: `${alvo.nome} (${alvo.email})`
    });

    return res.json({
      mensagem: novoAdmin ? 'Usuário promovido a administrador!' : 'Permissão de administrador removida.'
    });
  } catch (erro) {
    if (conexao) await conexao.rollback().catch(() => {});
    return erroInterno(res, 'Erro ao alterar permissão de administrador:', erro);
  } finally {
    if (conexao) conexao.release();
  }
});

router.patch('/usuarios/:id/bloqueio', limitadorAdmin, async (req, res) => {
  const idAlvo = lerId(req.params.id);
  if (!idAlvo) return res.status(400).json({ mensagem: 'ID de usuário inválido.' });

  if (idAlvo === Number(req.usuario.id)) {
    return res.status(400).json({ mensagem: 'Você não pode bloquear sua própria conta.' });
  }

  const { bloqueado: novoBloqueio, motivo } = req.body ?? {};
  if (typeof novoBloqueio !== 'boolean') {
    return res.status(400).json({ mensagem: 'Informe bloqueado como booleano (true ou false).' });
  }

  let motivoLimpo = null;
  if (motivo !== undefined && motivo !== null) {
    if (!ehTexto(motivo)) {
      return res.status(400).json({ mensagem: 'Motivo de bloqueio inválido.' });
    }
    const textoMotivo = motivo.trim();
    if (textoMotivo.length > 255) {
      return res.status(400).json({ mensagem: 'O motivo pode ter no máximo 255 caracteres.' });
    }
    motivoLimpo = textoMotivo || null;
  }

  let conexao;
  try {
    conexao = await dbp.getConnection();
    await conexao.beginTransaction();

    const [linhas] = await conexao.query(
      'SELECT id, nome, email, eh_admin, bloqueado FROM usuarios WHERE id = ? FOR UPDATE',
      [idAlvo]
    );
    const alvo = linhas[0];
    if (!alvo) {
      await conexao.rollback();
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    if (novoBloqueio) {
      if (Number(alvo.eh_admin) === 1) {
        const outros = await contarOutrosAdminsAtivos(conexao, idAlvo);
        if (outros === 0) {
          await conexao.rollback();
          return res.status(409).json({ mensagem: 'Não é possível bloquear o único administrador ativo do sistema.' });
        }
      }
      await conexao.query(
        'UPDATE usuarios SET bloqueado = 1, bloqueado_em = NOW(), motivo_bloqueio = ?, token_version = token_version + 1 WHERE id = ?',
        [motivoLimpo, idAlvo]
      );
    } else {
      await conexao.query(
        'UPDATE usuarios SET bloqueado = 0, bloqueado_em = NULL, motivo_bloqueio = NULL WHERE id = ?',
        [idAlvo]
      );
    }

    await conexao.commit();

    await registrarAuditoria(req, {
      acao: novoBloqueio ? ACOES_AUDITORIA.BLOQUEAR_USUARIO : ACOES_AUDITORIA.DESBLOQUEAR_USUARIO,
      alvoTipo: 'usuario',
      alvoId: idAlvo,
      detalhes: novoBloqueio && motivoLimpo
        ? `${alvo.nome} (${alvo.email}) | Motivo: ${motivoLimpo}`
        : `${alvo.nome} (${alvo.email})`
    });

    return res.json({
      mensagem: novoBloqueio ? 'Usuário bloqueado com sucesso.' : 'Usuário desbloqueado com sucesso.'
    });
  } catch (erro) {
    if (conexao) await conexao.rollback().catch(() => {});
    return erroInterno(res, 'Erro ao alterar bloqueio do usuário:', erro);
  } finally {
    if (conexao) conexao.release();
  }
});

router.delete('/usuarios/:id', limitadorAdmin, limitadorAcaoCriticaAdmin, async (req, res) => {
  const idAlvo = lerId(req.params.id);
  if (!idAlvo) return res.status(400).json({ mensagem: 'ID de usuário inválido.' });

  if (idAlvo === Number(req.usuario.id)) {
    return res.status(400).json({ mensagem: 'Você não pode excluir sua própria conta pelo painel administrativo.' });
  }

  const { confirmacao } = req.body ?? {};
  if (!ehTexto(confirmacao) || confirmacao.trim() !== 'EXCLUIR') {
    return res.status(400).json({ mensagem: 'Digite EXCLUIR para confirmar a exclusão do usuário.' });
  }

  let conexao;
  try {
    const reauth = await verificarReconfirmacaoAdmin(dbp, req.usuario.id, req.body);
    if (!reauth.ok) {
      return res.status(reauth.status).json({ mensagem: reauth.mensagem });
    }

    conexao = await dbp.getConnection();
    await conexao.beginTransaction();

    const [linhas] = await conexao.query(
      'SELECT id, nome, email, eh_admin, foto_file_id FROM usuarios WHERE id = ? FOR UPDATE',
      [idAlvo]
    );
    const alvo = linhas[0];
    if (!alvo) {
      await conexao.rollback();
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    if (Number(alvo.eh_admin) === 1) {
      const outros = await contarOutrosAdminsAtivos(conexao, idAlvo);
      if (outros === 0) {
        await conexao.rollback();
        return res.status(409).json({ mensagem: 'Não é possível excluir o único administrador ativo do sistema.' });
      }
    }

    await conexao.query('DELETE FROM tokens_verificacao WHERE id_usuario = ?', [idAlvo]);
    await conexao.query('DELETE FROM favoritos WHERE id_usuario = ?', [idAlvo]);
    await conexao.query('DELETE FROM avaliacoes WHERE id_usuario = ?', [idAlvo]);
    await conexao.query('DELETE FROM usuarios WHERE id = ?', [idAlvo]);

    await conexao.commit();

    if (alvo.foto_file_id) {
      apagarImagem(alvo.foto_file_id).catch(e => console.error('Falha ao apagar foto do usuário excluído:', e.message));
    }

    await registrarAuditoria(req, {
      acao: ACOES_AUDITORIA.EXCLUIR_USUARIO,
      alvoTipo: 'usuario',
      alvoId: idAlvo,
      detalhes: `${alvo.nome} (${alvo.email})`
    });

    return res.json({ mensagem: 'Usuário excluído permanentemente.' });
  } catch (erro) {
    if (conexao) await conexao.rollback().catch(() => {});
    return erroInterno(res, 'Erro ao excluir usuário:', erro);
  } finally {
    if (conexao) conexao.release();
  }
});

/* ==========================================
   AVALIAÇÕES (MODERAÇÃO)
   ========================================== */
router.get('/avaliacoes', async (req, res) => {
  const busca = limparBusca(req.query.busca);
  const notaFiltro = req.query.nota ? parseInt(req.query.nota, 10) : NaN;
  const idCategoria = req.query.id_categoria ? lerId(req.query.id_categoria) : NaN;
  const { pagina, limite, offset } = lerPaginacao(req.query, 10, 50);

  const colunaOrdem = ORDEM_AVALIACOES[req.query.ordenar] || 'a.id';
  const direcaoOrdem = req.query.direcao === 'asc' ? 'ASC' : 'DESC';

  const condicoes = [];
  const params = [];

  if (busca) {
    const padrao = `%${escaparLike(busca)}%`;
    condicoes.push("(p.nome LIKE ? ESCAPE '\\\\' OR u.nome LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\' OR COALESCE(a.tags, '') LIKE ? ESCAPE '\\\\')");
    params.push(padrao, padrao, padrao, padrao);
  }
  if (Number.isInteger(notaFiltro) && notaFiltro >= 1 && notaFiltro <= 5) {
    condicoes.push('a.nota = ?');
    params.push(notaFiltro);
  }
  if (Number.isInteger(idCategoria) && idCategoria > 0) {
    condicoes.push('p.id_categoria = ?');
    params.push(idCategoria);
  }

  const whereSql = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';
  const fromJoinSql = `
    FROM avaliacoes a
    JOIN pontos p ON p.id = a.id_ponto
    JOIN categorias c ON c.id = p.id_categoria
    JOIN usuarios u ON u.id = a.id_usuario
  `;

  try {
    const [[contagem]] = await dbp.query(`SELECT COUNT(*) AS total ${fromJoinSql} ${whereSql}`, params);
    const total = Number(contagem?.total || 0);

    const [linhas] = await dbp.query(
      `SELECT a.id, a.id_ponto, a.id_usuario, a.nota, a.tags,
              p.nome AS ponto_nome, c.nome AS categoria_nome,
              u.nome AS usuario_nome, u.email AS usuario_email, u.bloqueado AS usuario_bloqueado
       ${fromJoinSql}
       ${whereSql}
       ORDER BY ${colunaOrdem} ${direcaoOrdem}, a.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limite, offset]
    );

    const itens = linhas.map((a) => ({
      ...a,
      nota: Number(a.nota),
      usuario_bloqueado: Number(a.usuario_bloqueado) === 1
    }));

    return res.json({
      itens,
      total,
      pagina,
      limite,
      totalPaginas: Math.max(1, Math.ceil(total / limite))
    });
  } catch (erro) {
    return erroInterno(res, 'Erro ao listar avaliações:', erro);
  }
});

router.delete('/avaliacoes/:id', limitadorAdmin, async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ mensagem: 'ID da avaliação inválido.' });

  try {
    const [linhas] = await dbp.query(
      `SELECT a.id, a.nota, p.nome AS ponto_nome, u.nome AS usuario_nome, u.email AS usuario_email
       FROM avaliacoes a
       JOIN pontos p ON p.id = a.id_ponto
       JOIN usuarios u ON u.id = a.id_usuario
       WHERE a.id = ? LIMIT 1`,
      [id]
    );
    const av = linhas[0];
    if (!av) {
      return res.status(404).json({ mensagem: 'Avaliação não encontrada.' });
    }

    await dbp.query('DELETE FROM avaliacoes WHERE id = ?', [id]);
    await registrarAuditoria(req, {
      acao: ACOES_AUDITORIA.EXCLUIR_AVALIACAO,
      alvoTipo: 'avaliacao',
      alvoId: id,
      detalhes: `Ponto: "${av.ponto_nome}" | Autor: ${av.usuario_nome} (${av.usuario_email}) | Nota: ${av.nota}/5`
    });

    return res.json({ mensagem: 'Avaliação excluída com sucesso.' });
  } catch (erro) {
    return erroInterno(res, 'Erro ao excluir avaliação:', erro);
  }
});

/* ==========================================
   AUDITORIA (SOMENTE LEITURA)
   ========================================== */
router.get('/auditoria', async (req, res) => {
  const busca = limparBusca(req.query.busca);
  const acao = ehTexto(req.query.acao) && ACOES_AUDITORIA_VALIDAS.has(req.query.acao) ? req.query.acao : '';
  const alvoTipo = ehTexto(req.query.alvo_tipo) && ALVOS_AUDITORIA_VALIDOS.has(req.query.alvo_tipo) ? req.query.alvo_tipo : '';
  const { pagina, limite, offset } = lerPaginacao(req.query, 10, 50);

  const colunaOrdem = ORDEM_AUDITORIA[req.query.ordenar] || 'l.criado_em';
  const direcaoOrdem = req.query.direcao === 'asc' ? 'ASC' : 'DESC';

  const condicoes = [];
  const params = [];

  if (busca) {
    const padrao = `%${escaparLike(busca)}%`;
    condicoes.push("(COALESCE(l.admin_nome, '') LIKE ? ESCAPE '\\\\' OR COALESCE(l.admin_email, '') LIKE ? ESCAPE '\\\\' OR COALESCE(l.detalhes, '') LIKE ? ESCAPE '\\\\')");
    params.push(padrao, padrao, padrao);
  }
  if (acao) {
    condicoes.push('l.acao = ?');
    params.push(acao);
  }
  if (alvoTipo) {
    condicoes.push('l.alvo_tipo = ?');
    params.push(alvoTipo);
  }

  const whereSql = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

  try {
    const [[contagem]] = await dbp.query(`SELECT COUNT(*) AS total FROM logs_admin l ${whereSql}`, params);
    const total = Number(contagem?.total || 0);

    const [linhas] = await dbp.query(
      `SELECT l.id, l.id_admin, l.admin_nome, l.admin_email, l.acao, l.alvo_tipo, l.alvo_id, l.detalhes, l.ip, l.criado_em
       FROM logs_admin l
       ${whereSql}
       ORDER BY ${colunaOrdem} ${direcaoOrdem}, l.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limite, offset]
    );

    return res.json({
      itens: linhas,
      total,
      pagina,
      limite,
      totalPaginas: Math.max(1, Math.ceil(total / limite))
    });
  } catch (erro) {
    return erroInterno(res, 'Erro ao consultar auditoria:', erro);
  }
});

module.exports = router;
