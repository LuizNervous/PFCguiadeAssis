const etapaEmail = document.getElementById("etapa-email");
const etapaRedefinir = document.getElementById("etapa-redefinir");

const indicadorPasso1 = document.getElementById("indicador-passo-1");
const indicadorPasso2 = document.getElementById("indicador-passo-2");
const linhaPassos = document.getElementById("linha-passos");

const formSolicitar = document.getElementById("FormSolicitarCodigo");
const formRedefinir = document.getElementById("FormRedefinirSenha");

const emailInput = document.getElementById("email-recuperacao");
const emailExibido = document.getElementById("email-exibido");
const linkTrocarEmail = document.getElementById("trocar-email");
const linkReenviar = document.getElementById("reenviar-codigo");

const codigoInput = document.getElementById("codigo");
const senhaInput = document.getElementById("senha");
const confirmarSenhaInput = document.getElementById("confirmar-senha");

const btnEnviarCodigo = document.getElementById("logar");
const btnRedefinir = document.getElementById("cadastrar");

const barraForca = document.getElementById("barra-forca");
const textoForca = document.getElementById("texto-forca");
const reqTamanho = document.getElementById("req-tamanho");
const reqMaiuscula = document.getElementById("req-maiuscula");
const reqNumero = document.getElementById("req-numero");
const reqEspecial = document.getElementById("req-especial");
const feedbackConfirmacao = document.getElementById("feedback-confirmacao");

let emailAtual = sessionStorage.getItem("emailRecuperacao") || "";
let aguardandoReenvio = false;
let intervaloRelogio = null;

if (emailAtual && emailInput) {
    emailInput.value = emailAtual;
}

if (codigoInput) {
    codigoInput.addEventListener("input", () => {
        codigoInput.value = codigoInput.value.replace(/\D/g, "").slice(0, 6);
    });
}

function iniciarContagemReenvio() {
    clearInterval(intervaloRelogio);
    aguardandoReenvio = true;
    let segundos = 60;
    if (linkReenviar) linkReenviar.textContent = `Reenviar código (${segundos}s)`;

    intervaloRelogio = setInterval(() => {
        segundos--;
        if (linkReenviar) linkReenviar.textContent = `Reenviar código (${segundos}s)`;
        if (segundos <= 0) {
            clearInterval(intervaloRelogio);
            if (linkReenviar) linkReenviar.textContent = "Reenviar código";
            aguardandoReenvio = false;
        }
    }, 1000);
}

function mostrarEtapaRedefinicao(email) {
    emailAtual = email;
    sessionStorage.setItem("emailRecuperacao", email);
    if (emailExibido) emailExibido.textContent = email;

    etapaEmail.classList.add("oculto");
    etapaRedefinir.classList.remove("oculto");

    if (indicadorPasso1 && indicadorPasso2 && linhaPassos) {
        indicadorPasso1.classList.remove("ativo");
        indicadorPasso1.classList.add("concluido");
        const num1 = indicadorPasso1.querySelector(".passo-numero");
        if (num1) num1.innerHTML = '<i class="fa-solid fa-check"></i>';
        linhaPassos.classList.add("ativa");
        indicadorPasso2.classList.add("ativo");
    }

    iniciarContagemReenvio();
    if (codigoInput) codigoInput.focus();
}

if (linkTrocarEmail) {
    linkTrocarEmail.addEventListener("click", (e) => {
        e.preventDefault();
        etapaRedefinir.classList.add("oculto");
        etapaEmail.classList.remove("oculto");

        if (indicadorPasso1 && indicadorPasso2 && linhaPassos) {
            indicadorPasso1.classList.add("ativo");
            indicadorPasso1.classList.remove("concluido");
            const num1 = indicadorPasso1.querySelector(".passo-numero");
            if (num1) num1.textContent = "1";
            linhaPassos.classList.remove("ativa");
            indicadorPasso2.classList.remove("ativo");
        }

        if (emailInput) emailInput.focus();
    });
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
    if (!elementoLi) return;
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

if (senhaInput) {
    senhaInput.addEventListener("input", () => {
        atualizarPainelSenha();
        if (confirmarSenhaInput && confirmarSenhaInput.value) {
            verificarConfirmacaoSenha();
        }
    });
}

if (confirmarSenhaInput) {
    confirmarSenhaInput.addEventListener("input", verificarConfirmacaoSenha);
}

document.querySelectorAll(".toggle-senha").forEach((iconeOlho) => {
    const alternar = () => {
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

    iconeOlho.addEventListener("click", alternar);
    iconeOlho.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            alternar();
        }
    });
});

// ETAPA 1: Enviar solicitação de código
if (formSolicitar) {
    formSolicitar.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim().toLowerCase();
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!regexEmail.test(email)) {
            criarAlerta("Por favor, digite um endereço de e-mail válido.", "alertRuim", 4000);
            emailInput.focus();
            return;
        }

        btnEnviarCodigo.disabled = true;
        btnEnviarCodigo.textContent = "Enviando...";

        try {
            const resposta = await fetch(`${API_URL}/esqueci-senha`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const dados = await resposta.json();

            if (resposta.ok) {
                criarAlerta(dados.mensagem, "alertBom", 4500);
                mostrarEtapaRedefinicao(email);
            } else {
                criarAlerta(dados.mensagem || "Não foi possível enviar o código.", "alertRuim", 5000);
            }
        } catch (erro) {
            console.error("Erro ao solicitar código:", erro);
            criarAlerta("Erro de conexão com o servidor.", "alertRuim", 5000);
        }

        btnEnviarCodigo.disabled = false;
        btnEnviarCodigo.textContent = "Enviar código de verificação";
    });
}

// Reenviar código na Etapa 2
if (linkReenviar) {
    linkReenviar.addEventListener("click", async (e) => {
        e.preventDefault();
        if (aguardandoReenvio || !emailAtual) return;

        aguardandoReenvio = true;
        linkReenviar.textContent = "Enviando...";

        try {
            const resposta = await fetch(`${API_URL}/esqueci-senha`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailAtual })
            });
            const dados = await resposta.json();
            criarAlerta(dados.mensagem, resposta.ok ? "alertBom" : "alertRuim", 4500);

            if (resposta.ok) {
                iniciarContagemReenvio();
            } else {
                linkReenviar.textContent = "Reenviar código";
                aguardandoReenvio = false;
            }
        } catch (erro) {
            console.error("Erro ao reenviar código:", erro);
            criarAlerta("Erro de conexão com o servidor.", "alertRuim", 5000);
            linkReenviar.textContent = "Reenviar código";
            aguardandoReenvio = false;
        }
    });
}

// ETAPA 2: Confirmar código e salvar nova senha
if (formRedefinir) {
    formRedefinir.addEventListener("submit", async (e) => {
        e.preventDefault();

        const codigo = codigoInput.value.trim();
        const novaSenha = senhaInput.value;
        const confirmarSenha = confirmarSenhaInput.value;

        if (!/^\d{6}$/.test(codigo)) {
            criarAlerta("Digite o código numérico de 6 dígitos enviado para o seu e-mail.", "alertRuim", 4000);
            codigoInput.focus();
            return;
        }

        const reqs = avaliarRequisitosSenha(novaSenha);
        if (!reqs.tamanho || !reqs.maiuscula || !reqs.numero || !reqs.especial) {
            criarAlerta("A nova senha precisa cumprir todos os requisitos da lista!", "alertRuim", 5000);
            senhaInput.focus();
            return;
        }

        if (novaSenha !== confirmarSenha) {
            criarAlerta("As senhas digitadas não coincidem!", "alertRuim", 4000);
            confirmarSenhaInput.focus();
            return;
        }

        btnRedefinir.disabled = true;
        btnRedefinir.textContent = "Salvando...";

        try {
            const resposta = await fetch(`${API_URL}/redefinir-senha`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: emailAtual,
                    codigo,
                    novaSenha
                })
            });
            const dados = await resposta.json();

            if (resposta.ok) {
                sessionStorage.removeItem("emailRecuperacao");
                criarAlerta(dados.mensagem || "Senha alterada com sucesso!", "alertBom", 3500);
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 2000);
                return;
            }

            criarAlerta(dados.mensagem || "Erro ao redefinir a senha.", "alertRuim", 5000);
        } catch (erro) {
            console.error("Erro ao redefinir senha:", erro);
            criarAlerta("Erro de conexão com o servidor.", "alertRuim", 5000);
        }

        btnRedefinir.disabled = false;
        btnRedefinir.textContent = "Salvar nova senha";
    });
}