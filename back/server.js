require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const dns = require('dns');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit')
const jwt = require('jsonwebtoken');

const app = express();

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
        rejectUnauthorized: false
    }
});
db.connect((err) => {
    if (err) {
        console.error('Erro de conexão:', err.message);
        return;
    }
    console.log('Conectado ao banco de dados com sucesso!');
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

app.get('/api/pontos', (req, res) => {
    const query = `
    SELECT p.*, 
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
            return res.status(500).json(erro);
        };
        res.json(results);
    });
});

app.get('/api/pontos/:id', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT p.*,
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
            return res.status(500).json({ mensagem: "Erro ao buscar o ponto", erro });
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
        SELECT a.id, a.nota, a.tags, u.nome AS usuario_nome
        FROM avaliacoes a
        JOIN usuarios u ON a.id_usuario =u.id
        WHERE a.id_ponto=?
        ORDER BY a.id DESC`;
    db.query(query, [id], (erro, results) => {
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
    const { nome, data_nascimento, email, senha } = req.body;

    if (!nome || !data_nascimento || !email || !senha) {
        return res.status(400).json({ mensagem: 'Preencha todos os campos obrigatórios!' });
    }
    if (senha.length < 6) {
        return res.status(400).json({ mensagem: 'A senha precisa ter 6 ou mais caracteres!' });
    }
    const emailValido = await validarDominioEmail(email);
    if (!emailValido) {
        return res.status(400).json({ mensagem: 'O domínio do e-mail digitado não existe ou não pode receber mensagens!' });
    }

    const checkQuery = 'SELECT * FROM usuarios WHERE email = ?';
    db.query(checkQuery, [email], async (err, results) => {
        if (err) return res.status(500).json({ mensagem: 'Erro no servidor', erro: err });

        if (results.length > 0) {
            return res.status(400).json({ mensagem: 'Este e-mail já está cadastrado!' });
        }

        try {
            const salt = await bcrypt.genSalt(10);
            const senhaHash = await bcrypt.hash(senha, salt);

            const insertQuery = 'INSERT INTO usuarios (nome, data_nascimento, email, senha) VALUES (?, ?, ?, ?)';
            db.query(insertQuery, [nome, data_nascimento, email, senhaHash], (err, result) => {
                if (err) return res.status(500).json({ mensagem: 'Erro ao cadastrar', erro: err });

                return res.status(201).json({
                    mensagem: 'Usuário cadastrado com sucesso!',
                    id: result.insertId
                });
            });
        } catch (error) {
            return res.status(500).json({ mensagem: 'Erro ao processar senha' });
        }
    });
});
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
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
        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha
        );
        if (!senhaValida) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha incorretos!'
            });
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

const tagsPermitidas=[
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
    let tagsFiltradas=[];
    if (typeof tags === 'string' && tags.trim !=='') {
        const arrayTagsEnviadas = tags.split(',').map(t => t.trim());
        tagsFiltradas = arrayTagsEnviadas.filter(tag => tagsPermitidas.includes(tag));
    }
    const tagsParaSalvar= tagsFiltradas.join(', ');

    const usuarioId = req.usuario.id;
    const checkUserQuery =
        'SELECT id FROM usuarios WHERE id = ?';

    db.query( checkUserQuery, [usuarioId], (errUser, userResults) => {
            if (errUser) {
                console.error(errUser);
                return res.status(500).json({ mensagem: 'Erro interno no servidor.'});
            }
            if (userResults.length === 0) {
                return res.status(401).json({mensagem: 'Usuário não encontrado.'});
            }
            const query = `
                INSERT INTO avaliacoes
                (id_usuario, id_ponto, nota, tags)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                nota = VALUES(nota),
                tags = VALUES(tags)
            `;

            db.query(query,[ usuarioId, pontoId,notaNumero,tagsParaSalvar],
                (err) => {
                    if (err) {
                        console.error('Erro ao salvar avaliação:', err  );
                        return res.status(500).json({ mensagem:'Erro interno no banco de dados.'});
                    }
                    return res.json({mensagem:'Avaliação salva com sucesso!'
                    });
                }
            );
        }
    );
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`servidor rodando na porta ${PORT}`));