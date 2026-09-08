

document.addEventListener("click", (e) => {


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


let tradutorInicializado = false;

function inicializarTradutor() {
  const elemento = document.getElementById("google_translate_element");
  if (!elemento || typeof google === "undefined" || !google.translate || tradutorInicializado) return;

  new google.translate.TranslateElement({
    pageLanguage: "pt",
    autoDisplay: false
  }, "google_translate_element");

  tradutorInicializado = true;
}

function carregarGoogleTradutor() {
  const script = document.createElement("script");
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.head.appendChild(script);
}

function googleTranslateElementInit() {
  inicializarTradutor();
}

carregarGoogleTradutor();