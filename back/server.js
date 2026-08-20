require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dns = require('dns');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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
     COUNT(a.id) AS total_avaliacoes
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
app.post('/api/avaliar' , (req,res) =>{
    const {id_usuario,id_ponto, nota}=req.body;
    if (!id_usuario||!id_ponto||!nota) {
        return res.status(400).json({mensagem:'Dados incompletos para a avaliação'})
    }
    const query=`
    INSERT INTO avaliacoes (id_usuario, id_ponto, nota)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE nota=VALUES(nota)
    `;
    db.query(query, [id_usuario, id_ponto, nota], (err, result)=>{
        if (err) {
            console.error('Erro ao salvar avaliação', err);
            return res.status(500).json({mensagem:'Erro interno no banco de dados'})
        }
        return res.json({mensagem:'Avaliação salva com sucesso!'})
    })
})
app.post('/api/cadastro', async (req, res) => {
    const { nome, data_nascimento, email, senha } = req.body;

    if (!nome || !data_nascimento || !email || !senha) {
        return res.status(400).json({ mensagem: 'Preencha todos os campos obrigatórios!' });
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

app.post('/api/login',(req,res)=>{  
    const {email,senha}=req.body;
    if (!email || !senha) {
        return res.status(400).json({mensagem:'Informe e-mail e senha!'});
    }
    const query='SELECT * FROM usuarios WHERE email=?';
    db.query(query,[email],async(err,results)=>{
        if (err) {
           return res.status(500).json({mensagem:"Erro interno no servidor"});
        }
        const usuario=results[0];
        if (!usuario) {
            return res.status(401).json({mensagem:"E-mail ou senha incorretos!"})
        }
        const senhaValida=await bcrypt.compare(senha,usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({mensagem:'E-mail ou senha incorretos!'});
        }
        return res.json({
            mensagem:'Login efetuado com sucesso!',
            usuario:{
                id:usuario.id,
                nome:usuario.nome,
                email:usuario.email
            }
        });
    });
  
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`servidor rodando na porta ${PORT}`));