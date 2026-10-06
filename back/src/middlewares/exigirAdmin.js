const dbp=require('../config/db');


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

module.exports= exigirAdmin ;