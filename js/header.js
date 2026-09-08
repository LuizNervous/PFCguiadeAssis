function inicializarHeader() {
  const botaoMenu = document.getElementById("botaoMenu");
  const closeMenu = document.getElementById("closeMenu");
  const menu = document.getElementById("menuConfiguracoes");
  const linkAlternador = document.getElementById("linkAlternador");

  if (!botaoMenu || !closeMenu || !menu) {
    console.error("Elementos do Header não encontrados.");
    return;
  }

  botaoMenu.addEventListener("click", () => { menu.classList.add("aberto"); });
  closeMenu.addEventListener("click", () => { menu.classList.remove("aberto"); });


  const token = localStorage.getItem("token");
  const usuario = localStorage.getItem("usuario");

  if (token && usuario) {
    linkAlternador.href = "/login/perfil.html";
  } else {
    linkAlternador.href = "/login/login.html";
  }
  document.querySelectorAll("#botoesCores button[data-tema]").forEach((botao) => {
    botao.addEventListener("click", () => { mudarTema(botao.dataset.tema); });
  });

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
