
const campoData = document.getElementById("data");
const olho = document.getElementById("olho");
const senhaInput = document.getElementById("senha");


const dataAgora = new Date();

const dataMinima = new Date();
dataMinima.setFullYear(dataAgora.getFullYear() - 3);
campoData.max = dataMinima.toISOString().split('T')[0];

const dataMaxima = new Date();
dataMaxima.setFullYear(dataAgora.getFullYear() - 110);
campoData.min = dataMaxima.toISOString().split('T')[0];

function validarIdadePermitida(dataNascimentoString) {
    if (!dataNascimentoString) return false;

    const nascimento = new Date(dataNascimentoString);
    const hoje = new Date();

    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const diferencaMes = hoje.getMonth() - nascimento.getMonth();

    if (diferencaMes < 0 || (diferencaMes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }

    return idade >= 3 && idade <= 110;
}
function validarSenha(senha) {
    const temTamanhoMinimo = senha.length >= 6;
    const temMaiuscula = /[A-Z]/.test(senha);
    const temEspecial = /[^a-zA-Z0-9]/.test(senha);

    if (!temTamanhoMinimo) {
        criarAlerta("A senha precisa ter no mínimo 6 caracteres", "alertRuim", 5000);
        return false;
    }
    if (!temMaiuscula) {
        criarAlerta("A senha precisa ter 1 letra maiúscula!", "alertRuim", 5000)
        return false;
    }
    if (!temEspecial) {
        criarAlerta("A senha precisa ter um caractere especial", "alertRuim", 5000)
        return false;
    }
    return true;
}


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
document.getElementById("FormCadastro").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("nome").value;
    const senha = senhaInput.value;
    const email = document.getElementById("email").value;
    const data_nascimento = campoData.value;

    if (!validarSenha(senha)) {
        return;
    }
    if (!validarIdadePermitida(data_nascimento)) {
        criarAlerta("Cadastro inválido! Idade Inválida!", "alertRuim", 5000);
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, data_nascimento, email, senha })
        });
        const dados = await resposta.json();
        if (resposta.ok) {
            localStorage.setItem('token', dados.token);
            localStorage.setItem('usuario', JSON.stringify(dados.usuario));

            criarAlerta(`Bem-vindo, ${dados.usuario.nome}! Cadastro realizado com sucesso.`, "alertBom", 3500);
            criarAlerta(`Redirencionando para o Guia de Serviços...`, "alertBom", 3500);

            const redirencionar = setTimeout(() => {
                window.location.href = "../servicos/index.html"
            }, 3500)

        }else {
            criarAlerta(dados.mensagem || 'Erro ao realizar o cadastro', "alertRuim", 5000)
        }
    }
    catch (err) {
        console.error('Erro na requisição de cadastro', err);
        criarAlerta("Erro na conexão com o servidor. Tente novamente mais tarde.", "alertRuim", 5000);
    }
})