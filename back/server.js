require('dotenv').config({ path: './back/.env' });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const dns = require('dns');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit')
const jwt = require('jsonwebtoken');
const multer = require('multer');

const { PASTAS, PRESETS, ImagemInvalidaError, detectarFormato, prepararImagem, enviarImagem, apagarImagem } = require('./imagens');
const path = require('path');

const app = express();
app.use(cors())
app.use(express.json({ limit: '10kb' }));
app.set('trust proxy', 1);
app.use(helmet());

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

app.use('/api/cadastro', limitadorRigoroso);
app.use('/api/login', limitadorRigoroso);
app.use('/api/', limitadorGeral);

const segredo = process.env.JWT_SECRET;

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: true,
        ca: process.env.DB_CA
    }
});

function validarDominioEmail(email) {
    return new Promise((resolve) => {
        const dominio = email.split('@')[1];
        if (!dominio) return resolve(false);

        dns.resolveMx(dominio, (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                return resolve(false);
            }
            resolve(true);
        });
    });
}

function validarDataNascimento(dataString) {
    const nascimento = new Date(dataString);
    if (isNaN(nascimento.getTime())) return false;

    const hoje = new Date();
    if (nascimento > hoje) return false;

    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const diferencaMes = nascimento.getMonth() - hoje.getMonth();

    if (diferencaMes < 0 || (diferencaMes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }
    return idade >= 3 && idade <= 110;
}

function ehTexto(valor) {
    return typeof valor === 'string';
}

app.get('/api/pontos', (req, res) => {
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

app.get('/api/pontos/:id', (req, res) => {
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


app.get('/api/pontos/:id/avaliacoes', (req, res) => {
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

app.post('/api/cadastro', async (req, res) => {
    const { nome, data_nascimento, email, senha } = req.body ?? {};

    if (![nome, data_nascimento, email, senha].every(ehTexto)) {
        return res.status(400).json({ mensagem: 'Dados inválidos.' });
    }

    if (!nome || !data_nascimento || !email || !senha) {
        return res.status(400).json({ mensagem: 'Preencha todos os campos obrigatórios!' });
    }
    if (!validarDataNascimento(data_nascimento)) {
        return res.status(400).json({ mensagem: "Data de nascimento inválida." })
    }
    if (senha.length < 6) {
        return res.status(400).json({ mensagem: 'A senha precisa ter 6 caracteres no minimo !' });
    }
    if (!/[A-Z]/.test(senha)) {
        return res.status(400).json({ mensagem: 'A senha precisa ter 1 letra maiúscula!' });
    }
    if (!/[^a-zA-Z0-9]/.test(senha)) {
        return res.status(400).json({ mensagem: 'A senha precisa ter um caractere especial' });
    }
    const emailValido = await validarDominioEmail(email);
    if (!emailValido) {
        return res.status(400).json({ mensagem: 'O domínio do e-mail digitado não existe ou não pode receber mensagens!' });
    }

    const checkQuery = 'SELECT * FROM usuarios WHERE email = ?';
    db.query(checkQuery, [email], async (err, results) => {
        if (err) {
            console.error("Erro ao verificar e-mail:", err);
            return res.status(500).json({ mensagem: 'Erro no servidor' });
        }

        if (results.length > 0) {
            return res.status(400).json({ mensagem: 'Este e-mail já está cadastrado!' });
        }

        try {
            const salt = await bcrypt.genSalt(10);
            const senhaHash = await bcrypt.hash(senha, salt);

            const insertQuery = 'INSERT INTO usuarios (nome, data_nascimento, email, senha) VALUES (?, ?, ?, ?)';
            db.query(insertQuery, [nome, data_nascimento, email, senhaHash], (err, result) => {
                if (err) {
                    console.error("Erro ao cadastrar:", err);
                    return res.status(500).json({ mensagem: 'Erro ao cadastrar' });
                }

                const usuarioCriado = {
                    id: result.insertId,
                    nome: nome,
                    email: email
                }
                const token = jwt.sign(
                    { id: usuarioCriado.id },
                    segredo,
                    { expiresIn: '2h' }
                )
                return res.status(201).json({
                    mensagem: 'Usuário cadastrado com sucesso!',
                    usuario: usuarioCriado,
                    token: token
                });
            });
        } catch (error) {
            return res.status(500).json({ mensagem: 'Erro ao processar senha' });
        }
    });
});
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body ?? {};

    if (!ehTexto(senha) || !ehTexto(email) || !email || !senha) {
        return res.status(400).json({
            mensagem: 'Informe e-mail e senha!'
        });
    }

    const query = 'SELECT * FROM usuarios WHERE email = ?';

    db.query(query, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({
                mensagem: 'Erro interno no servidor'
            });
        }

        const usuario = results[0];

        if (!usuario) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha incorretos!'
            });
        }
        let senhaValida;
        try {
            senhaValida = await bcrypt.compare(senha, usuario.senha);
        } catch (erro) {
            console.error('Erro as comparar senha: ', erro);
            return res.status(500).json({ mensagem: 'Erro interno no servidor' });
        }
        if (!senhaValida) {
            return res.status(401).json({ mensagem: 'E-mail ou senha incorretos!' });
        }

        const token = jwt.sign(
            { id: usuario.id },
            segredo,
            { expiresIn: '2h' }
        );
        return res.json({
            mensagem: 'Login efetuado com sucesso!',
            token: token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });
    });
});

function autenticar(req, res, next) {
    const cabecalho = req.headers.authorization;

    if (!cabecalho) {
        return res.status(401).json({
            mensagem: 'Token não fornecido.'
        });
    }

    const partes = cabecalho.split(' ');

    if (partes.length !== 2 || partes[0] !== 'Bearer') {
        return res.status(401).json({
            mensagem: 'Formato do token inválido.'
        });
    }

    const token = partes[1];

    try {
        const usuario = jwt.verify(token, segredo);

        req.usuario = usuario;

        next();

    } catch (erro) {
        return res.status(401).json({
            mensagem: 'Token inválido ou expirado.'
        });
    }
}

const tagsPermitidas = [
    "Atendimento Ruim",
    "Lugar confortável",
    "Preço elevado",
    "Custo benefício",
    "Bom atendimento"
]

app.post('/api/avaliar', autenticar, (req, res) => {
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

const dbp = db.promise();

async function exigirAdmin(req, res, next) {
    try {
        const [linhas] = await dbp.query('SELECT eh_admin FROM usuarios WHERE id = ?', [req.usuario.id]);
        if (linhas.length === 0) {
            return res.status(401).json({ mensagem: 'Usuário não encontrado.' });
        }
        if (Number(linhas[0].eh_admin) !== 1) {
            return res.status(403).json({ mensagem: 'Acesso negado.' });
        }
        next();
    } catch (erro) {
        console.error('Erro ao verificar administrador:', erro);
        return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
}

app.get('/api/admin/verificar', autenticar, exigirAdmin, (req, res) => {
    res.json({ admin: true });
});

const uploadPonto = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 8, fieldSize: 8 * 1024 },
    fileFilter: (req, res, cb) => {
        const permitido = ['image/jpeg', 'image/webp', 'image/png'].includes(file.mimetype);
        if (!permitido) req.imagemRejeitada = true;
        cb(null, permitido);
    }
});

function receberImagemPonto(req, res, next) {
    uploadPonto.single('imagem')(req, res, (erro) => {
        if (erro) {
            if (erro.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ mensagem: "A imagem é grande demais (máximo 5 MB)." });
            }
            return res.status(400).json({ mensagem: "Envio inválido." });
        }
        if (req.imagemRejeitada) {
            return res.status(400).json({ mensagem: "Envie uma imagem JPEG, PNG ou WebP." })
        }
        next()
    });
}
function lerId(valor) {
    if (!ehTexto(valor) || valor.trim() === '') return NaN;
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        return NaN;
    }
    return numero;
}
function lerNumero(valor) {
    if (!ehTexto(valor) || valor.trim() === '') return NaN;
    return Number(valor);
}

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

app.get('/api/admin/categorias', autenticar, exigirAdmin, async (req, res) => {
    try {
        const [linhas] = await dbp.query('SELECT id,nome FROM categorias ORDER BY nome');
        res.json(linhas);
    } catch (erro) {
        erroInterno(res, 'Erro ao listar categorias :', erro);
    }
});

app.post('/api/admin/pontos', autenticar, exigirAdmin, receberImagemPonto, async (req, res) => {
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

app.put('/api/admin/pontos/:id', autenticar, exigirAdmin, receberImagemPonto, async (req, res) => {
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

app.delete('/api/admin/pontos/:id', autenticar, exigirAdmin, async (req, res) => {
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

const limitadorFotoPerfil = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    keyGenerator: (req) => String(req.usuario.id),
    message: { mensagem: 'Você trocou a foto muitas vezes. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
})

const uploadFoto = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
    fileFilter: (req, file, cb) => {
        const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, permitidos.includes(file.mimetype));
    }
});
function receberFoto(req, res, next) {
    uploadFoto.single('imagem')(req, res, (erro) => {
        if (!erro) return next();
        if (erro.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ mensagem: "A imagem é grande demais (máximo 5 MB)." })
        }
        return res.status(400).json({ mensagem: "Envio de imagem inválido ." })
    })
}

app.put('/api/usuario', autenticar, async (req, res) => {
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

app.get("/api/usuario", autenticar, async (req, res) => {
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

app.put('/api/usuario/foto', autenticar, limitadorFotoPerfil, receberFoto, async (req, res) => {
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

app.delete('/api/usuario/foto', autenticar, async (req, res) => {
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

app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);

    if (res.headersSent) {
        return next(err);
    }

    const status = err.status >= 400 && err.status < 500 ? err.status : 500;
    const mensagem = status === 500 ? 'Erro interno no servidor.' : 'Requisição inválida.';

    res.status(status).json({ mensagem });
});


const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`servidor rodando na porta ${PORT}`));