document.addEventListener('DOMContentLoaded', () => {

    const temaSalvo = localStorage.getItem("tema");
    if (temaSalvo === "Escuro") {
        document.body.classList.add("Escuro");
    } 


    const botaoMenu = document.getElementById("botaoMenu");
    const fechar = document.getElementById("closeMenu");
    
    if (botaoMenu && fechar) {
        botaoMenu.addEventListener("click", () => {
            document.querySelector(".escondido").classList.toggle('aberto');
        });
        fechar.addEventListener("click", () => {
            document.querySelector(".escondido").classList.remove('aberto');
        });
    }

    const botaoEscuro = document.getElementById("botaoEscuro");

    if (botaoEscuro) {
        botaoEscuro.addEventListener("click", () => {
            document.body.classList.toggle("Escuro");
             botaoEscuro.textContent="☀️ Claro"
            if (document.body.classList.contains("Escuro")) {
                localStorage.setItem("tema","Escuro");
                 botaoEscuro.textContent = "☀️ Claro";
                botaoEscuro.classList.add("Claro")
            }
            else {
                localStorage.setItem("tema","Claro");
                botaoEscuro.textContent="🌙 Escuro";
                botaoEscuro.classList.remove("Claro")
                
            }
        });
    } 

});