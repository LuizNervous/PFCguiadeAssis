const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbp } = require('../config/db');
const { gerarCodigo, hashCodigo, conferirCodigo } = require('../utils/codigos');
const { emailCodigoCadastro, emailRecuperacaoSenha } = require('../services/email');
const { ehTexto, validarDataNascimento, validarDominioEmail } = require('../utils/validacoes');

const router = express.Router();
const segredo = process.env.JWT_SECRET;
const MAX_TENTATIVAS = 5;

async function emitirCodigoCadastro(usuario) {
    const [recentes] = await dbp.query(
        `SELECT id FROM tokens_verificacao
         WHERE id_usuario = ? AND tipo = 'cadastro'
           AND criado_em > DATE_SUB(NOW(), INTERVAL 60 SECOND)`,
        [usuario.id]
    );
    if (recentes.length > 0) return false;

    await dbp.query(
        `DELETE FROM tokens_verificacao WHERE id_usuario = ? AND tipo = 'cadastro'`,
        [usuario.id]
    );

    const codigo = gerarCodigo();
    const [resultadoToken] = await dbp.query(
        `INSERT INTO tokens_verificacao (id_usuario, tipo, token_hash, expira_em)
         VALUES (?, 'cadastro', ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
        [usuario.id, hashCodigo(codigo)]
    );

    try {
        await emailCodigoCadastro(usuario.email, usuario.nome, codigo);
        return true;
    } catch (erro) {
        await dbp.query('DELETE FROM tokens_verificacao WHERE id = ?', [resultadoToken.insertId]);
        throw erro;
    }
}

async function emitirCodigoRecuperacao(usuario) {
    const [recentes] = await dbp.query(
        `SELECT id FROM tokens_verificacao
         WHERE id_usuario=? AND tipo= 'recuperacao'
         AND criado_em > DATE_SUB(NOW(), INTERVAL 60 SECOND)`,
        [usuario.id]);
    if (recentes.length > 0) return false;

    await dbp.query(
        `DELETE FROM tokens_verificacao WHERE id_usuario = ? AND tipo = 'recuperacao'`,
        [usuario.id]
    );
    const codigo = gerarCodigo();
    const [resultadoToken] = await dbp.query(
        `INSERT INTO tokens_verificacao (id_usuario, tipo, token_hash, expira_em)
        VALUES (?, 'recuperacao', ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
        [usuario.id, hashCodigo(codigo)]
    );
    try {
        await emailRecuperacaoSenha(usuario.email, usuario.nome, codigo);
        return true;
    } catch (erro) {
        await dbp.query('DELETE FROM tokens_verificacao WHERE id=?', [resultadoToken.insertId]);
        throw erro;
    }
};

router.post('/cadastro', async (req, res) => {
    const { nome, data_nascimento, email, senha } = req.body ?? {};

    if (![nome, data_nascimento, email, senha].every(ehTexto)) {
        return res.status(400).json({ mensagem: 'Dados inválidos.' });
    }

    const nomeLimpo = nome.trim().replace(/\s+/g, ' ');
    const dataLimpa = data_nascimento.trim();
    const emailLimpo = email.trim().toLowerCase();

    if (!nomeLimpo || !dataLimpa || !emailLimpo || !senha) {
        return res.status(400).json({ mensagem: 'Preencha todos os campos obrigatórios!' });
    }

    if (nomeLimpo.length < 3 || !nomeLimpo.includes(' ')) {
        return res.status(400).json({ mensagem: 'Por favor, digite seu nome e sobrenome.' });
    }

    if (!validarDataNascimento(dataLimpa)) {
        return res.status(400).json({ mensagem: 'Data de nascimento inválida.' });
    }

    if (senha.length < 6) {
        return res.status(400).json({ mensagem: 'A senha precisa ter no mínimo 6 caracteres!' });
    }
    if (senha.length > 72) {
        return res.status(400).json({ mensagem: 'A senha pode ter no máximo 72 caracteres!' });
    }
    if (!/[A-Z]/.test(senha)) {
        return res.status(400).json({ mensagem: 'A senha precisa ter pelo menos 1 letra maiúscula!' });
    }
    if (!/[0-9]/.test(senha)) {
        return res.status(400).json({ mensagem: 'A senha precisa ter pelo menos 1 número!' });
    }
    if (!/[^a-zA-Z0-9]/.test(senha)) {
        return res.status(400).json({ mensagem: 'A senha precisa ter um caractere especial!' });
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(emailLimpo)) {
        return res.status(400).json({ mensagem: 'Formato de e-mail inválido!' });
    }

    const emailValido = await validarDominioEmail(emailLimpo);
    if (!emailValido) {
        return res.status(400).json({ mensagem: 'O domínio do e-mail digitado não existe ou não pode receber mensagens!' });
    }

    try {
        const [existentes] = await dbp.query(
            'SELECT id, email_verificado FROM usuarios WHERE email = ?',
            [emailLimpo]
        );

        if (existentes.length > 0 && Number(existentes[0].email_verificado) === 1) {
            return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado!' });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        let usuarioId;

        if (existentes.length > 0) {
            usuarioId = existentes[0].id;
            await dbp.query(
                'UPDATE usuarios SET nome = ?, data_nascimento = ?, senha = ? WHERE id = ? AND email_verificado = 0',
                [nomeLimpo, dataLimpa, senhaHash, usuarioId]
            );
        } else {
            const [resultado] = await dbp.query(
                'INSERT INTO usuarios (nome, data_nascimento, email, senha, email_verificado) VALUES (?, ?, ?, ?, 0)',
                [nomeLimpo, dataLimpa, emailLimpo, senhaHash]
            );
            usuarioId = resultado.insertId;
        }

        let mensagem = 'Enviamos um código de verificação para o seu e-mail.';
        try {
            const enviado = await emitirCodigoCadastro({ id: usuarioId, nome: nomeLimpo, email: emailLimpo });
            if (!enviado) {
                mensagem = 'Um código já foi enviado recentemente para o seu e-mail. Verifique sua caixa de entrada.';
            }
        } catch (erro) {
            console.error('Falha ao enviar e-mail de verificação:', erro.message);
            mensagem = 'Cadastro criado, mas não conseguimos enviar o e-mail agora. Na próxima tela, peça o reenvio do código.';
        }

        return res.status(201).json({ mensagem, precisaVerificar: true });
    } catch (erro) {
        console.error('Erro ao cadastrar:', erro);
        return res.status(500).json({ mensagem: 'Erro ao cadastrar' });
    }
});

router.post('/verificar-email', async (req, res) => {
    const { email, codigo } = req.body ?? {};

    if (!ehTexto(email) || !ehTexto(codigo) || !/^\d{6}$/.test(codigo.trim())) {
        return res.status(400).json({ mensagem: 'Informe o código de 6 dígitos.' });
    }

    const emailLimpo = email.trim().toLowerCase();
    const codigoLimpo = codigo.trim();
    const invalido = { mensagem: 'Código incorreto ou expirado.' };

    try {
        const [usuarios] = await dbp.query(
            'SELECT id, nome, email, email_verificado FROM usuarios WHERE email = ?',
            [emailLimpo]
        );
        const usuario = usuarios[0];
        if (!usuario) return res.status(400).json(invalido);

        if (Number(usuario.email_verificado) === 1) {
            return res.status(400).json({ mensagem: 'Este e-mail já foi verificado. Faça login.' });
        }

        const [tokens] = await dbp.query(
            `SELECT id, token_hash FROM tokens_verificacao
             WHERE id_usuario = ? AND tipo = 'cadastro' AND usado_em IS NULL AND expira_em > NOW()
             ORDER BY id DESC LIMIT 1`,
            [usuario.id]
        );
        const token = tokens[0];
        if (!token) return res.status(400).json(invalido);

        const [tentativa] = await dbp.query(
            'UPDATE tokens_verificacao SET tentativas = tentativas + 1 WHERE id = ? AND tentativas < ?',
            [token.id, MAX_TENTATIVAS]
        );
        if (tentativa.affectedRows === 0) {
            return res.status(429).json({ mensagem: 'Muitas tentativas. Peça um novo código.' });
        }

        if (!conferirCodigo(codigoLimpo, token.token_hash)) {
            return res.status(400).json(invalido);
        }

        await dbp.query('UPDATE tokens_verificacao SET usado_em = NOW() WHERE id = ?', [token.id]);
        await dbp.query('UPDATE usuarios SET email_verificado = 1 WHERE id = ?', [usuario.id]);

        const jwtToken = jwt.sign({ id: usuario.id }, segredo, { expiresIn: '2h' });
        return res.json({
            mensagem: 'E-mail verificado com sucesso!',
            token: jwtToken,
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }
        });
    } catch (erro) {
        console.error('Erro ao verificar e-mail:', erro);
        return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
});

router.post('/reenviar-codigo', async (req, res) => {
    const { email } = req.body ?? {};
    if (!ehTexto(email) || !email.trim()) {
        return res.status(400).json({ mensagem: 'Informe o e-mail.' });
    }

    try {
        const [usuarios] = await dbp.query(
            'SELECT id, nome, email, email_verificado FROM usuarios WHERE email = ?',
            [email.trim().toLowerCase()]
        );
        const usuario = usuarios[0];
        if (usuario && Number(usuario.email_verificado) === 0) {
            await emitirCodigoCadastro(usuario);
        }
    } catch (erro) {
        console.error('Erro ao reenviar código:', erro.message);
        return res.status(500).json({ mensagem: 'Não foi possível enviar o código agora. Tente novamente em instantes.' });
    }

    return res.json({ mensagem: 'Se houver um cadastro pendente com esse e-mail, enviamos um novo código.' });
});

router.post('/login', async (req, res) => {
    const { email, senha } = req.body ?? {};

    if (!ehTexto(email) || !ehTexto(senha) || !email.trim() || !senha) {
        return res.status(400).json({ mensagem: 'Informe e-mail e senha!' });
    }

    if (senha.length > 72) {
        return res.status(401).json({ mensagem: 'E-mail ou senha incorretos!' });
    }

    const emailLimpo = email.trim().toLowerCase();

    try {
        const [results] = await dbp.query('SELECT * FROM usuarios WHERE email = ?', [emailLimpo]);
        const usuario = results[0];

        if (!usuario) {
            return res.status(401).json({ mensagem: 'E-mail ou senha incorretos!' });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ mensagem: 'E-mail ou senha incorretos!' });
        }

        if (Number(usuario.email_verificado) !== 1) {
            try {
                await emitirCodigoCadastro(usuario);
            } catch (erro) {
                console.error('Falha ao reenviar código no login:', erro.message);
            }
            return res.status(403).json({
                mensagem: 'Seu e-mail ainda não foi verificado. Digite o código enviado para ele.',
                precisaVerificar: true
            });
        }

        const token = jwt.sign({ id: usuario.id }, segredo, { expiresIn: '2h' });

        return res.json({
            mensagem: 'Login efetuado com sucesso!',
            token: token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });
    } catch (erro) {
        console.error('Erro no login:', erro);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});
router.post('/esqueci-senha', async (req, res) => {
    const { email } = req.body ?? {};

    if (!ehTexto || !email.trim()) {
        return res.status(400).json({ mensagem: "Informe um e-mail válido." });
    }
    const emailLimpo = email.trim().toLowerCase();

    try {
        const [usuarios] = await dbp.query(
            'SELECT id,nome,email FROM usuarios WHERE email =?', [email]
        );
        const usuario = usuarios[0];
        if (usuario) {
            await emitirCodigoRecuperacao(usuario);
        }
    } catch (erro) {
        console.error("Erro ao processar recuperação de senha:", erro.message);
        return res.status(500).json({ mensagem: 'Não foi possivel enviar o código agora. Tente novamente em instantes' })
    }
    return res.json({
        mensagem: 'Se o e-mail estiver cadastrado, enviamos um código de 6 dígitos para ele.'
    });
});
router.post('/redefinir-senha', async (req, res) => {
    const { email, codigo, novaSenha } = req.body ?? {};

    if (![email, codigo, novaSenha].every(ehTexto)) {
        return res.status(400).json({ mensagem: 'Dados inválidos.' });
    }

    const emailLimpo = email.trim().toLowerCase();
    const codigoLimpo = codigo.trim();

    if (!/^\d{6}$/.test(codigoLimpo)) {
        return res.status(400).json({ mensagem: 'Informe o código numérico de 6 dígitos.' });
    }

    if (novaSenha.length < 6) {
        return res.status(400).json({ mensagem: 'A nova senha precisa ter no mínimo 6 caracteres!' });
    }
    if (novaSenha.length > 72) {
        return res.status(400).json({ mensagem: 'A nova senha pode ter no máximo 72 caracteres!' });
    }
    if (!/[A-Z]/.test(novaSenha)) {
        return res.status(400).json({ mensagem: 'A nova senha precisa ter pelo menos 1 letra maiúscula!' });
    }
    if (!/[0-9]/.test(novaSenha)) {
        return res.status(400).json({ mensagem: 'A nova senha precisa ter pelo menos 1 número!' });
    }
    if (!/[^a-zA-Z0-9]/.test(novaSenha)) {
        return res.status(400).json({ mensagem: 'A nova senha precisa ter um caractere especial!' });
    }
    const invalido = { mensagem: "Código incorreto ou expirado." }

    try {
        const [usuarios] = await dbp.query(
            'SELECT id, senha FROM usuarios WHERE email=?', [emailLimpo]
        );
        const usuario = usuarios[0]
        if (!usuario) {
            return res.status(400).json(invalido);
        }
        const [tokens] = await dbp.query(
            `SELECT id, token_hash FROM tokens_verificacao
             WHERE id_usuario=? AND tipo= 'recuperacao' AND usado_em IS NULL AND expira_em > NOW()
             ORDER BY id DESC LIMIT 1`, [usuario.id]);
        const token = tokens[0];
        if (!token) return res.status(400).json(invalido);

        const [tentativa] = await dbp.query('UPDATE token_verificacao SET tentativas + 1 WHERE id =? AND tentativas < ?', [token.id, MAX_TENTATIVAS]);
        if (tentativa.affectedRows === 0) {
            return res.status(429).json({ mensagem: "Muitas tentativas incorretas. Solicite um novo código. " });
        }

        if (!conferirCodigo(codigoLimpo, token.token_hash)) {
            return res.status(400).json(invalido);
        }

        const mesmaSenha = await bcrypt.compare(novaSenha, usuario.senha);
        if (mesmaSenha) {
            return res.status(400).json({ mensagem: "A nova senha não pode ser igual à senha anterior." });
        }
        const salt=await bcrypt.genSalt(10);
        const senhaHash=await bcrypt.hash(novaSenha, salt);

        await dbp('UPDATE tokens_verificação SET usado_em = NOW() WHERE id=?', [token.id]);
        await dbp('UPDATE usuarios SET senha=?, email_verificado=1 WHERE id=?', [senhaHash, usuario.id]);

        return res.json({mensagem:'Senha redefinida com sucesso! Faça o login com a nova senha.'})
    } catch (erro) {
        console.error('Erro ao redefinir a senha: ', erro);
        return res.status(500).json({mensagem:"Erro interno no servidor"});
    }
});

module.exports = router;