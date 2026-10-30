
const nomeGoogle = localStorage.getItem("nomeUsuario");
const emailGoogle = localStorage.getItem("emailUsuario");
const fotoGoogle = localStorage.getItem("fotoUsuario");

const usuarioSalvo = localStorage.getItem("usuario");
const token = localStorage.getItem("token");

const isGoogleUser = !!nomeGoogle;


if (!token && !isGoogleUser) {
  window.location.href = "../login/login.html";
} else if (isGoogleUser) {
  
  document.getElementById("nomeUsuario").textContent = nomeGoogle;
  document.getElementById("emailUsuario").textContent = emailGoogle || "Conta Google";
  document.getElementById("nomeEditar").value = nomeGoogle;
} else {
  
  const usuario = JSON.parse(usuarioSalvo);
  document.getElementById("nomeUsuario").textContent = usuario.nome;
  document.getElementById("emailUsuario").textContent = usuario.email;
  document.getElementById("nomeEditar").value = usuario.nome;
}


document.getElementById("formMudarDados").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("nomeEditar").value.trim();

 
  if (isGoogleUser) {
    localStorage.setItem("nomeUsuario", nome);
    document.getElementById("nomeUsuario").textContent = nome;
    criarAlerta("Nome atualizado com sucesso!", 'alertBom', 3000);
    return;
  }

  
  try {
    const resposta = await fetch(`${API_URL}/usuario`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ nome })
    })
    const dados = await resposta.json();
    if (resposta.ok) {
      localStorage.setItem("usuario", JSON.stringify(dados.usuario));
      document.getElementById("nomeUsuario").textContent = dados.usuario.nome;
      criarAlerta("Dados atualizados com sucesso!", 'alertBom', 3000);
    } else if (resposta.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      criarAlerta("Sua sessão expirou ou você não está logado. Faça login para continuar.", "alertRuim", 5000);
      setTimeout(() => {
        window.location.href = "../login/login.html"
      }, 3400);
    } else {
      criarAlerta(dados.mensagem || "Erro ao atualizar os dados.", 'alertRuim', 5000)
    }
  } catch (erro) {
    console.error("Erro ao atualizar perfil:", erro);
    criarAlerta("Erro de conexão com o servidor.", 'alertRuim', 5000);
  }
});

const foto_padrao = "/imagens/IUsuario.png";
const foto_tam_max = 5 * 1024 * 1024;
const foto_tipos = ['image/jpeg', 'image/png', 'image/webp'];

const fotoPerfil = document.getElementById("fotoPerfil");
const inputFoto = document.getElementById("inputFoto");
const btnTrocarFoto = document.getElementById("trocarFoto");
const btnRemoverFoto = document.getElementById("removerFoto");

function mostrarFoto(url) {
  fotoPerfil.src = url || foto_padrao;
  if (btnRemoverFoto) btnRemoverFoto.hidden = !url || isGoogleUser;
}

fotoPerfil.addEventListener('error', () => {
  if (!fotoPerfil.src.endsWith(foto_padrao)) {
    fotoPerfil.src = foto_padrao;
  }
});

function sessaoExpirou() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  criarAlerta("Sua sessão expirou. Faça login novamente.", "alertRuim", 5000);
  setTimeout(() => { window.location.href = "../login/login.html"; }, 2500);
}

async function carregarFoto() {
  if (isGoogleUser) {
    mostrarFoto(fotoGoogle);
    return;
  }
  try {
    const resposta = await fetch(`${API_URL}/usuario`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (resposta.status === 401) return sessaoExpirou();
    if (!resposta.ok) return;
    const dados = await resposta.json();
    mostrarFoto(dados.usuario.foto_url);
  } catch (erro) {
    console.error("Erro ao carregar a foto de perfil: ", erro);
  }
}


if (isGoogleUser) {
  mostrarFoto(fotoGoogle);
  
  if (btnTrocarFoto) btnTrocarFoto.style.display = "none";
  if (btnRemoverFoto) btnRemoverFoto.style.display = "none";
} else if (token) {
  carregarFoto();
}

btnTrocarFoto.addEventListener("click", () => {
  if (isGoogleUser) return;
  inputFoto.click();
});

inputFoto.addEventListener("change", async () => {
  if (isGoogleUser) return;
  const arquivo = inputFoto.files[0];
  inputFoto.value = "";
  if (!arquivo) return;
  if (!foto_tipos.includes(arquivo.type)) {
    criarAlerta("Escolha uma imagem JPEG, PNG ou Webp.", "alertRuim", 5000);
    return;
  }
  if (arquivo.size > foto_tam_max) {
    criarAlerta("A imagem deve ter no máximo 5 MB.", "alertRuim", 5000);
    return;
  }
  const formData = new FormData();
  formData.append("imagem", arquivo);

  btnTrocarFoto.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}/usuario/foto`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });
    const dados = await resposta.json();
    if (resposta.ok) {
      mostrarFoto(dados.foto_url);
      window.location.reload();
      criarAlerta("Foto atualizada!", "alertBom", 3000);
    } else if (resposta.status === 401) sessaoExpirou();
    else {
      criarAlerta(dados.mensagem || "Erro ao enviar a foto.", "alertRuim", 5000);
    }
  } catch (erro) {
    console.error("Erro ao enviar a foto:", erro);
    criarAlerta("Erro de conexão com o servidor.", "alertRuim", 5000);
  } finally {
    btnTrocarFoto.disabled = false;
  }
});

btnRemoverFoto.addEventListener("click", async () => {
  if (isGoogleUser) return;
  if (!confirm("Remover sua foto de perfil?")) return;

  try {
    const resposta = await fetch(`${API_URL}/usuario/foto`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (resposta.ok) {
      mostrarFoto(null);
      criarAlerta("Foto removida.", "alertBom", 3000);
    } else if (resposta.status === 401) {
      sessaoExpirou();
    } else {
      criarAlerta("Não foi possível remover a foto.", "alertRuim", 5000);
    }
  } catch (erro) {
    console.error("Erro ao remover a foto:", erro);
    criarAlerta("Erro de conexão com o servidor.", "alertRuim", 5000);
  }
});


const btnSair = document.getElementById("logOut");

btnSair.addEventListener("click", () => {
  if (!confirm("Deseja sair de sua conta?")) return;
  
  
  localStorage.removeItem("usuario");
  localStorage.removeItem("token");
  localStorage.removeItem("nomeUsuario");
  localStorage.removeItem("emailUsuario");
  localStorage.removeItem("fotoUsuario");
  
  window.location.href = "../index.html";
});