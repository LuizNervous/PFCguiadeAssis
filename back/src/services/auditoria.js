const { dbp } = require("../config/db");

const ACOES_AUDITORIA = Object.freeze({
  PROMOVER_ADMIN: "PROMOVER_ADMIN",
  REBAIXAR_ADMIN: "REBAIXAR_ADMIN",
  BLOQUEAR_USUARIO: "BLOQUEAR_USUARIO",
  DESBLOQUEAR_USUARIO: "DESBLOQUEAR_USUARIO",
  EXCLUIR_USUARIO: "EXCLUIR_USUARIO",
  CRIAR_PONTO: "CRIAR_PONTO",
  EDITAR_PONTO: "EDITAR_PONTO",
  EXCLUIR_PONTO: "EXCLUIR_PONTO",
  CRIAR_CATEGORIA: "CRIAR_CATEGORIA",
  EDITAR_CATEGORIA: "EDITAR_CATEGORIA",
  EXCLUIR_CATEGORIA: "EXCLUIR_CATEGORIA",
  EXCLUIR_AVALIACAO: "EXCLUIR_AVALIACAO",
});

async function registrarAuditoria(
  req,
  { acao, alvoTipo, alvoId = null, detalhes = null },
  executor = dbp,
) {
  const idAdmin = req?.usuario?.id ?? null;
  const adminNome = req?.usuario?.nome
    ? String(req.usuario.nome).slice(0, 150)
    : null;
  const adminEmail = req?.usuario?.email
    ? String(req.usuario.email).slice(0, 255)
    : null;
  const ip = req?.ip ? String(req.ip).slice(0, 45) : null;
  const detalhesLimpo = detalhes ? String(detalhes).slice(0, 500) : null;
  const alvoIdNumero =
    Number.isInteger(Number(alvoId)) && Number(alvoId) > 0
      ? Number(alvoId)
      : null;

  try {
    await executor.query(
      `INSERT INTO logs_admin (id_admin, admin_nome, admin_email, acao, alvo_tipo, alvo_id, detalhes, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idAdmin,
        adminNome,
        adminEmail,
        String(acao).slice(0, 60),
        String(alvoTipo).slice(0, 30),
        alvoIdNumero,
        detalhesLimpo,
        ip,
      ],
    );
  } catch (erro) {
    console.error("Falha ao registrar log de auditoria:", erro.message);
  }
}

module.exports = { ACOES_AUDITORIA, registrarAuditoria };
