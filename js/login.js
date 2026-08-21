const olho = document.getElementById("olho");
const senhaInput = document.getElementById("senha");

olho.addEventListener("click", () => {

    if (senhaInput.type === "password") {

        senhaInput.type = "text";
        olho.classList.remove("fa-eye");
        olho.classList.add("fa-eye-slash");

    } else {

        senhaInput.type = "password";
        olho.classList.remove("fa-eye-slash");
        olho.classList.add("fa-eye");

    }

});
const API_URL = 'https://guia-assis.onrender.com/api';
document.getElementById("FormLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const senha = senhaInput.value;
    const email = document.getElementById("email").value;

    try {
        const resposta = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        const dados = await resposta.json();
        if (resposta.ok) {
            localStorage.setItem('usuario', JSON.stringify(dados.usuario));
            
            alert(`Bem vindo(a), ${dados.usuario.nome}!`);
            window.location.href="../servicos/index.html";
        }
        else{
            alert(dados.mensagem || 'E-mail ou senha incorretos.');
        }
    }
    catch (erro) {
        console.error("Erro na requisição de login : ", erro);
        alert("Erro de conexão com o servidor.")
    }
})