async function carregarComponente(id, arquivo) {
    const elemento = document.getElementById(id);

    if (!elemento) return;

    try {
      const resposta = await fetch(arquivo);
    const html = await resposta.text();

    elemento.innerHTML = html;
    if (id==="header" && typeof inicializarHeader === "function") {
            inicializarHeader();
    }
       if (id==="footer" && typeof inicializarFooter === "function") {
            inicializarFooter();
    }
    } catch (erro) {
      console.error("Erro ao carregar a pagina", erro)
    }
    
}

document.addEventListener("DOMContentLoaded", () => {
    carregarComponente("header", "/componentes/header.html");
    carregarComponente("footer", "/componentes/footer.html");
});