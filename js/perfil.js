const usuarioSalvo = localStorage.getItem('usuario');
const token = localStorage.getItem('token');

if (!token || !usuarioSalvo) {
  window.location.replace('../login/login.html');
  throw new Error('Usuário não autenticado.');
}

let usuario;

try {
  usuario = JSON.parse(usuarioSalvo);
} catch {
  localStorage.removeItem('usuario');
  localStorage.removeItem('token');

  window.location.replace('../login/login.html');
  throw new Error('Sessão inválida.');
}

if (!usuario || !usuario.id) {
  localStorage.removeItem('usuario');
  localStorage.removeItem('token');

  window.location.replace('../login/login.html');
  throw new Error('Dados de usuário inválidos.');
}
const isGoogleUser = Boolean(usuario.isGoogle);

document.getElementById('nomeUsuario').textContent = usuario.nome;
document.getElementById('emailUsuario').textContent = usuario.email;
document.getElementById('nomeEditar').value = usuario.nome;

document.getElementById("formMudarDados").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("nomeEditar").value.trim();

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
  try {
    const resposta = await fetch(`${API_URL}/usuario`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (resposta.status === 401) return sessaoExpirou();
    if (!resposta.ok) {
      // Se falhar, tenta usar a foto salva no login (se houver)
      mostrarFoto(usuario.foto_url);
      return;
    }
    const dados = await resposta.json();
    mostrarFoto(dados.usuario?.foto_url || usuario.foto_url);
  } catch (erro) {
    console.error("Erro ao carregar a foto de perfil: ", erro);
    mostrarFoto(usuario.foto_url);
  }
}

if (isGoogleUser) {
  if (btnTrocarFoto) btnTrocarFoto.style.display = "none";
  if (btnRemoverFoto) btnRemoverFoto.style.display = "none";
}

if (token) {
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