

const api_url = 'https://guia-assis.onrender.com/api';

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
    const resposta = await fetch(`${api_url}/usuario`, {
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
      alert("Dados atualizados com sucesso!");
    } else {
      alert(dados.mensagem || "Erro ao atualizar os dados.");
    }
  } catch (erro) {
    console.error("Erro ao atualizar perfil:", erro);
    alert("Erro de conexão com o servidor.");
  }
});

const btnSair = document.getElementById("logOut");
btnSair.addEventListener("click", () => {
  localStorage.removeItem("usuario");
  localStorage.removeItem("token");
  window.location.href = "../index.html"
});