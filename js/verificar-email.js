const emailPendente = sessionStorage.getItem("emailPendente");

if (!emailPendente) {
    window.location.href = "cadastro.html";
} else {
    document.getElementById("emailConfirmacao").textContent = emailPendente;
}

document.getElementById("FormCodigo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("cadastrar");
    const inputCodigo = document.getElementById("codigo");
    const codigo = inputCodigo.value.trim();

    if (!/^\d{6}$/.test(codigo)) {
        criarAlerta("Digite o código numérico de 6 dígitos.", "alertRuim", 4000);
        inputCodigo.focus();
        return;
    }

    btn.disabled = true;
    btn.textContent = "Verificando...";

    try {
        const resposta = await fetch(`${API_URL}/verificar-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailPendente, codigo })
        });
        const dados = await resposta.json();

        if (resposta.ok) {
            localStorage.setItem("token", dados.token);
            localStorage.setItem("usuario", JSON.stringify(dados.usuario));
            sessionStorage.removeItem("emailPendente");

            criarAlerta(`Bem-vindo, ${dados.usuario.nome}! Redirecionando...`, "alertBom", 3000);
            setTimeout(() => {
                window.location.href = "../servicos/index.html";
            }, 2000);
            return;
        }

        criarAlerta(dados.mensagem || "Não foi possível verificar o código.", "alertRuim", 5000);
    } catch (erro) {
        console.error("Erro ao verificar e-mail:", erro);
        criarAlerta("Erro de conexão com o servidor.", "alertRuim", 5000);
    }

    btn.disabled = false;
    btn.textContent = "Verificar e entrar";
});

const linkReenviar = document.getElementById("reenviar");
let aguardando = false;

linkReenviar.addEventListener("click", async (e) => {
    e.preventDefault();
    if (aguardando || !emailPendente) return;

    aguardando = true;
    linkReenviar.textContent = "Enviando...";

    try {
        const resposta = await fetch(`${API_URL}/reenviar-codigo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailPendente })
        });
        const dados = await resposta.json();
        criarAlerta(dados.mensagem, resposta.ok ? "alertBom" : "alertRuim", 5000);

        if (!resposta.ok) {
            linkReenviar.textContent = "Reenviar código";
            aguardando = false;
            return;
        }
    } catch (erro) {
        console.error("Erro ao reenviar código:", erro);
        criarAlerta("Erro de conexão com o servidor.", "alertRuim", 5000);
        linkReenviar.textContent = "Reenviar código";
        aguardando = false;
        return;
    }

    let segundos = 60;
    linkReenviar.textContent = `Reenviar código (${segundos}s)`;

    const relogio = setInterval(() => {
        segundos--;
        linkReenviar.textContent = `Reenviar código (${segundos}s)`;
        if (segundos <= 0) {
            clearInterval(relogio);
            linkReenviar.textContent = "Reenviar código";
            aguardando = false;
        }
    }, 1000);
});