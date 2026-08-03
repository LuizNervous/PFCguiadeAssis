document.addEventListener("DOMContentLoaded", () => {
  // 1. CARREGAR TEMA ESCURO SALVO
  const temaSalvo = localStorage.getItem("tema");
  const botaoEscuro = document.getElementById("conteiner");

  if (temaSalvo === "Escuro") {
    document.body.classList.add("Escuro");
  }

  // 2. TOGGLE DO TEMA ESCURO
  if (botaoEscuro) {
    botaoEscuro.addEventListener("click", () => {
      document.body.classList.toggle("Escuro");

      if (document.body.classList.contains("Escuro")) {
        localStorage.setItem("tema", "Escuro");
      } else {
        localStorage.setItem("tema", "Claro");
      }
    });
  }

  // 3. MENU LATERAL MOBILE
  const botaoMenu = document.getElementById("botaoMenu");
  const fechar = document.getElementById("closeMenu");
  const menuEscondido = document.querySelector(".escondido");

  if (botaoMenu && menuEscondido) {
    botaoMenu.addEventListener("click", () => {
      menuEscondido.classList.add("aberto");
    });
  }

  if (fechar && menuEscondido) {
    fechar.addEventListener("click", () => {
      menuEscondido.classList.remove("aberto");
    });
  }
});
const btnTop = document.getElementById("topBtn");
if (btnTop) {
  window.addEventListener("scroll", ()=>{
    if (window.scrollY>230) {
      btnTop.style.display="inline-flex"
    }else{
      btnTop.style.display="none"
    }
  })
}
btnTop.addEventListener("click", ()=>{
  window.scrollTo({top:0, behavior:"smooth"})
})