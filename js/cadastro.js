const formCadastro = document.getElementById("FormCadastro");
const nomeInput = document.getElementById("nome");
const campoData = document.getElementById("data");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const confirmarSenhaInput = document.getElementById("confirmar-senha");
const btnCadastrar = document.getElementById("cadastrar");

const barraForca = document.getElementById("barra-forca");
const textoForca = document.getElementById("texto-forca");
const reqTamanho = document.getElementById("req-tamanho");
const reqMaiuscula = document.getElementById("req-maiuscula");
const reqNumero = document.getElementById("req-numero");
const reqEspecial = document.getElementById("req-especial");
const feedbackConfirmacao = document.getElementById("feedback-confirmacao");

const dataAgora = new Date();

const dataMinima = new Date();
dataMinima.setFullYear(dataAgora.getFullYear() - 3);
campoData.max = dataMinima.toISOString().split("T")[0];

const dataMaxima = new Date();
dataMaxima.setFullYear(dataAgora.getFullYear() - 110);
campoData.min = dataMaxima.toISOString().split("T")[0];

function validarIdadePermitida(dataNascimentoString) {
    if (!dataNascimentoString) return false;

    const partes = dataNascimentoString.split("-").map(Number);
    if (partes.length !== 3) return false;

    const [ano, mes, dia] = partes;
    const nascimento = new Date(ano, mes - 1, dia);
    const hoje = new Date();

    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const diferencaMes = hoje.getMonth() - nascimento.getMonth();

    if (diferencaMes < 0 || (diferencaMes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }

    return idade >= 3 && idade <= 110;
}

function avaliarRequisitosSenha(senha) {
    return {
        tamanho: senha.length >= 6,
        maiuscula: /[A-Z]/.test(senha),
        numero: /[0-9]/.test(senha),
        especial: /[^a-zA-Z0-9]/.test(senha)
    };
}

function atualizarItemRequisito(elementoLi, cumprido) {
    const icone = elementoLi.querySelector("i");
    if (cumprido) {
        elementoLi.classList.add("cumprido");
        icone.classList.remove("fa-circle-xmark");
        icone.classList.add("fa-circle-check");
    } else {
        elementoLi.classList.remove("cumprido");
        icone.classList.remove("fa-circle-check");
        icone.classList.add("fa-circle-xmark");
    }
}

function atualizarPainelSenha() {
    const senha = senhaInput.value;
    const reqs = avaliarRequisitosSenha(senha);

    atualizarItemRequisito(reqTamanho, reqs.tamanho);
    atualizarItemRequisito(reqMaiuscula, reqs.maiuscula);
    atualizarItemRequisito(reqNumero, reqs.numero);
    atualizarItemRequisito(reqEspecial, reqs.especial);

    const pontos = Object.values(reqs).filter(Boolean).length;

    if (senha.length === 0) {
        barraForca.style.width = "0%";
        textoForca.textContent = "Digite sua senha";
        textoForca.style.color = "";
        senhaInput.classList.remove("input-valido", "input-invalido");
        return false;
    }

    const niveis = {
        1: { largura: "25%", texto: "Muito fraca", cor: "#dc2626" },
        2: { largura: "50%", texto: "Fraca", cor: "#f97316" },
        3: { largura: "75%", texto: "Boa", cor: "#eab308" },
        4: { largura: "100%", texto: "Forte", cor: "#16a34a" }
    };

    const nivelAtual = niveis[pontos] || niveis[1];
    barraForca.style.width = nivelAtual.largura;
    barraForca.style.backgroundColor = nivelAtual.cor;
    textoForca.textContent = nivelAtual.texto;
    textoForca.style.color = nivelAtual.cor;

    const senhaValida = pontos === 4;
    senhaInput.classList.toggle("input-valido", senhaValida);
    senhaInput.classList.toggle("input-invalido", !senhaValida);

    return senhaValida;
}
function verificarConfirmacaoSenha() {
    const senha = senhaInput.value;
    const confirmacao = confirmarSenhaInput.value;

    if (!confirmacao) {
        feedbackConfirmacao.textContent = "";
        feedbackConfirmacao.className = "feedback-confirmacao";
        confirmarSenhaInput.classList.remove("input-valido", "input-invalido");
        return false;
    }

    if (senha === confirmacao) {
        feedbackConfirmacao.innerHTML = '<i class="fa-solid fa-check"></i> As senhas coincidem';
        feedbackConfirmacao.className = "feedback-confirmacao sucesso";
        confirmarSenhaInput.classList.add("input-valido");
        confirmarSenhaInput.classList.remove("input-invalido");
        return true;
    } else {
        feedbackConfirmacao.innerHTML = '<i class="fa-solid fa-xmark"></i> As senhas não coincidem';
        feedbackConfirmacao.className = "feedback-confirmacao erro";
        confirmarSenhaInput.classList.add("input-invalido");
        confirmarSenhaInput.classList.remove("input-valido");
        return false;
    }
}

senhaInput.addEventListener("input", () => {
    atualizarPainelSenha();
    if (confirmarSenhaInput.value) {
        verificarConfirmacaoSenha();
    }
});

confirmarSenhaInput.addEventListener("input", verificarConfirmacaoSenha);

function validarSenhaNoEnvio(senha) {
    const reqs = avaliarRequisitosSenha(senha);

    if (!reqs.tamanho) {
        criarAlerta("A senha precisa ter no mínimo 6 caracteres!", "alertRuim", 5000);
        return false;
    }
    if (!reqs.maiuscula) {
        criarAlerta("A senha precisa ter pelo menos 1 letra maiúscula!", "alertRuim", 5000);
        return false;
    }
    if (!reqs.numero) {
        criarAlerta("A senha precisa ter pelo menos 1 número!", "alertRuim", 5000);
        return false;
    }
    if (!reqs.especial) {
        criarAlerta("A senha precisa ter um caractere especial!", "alertRuim", 5000);
        return false;
    }
    return true;
}

document.querySelectorAll(".toggle-senha").forEach((iconeOlho) => {
    const alternarVisibilidade = () => {
        const inputAlvo = document.getElementById(iconeOlho.dataset.target);
        if (!inputAlvo) return;

        if (inputAlvo.type === "password") {
            inputAlvo.type = "text";
            iconeOlho.classList.remove("fa-eye");
            iconeOlho.classList.add("fa-eye-slash");
        } else {
            inputAlvo.type = "password";
            iconeOlho.classList.remove("fa-eye-slash");
            iconeOlho.classList.add("fa-eye");
        }
    };

    iconeOlho.addEventListener("click", alternarVisibilidade);
    iconeOlho.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            alternarVisibilidade();
        }
    });
});

function definirEstadoBotao(carregando) {
    btnCadastrar.disabled = carregando;
    btnCadastrar.innerHTML = carregando
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Cadastrando...'
        : "Cadastrar";
}

formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = nomeInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const data_nascimento = campoData.value;
    const senha = senhaInput.value;
    const confirmarSenha = confirmarSenhaInput.value;

    if (nome.length < 3 || !nome.includes(" ")) {
        criarAlerta("Por favor, digite seu nome e sobrenome.", "alertRuim", 5000);
        nomeInput.focus();
        return;
    }

    if (!validarIdadePermitida(data_nascimento)) {
        criarAlerta("Cadastro inválido! Idade permitida entre 3 e 110 anos.", "alertRuim", 5000);
        campoData.focus();
        return;
    }
 
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
        criarAlerta("Por favor, insira um endereço de e-mail válido.", "alertRuim", 5000);
        emailInput.focus();
        return;
    }

    if (!validarSenhaNoEnvio(senha)) {
        senhaInput.focus();
        return;
    }

    if (senha !== confirmarSenha) {
        criarAlerta("As senhas digitadas não coincidem!", "alertRuim", 5000);
        confirmarSenhaInput.focus();
        return;
    }

    definirEstadoBotao(true);

    try {
        const resposta = await fetch(`${API_URL}/cadastro`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, data_nascimento, email, senha })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            sessionStorage.setItem("emailPendente", email);
            criarAlerta(dados.mensagem || "Cadastro realizado com sucesso!", "alertBom", 3500);

            setTimeout(() => {
                window.location.href = "verificar-email.html";
            }, 1500);
        } else {
            criarAlerta(dados.mensagem || "Erro ao realizar o cadastro", "alertRuim", 5000);
            definirEstadoBotao(false);
        }
    } catch (err) {
        console.error("Erro na requisição de cadastro:", err);
        criarAlerta("Erro na conexão com o servidor. Tente novamente mais tarde.", "alertRuim", 5000);
        definirEstadoBotao(false);
    }
});