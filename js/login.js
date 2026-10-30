const olho = document.getElementById("olho");
const senhaInput = document.getElementById("senha");
const emailInput = document.getElementById("email");
const btn = document.getElementById("logar");

if (olho && senhaInput) {
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
}

document.getElementById("FormLogin").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const senha = senhaInput.value;

    if (!email || !senha) {
        criarAlerta("Preencha o e-mail e a senha!", "alertRuim", 4000);
        return;
    }

    btn.disabled = true;
    btn.textContent = "Logando...";

    try {
        const resposta = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha })
        });
        const dados = await resposta.json();

        if (resposta.ok) {
            localStorage.setItem("usuario", JSON.stringify(dados.usuario));
            localStorage.setItem("token", dados.token);

            const campoNome = document.getElementById("nomeUsuario");
            if (campoNome) {
                campoNome.textContent = `${dados.usuario.nome} `;
            }

            criarAlerta(`Bem-vindo, ${dados.usuario.nome}! Redirecionando...`, "alertBom", 3000);
            setTimeout(() => {
                window.location.href = "../servicos/index.html";
            }, 2000);
            return;
        }

        if (resposta.status === 403 && dados.precisaVerificar) {
            sessionStorage.setItem("emailPendente", email);
            criarAlerta(dados.mensagem, "alertRuim", 3500);
            btn.disabled = false;
            btn.textContent = "Entrar";
            setTimeout(() => {
                window.location.href = "verificar-email.html";
            }, 1500);
            return;
        }

        criarAlerta(dados?.mensagem || "E-mail ou senha incorretos.", "alertRuim", 5000);
        btn.disabled = false;
        btn.textContent = "Entrar";
    } catch (erro) {
        console.error("Erro na requisição de login:", erro);
        criarAlerta("Erro de conexão com o servidor.", "alertRuim", 5000);
        btn.disabled = false;
        btn.textContent = "Entrar";
    }
});
const linkEsqueci = document.getElementById("link-esqueci");
if (linkEsqueci && emailInput) {
    linkEsqueci.addEventListener("click", () => {
        const emailDigitado = emailInput.value.trim().toLowerCase();
        if (emailDigitado) {
            sessionStorage.setItem("emailRecuperacao", emailDigitado);
        }
    });
}

function handleCredentialResponse(response) {
    console.log("Login feito com sucesso! Token:", response.credential);

    // Decodifica o token para extrair as informações do utilizador
    const payload = parseJwt(response.credential);
    
    console.log("Nome:", payload.name);
    console.log("E-mail:", payload.email);

    // Guarda os dados no localStorage para usar noutras páginas do site
    localStorage.setItem("nomeUsuario", payload.name);
    localStorage.setItem("emailUsuario", payload.email);
    localStorage.setItem("fotoUsuario", payload.picture);

    // Redireciona para a página principal do teu projeto (ajusta o caminho se necessário)
    window.location.href = "../index.html"; 
}

// Função auxiliar para ler o token JWT
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('0' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}