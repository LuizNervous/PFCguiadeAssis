(function aplicarTemaSalvo() {
  const temaSalvo = localStorage.getItem("tema");
  if (temaSalvo === "Escuro") {
    document.documentElement.classList.add("Escuro");
    document.body.classList.add("Escuro");
  }

  const acessibilidadeTema = localStorage.getItem("acessibilidade_tema");
  if (acessibilidadeTema && acessibilidadeTema !== "padrao" && acessibilidadeTema !== "escuro") {
    document.body.classList.add("tema-" + acessibilidadeTema);
  }
})();

document.addEventListener("click", (e) => {
  const menuEscondido = document.querySelector(".escondido");

  if (e.target.closest("#botaoMenu")) {
    if (menuEscondido) menuEscondido.classList.add("aberto");
  }

  if (e.target.closest("#closeMenu")) {
    if (menuEscondido) menuEscondido.classList.remove("aberto");
  }

  const botaoTema = e.target.closest("#conteiner");
  if (botaoTema) {
    document.documentElement.classList.toggle("Escuro");
    document.body.classList.toggle("Escuro");

    if (document.documentElement.classList.contains("Escuro")) {
      localStorage.setItem("tema", "Escuro");
    } else {
      localStorage.setItem("tema", "Claro");
    }
  }

  if (e.target.closest("#topBtn")) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

window.addEventListener("scroll", () => {
  const topBtn = document.getElementById("topBtn");
  if (topBtn) {
    if (window.scrollY > 300) {
      topBtn.style.display = "flex";
    } else {
      topBtn.style.display = "none";
    }
  }
});

const barraTexto = document.getElementById('alterarTexto');
const visorTexto = document.getElementById('textoFonte');

window.onload = function () {
  let tamanhoSalvo = localStorage.getItem("acessibilidade_tamanho");
  if (tamanhoSalvo) {
    if (barraTexto) barraTexto.value = tamanhoSalvo.replace('%', '');
    if (visorTexto) visorTexto.innerHTML = tamanhoSalvo;
    document.body.style.fontSize = tamanhoSalvo;
  }
}

if (barraTexto) {
  barraTexto.oninput = function () {
    let tamanho = barraTexto.value + '%';
    visorTexto.innerHTML = tamanho;
    document.body.style.fontSize = tamanho;
    localStorage.setItem('acessibilidade_tamanho', tamanho);
  };
}

function mudarCor(tema) {
  document.body.classList.remove(
    'tema-contraste',
    'tema-tricromacia',
    'tema-dicromacia',
    'tema-monocromacia'
  );

  if (tema === 'escuro') {
    document.documentElement.classList.add("Escuro");
    document.body.classList.add("Escuro");
    localStorage.setItem("tema", "Escuro");
  } else if (tema === 'padrao') {
    document.documentElement.classList.remove("Escuro");
    document.body.classList.remove("Escuro");
    localStorage.setItem("tema", "Claro");
  } else {
    document.body.classList.add('tema-' + tema);
  }

  localStorage.setItem('acessibilidade_tema', tema);
}

function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'pt',
    autoDisplay: false
  }, 'google_translate_element');
}


(function () {
  var gtScript = document.createElement('script');
  gtScript.type = 'text/javascript';
  gtScript.async = true;
  gtScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.head.appendChild(gtScript);
})();

  const abrirLogin = document.getElementById("linkAlternador");
function alternarHref() {
  const abrirLogin = document.getElementById("linkAlternador");
  if (localStorage.getItem('token') && localStorage.getItem('usuario')) {
    abrirLogin.href='/login/perfil.html';
  }
  else{
    abrirLogin.href="../login/login.html"
  }
}
abrirLogin.addEventListener("click", alternarHref)