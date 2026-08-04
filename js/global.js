// CARREGAR TEMA SALVO ASSIM QUE O SCRIPT RODA
(function aplicarTemaSalvo() {
  const temaSalvo = localStorage.getItem("tema");
  if (temaSalvo === "Escuro") {
    document.body.classList.add("Escuro");
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