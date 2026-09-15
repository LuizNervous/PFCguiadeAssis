
const usuarioSalvo = localStorage.getItem("usuario");
const token = localStorage.getItem("token");

if (!token || !usuarioSalvo) {
  window.location.href = "../login/login.html";
}
else {
  const usuario = JSON.parse(usuarioSalvo);
  document.getElementById("nomeUsuario").textContent = usuario.nome;
  document.getElementById("emailUsuario").textContent = usuario.email;

  document.getElementById("nomeEditar").value = usuario.nome;
  document.getElementById("emailEditar").value = usuario.email;
}

document.getElementById("formMudarDados").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nomeEditar").value.trim();
  const email = document.getElementById("emailEditar").value.trim();

  try {
    const resposta = await fetch(`${API_URL}/usuario`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ nome, email })
    })
    const dados = await resposta.json();
    if (resposta.ok) {
      localStorage.setItem("usuario", JSON.stringify(dados.usuario));
      document.getElementById("nomeUsuario").textContent = dados.usuario.nome;
      document.getElementById("emailUsuario").textContent = dados.usuario.email;
      criarAlerta("Dados atualizados com sucesso!", 'alertBom', 3000);

    } else if (resposta.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");

      criarAlerta("Sua sessão expirou ou você não está logado. Faça login para continuar.", "alertRuim", 5000);
      criarAlerta(`Redirencionando para o Login...`, "alertRuim", 3600);

      const redirencionar = setTimeout(() => {
        window.location.href = "../login/login.html"
      }, 3400); return;

    } else {
      criarAlerta(dados.mensagem || "Erro ao atualizar os dados.", 'alertRuim', 5000)
    }
  } catch (erro) {
    console.error("Erro ao atualizar perfil:", erro);
    criarAlerta("Erro de conexão com o servidor.", 'alertRuim', 5000);

  }
});

const btnSair = document.getElementById("logOut");
btnSair.addEventListener("click", () => {
  localStorage.removeItem("usuario");
  localStorage.removeItem("token");
  window.location.href = "../index.html"
});