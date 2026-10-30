function inicializarHeader() {
  const botaoMenu = document.getElementById("botaoMenu");
  const closeMenu = document.getElementById("closeMenu");
  const menu = document.getElementById("menuConfiguracoes");
  const linkAlternador = document.getElementById("linkAlternador");
  const fotoUsuario = document.getElementById("FotoUsuario");

  if (!botaoMenu || !closeMenu || !menu) {
    console.error("Elementos do Header não encontrados.");
    return;
  }

  botaoMenu.addEventListener("click", () => { menu.classList.add("aberto"); });
  closeMenu.addEventListener("click", () => { menu.classList.remove("aberto"); });

  // 1. Verifica se o login foi feito pelo Google
  const nomeGoogle = localStorage.getItem("nomeUsuario");
  const fotoGoogle = localStorage.getItem("fotoUsuario");

  // 2. Verifica se o login foi feito pelo sistema tradicional (backend)
  const token = localStorage.getItem("token");
  const usuario = localStorage.getItem("usuario");

  if (nomeGoogle) {
    // --- CASO A: Usuário logado via Google ---
    console.log("Sessão Google ativa para:", nomeGoogle);
    
    if (fotoGoogle && fotoUsuario) {
      fotoUsuario.src = fotoGoogle;
      fotoUsuario.style.borderRadius = "50%";
      fotoUsuario.style.width = "35px";
      fotoUsuario.style.height = "35px";
      fotoUsuario.style.objectFit = "cover";
    }

    if (linkAlternador) {
      linkAlternador.title = `Logado como: ${nomeGoogle} (Clique para sair)`;
      linkAlternador.href = "#";
      
      // Ao clicar na foto, pergunta se deseja sair da conta
      linkAlternador.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm(`${nomeGoogle}, deseja sair da sua conta?`)) {
          localStorage.clear();
          window.location.reload();
        }
      });
    }

  } else if (token && usuario) {
    // --- CASO B: Usuário logado via sistema tradicional ---
    linkAlternador.href = "/login/perfil.html";
    carregarFotoHeader(token);
  } else {
    // --- CASO C: Deslogado ---
    linkAlternador.href = "/login/login.html";
  }

  // Configuração de Temas
  document.querySelectorAll("#botoesCores button[data-tema]").forEach((botao) => {
    botao.addEventListener("click", () => { mudarTema(botao.dataset.tema); });
  });

  // Configuração de Acessibilidade (Tamanho do texto)
  const controleTexto = document.getElementById("alterarTexto");
  const textoFonte = document.getElementById("textoFonte");

  if (controleTexto && textoFonte) {
    controleTexto.addEventListener("input", () => {
      const tamanho = controleTexto.value;
      document.documentElement.style.fontSize = `${tamanho}%`;
      textoFonte.textContent = `${tamanho}%`;
      localStorage.setItem("tamanhoFonte", tamanho);
    });

    const tamanhoSalvo = localStorage.getItem("tamanhoFonte");
    if (tamanhoSalvo) {
      controleTexto.value = tamanhoSalvo;
      textoFonte.textContent = `${tamanhoSalvo}%`;
      document.documentElement.style.fontSize = `${tamanhoSalvo}%`;
    }
  }
  carregarTema();
}

// Função para buscar dados do usuário do sistema tradicional
async function carregarFotoHeader(token) {
  const fotoUsuario = document.getElementById("FotoUsuario");
  if (!fotoUsuario) return;
  try {
    const resposta = await fetch(`${API_URL}/usuario`, {
      headers: {"Authorization": `Bearer ${token}`}
    });
    if (!resposta.ok) return;

    const dados = await resposta.json();
    if (dados.usuario.foto_url) {
      fotoUsuario.src = dados.usuario.foto_url;
      fotoUsuario.addEventListener("error", () => {
        fotoUsuario.src = "../imagens/IUsuario.png";
      });
    }
    if (dados.usuario.eh_admin === 1) {
      document.getElementById("linkAdmin")?.removeAttribute("hidden");
    }
  } catch (erro) {
    console.error("Erro ao carregar a foto do header : ", erro);
  }
}

function mudarTema(tema) {
  const body = document.body;
  body.classList.remove("Escuro", "tema-contraste", "tema-tricromacia", "tema-dicromacia", "tema-monocromacia");

  switch (tema) {
    case "escuro": body.classList.add("Escuro"); break;
    case "contraste": body.classList.add("tema-contraste"); break;
    case "tricromacia": body.classList.add("tema-tricromacia"); break;
    case "dicromacia": body.classList.add("tema-dicromacia"); break;
    case "monocromacia": body.classList.add("tema-monocromacia"); break;
  }
  localStorage.setItem("tema", tema);
} 

function carregarTema() {
  const temaSalvo = localStorage.getItem("tema");
  if (temaSalvo) mudarTema(temaSalvo);
}