const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { ehTexto, validarDataNascimento, validarDominioEmail } = require('../utils/validacoes');

const router = express.Router();
const segredo = process.env.JWT_SECRET;

router.post('/cadastro', async (req, res) => {
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
                    { expiresIn: '2h', algorithm: 'HS256' }
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


router.post('/login', (req, res) => {
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
            { expiresIn: '2h', algorithm: 'HS256' }
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
module.exports = router;