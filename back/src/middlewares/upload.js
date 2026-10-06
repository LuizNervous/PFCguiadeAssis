const multer = require('multer');


const uploadPonto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 8, fieldSize: 8 * 1024 },
  fileFilter: (req, file, cb) => {
    const permitido = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (!permitido) req.imagemRejeitada = true;
    cb(null, permitido);
  }
});
 function receberImagemPonto(req, res, next) {
  uploadPonto.single('imagem')(req, res, (erro) => {
    if (erro) {
      if (erro instanceof multer.MulterError) {

        if (erro.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ mensagem: 'A imagem é grande demais (máximo 5 MB).' });
        }
        return res.status(400).json({ mensagem: 'Envio inválido.' });
      }

      console.error('Erro inesperado ao receber o formulário:', erro);
      return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
    if (req.imagemRejeitada) {
      return res.status(400).json({ mensagem: 'Envie uma imagem JPEG, PNG ou WebP.' });
    }
    next();
  });
}

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


module.exports = { receberImagemPonto, receberFoto };