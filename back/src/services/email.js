const URL_API = 'https://api.brevo.com/v3/smtp/email';
const TIMEOUT_MS = 15_000;

function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function enviarEmail({ para, assunto, html }) {
  const chave = process.env.EMAIL_API_KEY;
  const remetente = process.env.EMAIL_FROM;
  if (!chave || !remetente) {
    throw new Error('EMAIL_API_KEY e EMAIL_FROM precisam estar configuradas no .env.');
  }

  const resposta = await fetch(URL_API, {
    method: 'POST',
    headers: {
      'api-key': chave,
      'Content-Type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Guia Assis', email: remetente },
      to: [{ email: para }],
      subject: assunto,
      htmlContent: html
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });

  if (!resposta.ok) {
    const detalheErro = await resposta.text().catch(() => 'Sem detalhes');
    throw new Error(`Provedor de e-mail respondeu ${resposta.status}: ${detalheErro}`);
  }
}

function emailCodigoCadastro(para, nome, codigo) {
  return enviarEmail({
    para,
    assunto: 'Seu código de verificação - Guia Assis',
    html: `
      <p>Olá, ${escaparHtml(nome)}!</p>
      <p>Seu código de verificação é:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${escaparHtml(codigo)}</p>
      <p>Ele vale por 15 minutos. Se você não criou uma conta no Guia Assis, ignore este e-mail.</p>`
  });
}
function emailRecuperacaoSenha(para, nome, codigo) {
  return enviarEmail({
    para,
    assunto: 'Código de recuperação de senha - Guia Assis',
    html: `
      <p>Olá, ${escaparHtml(nome)}!</p>
     <p>Recebemos uma solicitação para redefinir a senha da sua conta no Guia Assis.</p>
      <p>Seu código de recuperação é:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${escaparHtml(codigo)}</p>
      <p>Este código vale por 15 minutos. Se você não solicitou a troca de senha, ignore este e-mail com segurança.</p>`
  });
}

module.exports = { enviarEmail, emailCodigoCadastro, emailRecuperacaoSenha };