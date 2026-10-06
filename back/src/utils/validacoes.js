const dns = require('dns');

function ehTexto(valor) {
  return typeof valor === 'string';
}

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
  const diferencaMes = hoje.getMonth() - nascimento.getMonth();

  if (diferencaMes < 0 || (diferencaMes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade >= 3 && idade <= 110;
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

module.exports = { ehTexto, validarDominioEmail, validarDataNascimento, lerId, lerNumero };