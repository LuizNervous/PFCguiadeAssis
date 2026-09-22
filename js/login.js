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
function verLogado() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (!usuario) {
        console.log("Faça login.")
    }
}
verLogado()
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
            localStorage.setItem('token', dados.token);
            document.getElementById("nomeUsuario").textContent = `${dados.usuario.nome} `

            criarAlerta(`Bem vindo ${dados.usuario.nome} !`, "alertBom", 3000);
            criarAlerta(`Redirencionando para o Guia de Serviços...`, "alertBom", 3000);
            const redirencionar = setTimeout(() => {
                window.location.href = "../servicos/index.html"
            }, 2000)
        }
        else {
            criarAlerta(dados?.mensagem || 'E-mail ou senha incorretos.', "alertRuim", 5000);
        }
    }
    catch (erro) {
        console.error("Erro na requisição de login : ", erro);
        criarAlerta("Erro de conexão com o servidor.", "alertRuim", 5000)
    }
})