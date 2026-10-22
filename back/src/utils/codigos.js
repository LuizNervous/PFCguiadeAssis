const crypto = require('crypto');

function gerarCodigo() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashCodigo(codigo) {
  return crypto.createHmac('sha256', process.env.CODIGO_SECRET).update(codigo).digest('hex');
}

function conferirCodigo(codigo, hashSalvo) {
  const a = Buffer.from(hashCodigo(codigo), 'hex');
  const b = Buffer.from(hashSalvo, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { gerarCodigo, hashCodigo, conferirCodigo };