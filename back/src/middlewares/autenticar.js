const jwt=require('jsonwebtoken');

const segredo=process.env.JWT_SECRET;

function autenticar(req, res, next) {
    const cabecalho = req.headers.authorization;
    if (!cabecalho) {
        return res.status(401).json({mensagem: 'Token não fornecido.' });
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
        return res.status(401).json({mensagem: 'Token inválido ou expirado.'});
    }
}

module.exports=autenticar;