
const campoData = document.getElementById("data");
const olho = document.getElementById("olho");
const senhaInput = document.getElementById("senha");

const dataAgora = new Date();

const dataMinima = new Date();
dataMinima.setFullYear(dataAgora.getFullYear() - 3);
campoData.max=dataMinima.toISOString().split('T')[0];

const dataMaxima = new Date();
dataMaxima.setFullYear(dataAgora.getFullYear() - 110);
campoData.min=dataMaxima.toISOString().split('T')[0];

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

olho.addEventListener("click", () => {  

    if (senha.type === "password") {

        senha.type = "text";
        olho.classList.remove("fa-eye");
        olho.classList.add("fa-eye-slash");

    } else {

        senha.type = "password";
        olho.classList.remove("fa-eye-slash");
        olho.classList.add("fa-eye");

    }

});
const API_URL = 'https://guia-assis.onrender.com/api';

document.getElementById("FormCadastro").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("nome").value;
    const senha = senhaInput.value;
    const email = document.getElementById("email").value;
    const data_nascimento = campoData.value;
     if (!validarIdadePermitida(data_nascimento)) {
        alert("Cadastro inválido! Idade Inválida!");
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
            alert("Cadastro feito com sucesso! Faça login para continuar.");
            window.location.href = '../login/login.html'
        } else {
            alert(dados.mensagem || 'Erro ao realizar o cadastro')
        }
    }
    catch (err) {
        console.error('Erro na requisição de cadastro', err);
        alert("Erro na conexão com o servidor.");
    }
})