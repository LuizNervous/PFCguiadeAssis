
const API = "https://guia-assis.onrender.com/api/pontos";
let pontos = [];
let pontosFiltrados = [];


const icones = {
    "turismo": "fa-camera",
    "gastronomia": "fa-utensils",
    "posto": "fa-gas-pump",
    "farmacia": "fa-prescription-bottle-medical",
    "hospital": "fa-hospital",
    "posto de saúde": "fa-kit-medical",
    "educação": "fa-school",
    "comércio": "fa-cart-shopping",
    "industria": "fa-industry",
    "indústria": "fa-industry",
    "emprego": "fa-briefcase",
    "moradia": "fa-house",
    "mobilidade": "fa-bus"
};

const cores = {
    "turismo": "azul",
    "gastronomia": "laranja",
    "posto": "verde",
    "farmacia": "roxo",
    "hospital": "vermelho",
    "posto de saúde": "vermelho",
    "educação": "roxo",
    "comércio": "verde",
    "industria": "azul",
    "indústria": "azul",
    "emprego": "rosa",
    "moradia": "verde",
    "mobilidade": "azul"
};


async function carregarServicos() {
    try {
        const resposta = await fetch(API);
        pontos = await resposta.json();
        const categoriasDaAPI = [...new Set(pontos.map(p => p.categoria_nome))];
        console.log("Categorias exatas do banco de dados:", categoriasDaAPI);
        pontosFiltrados = [...pontos];
        renderizarCards(pontosFiltrados);
    } catch (erro) {
        console.error("Erro ao carregar a API:", erro);
        document.getElementById("containerCards").innerHTML = "<h2 style='text-align:center; width:100%'>Erro ao carregar os serviços.</h2>";
    }
}

function renderizarCards(lista) {
    const container = document.getElementById("containerCards");
    container.innerHTML = "";

    if (lista.length === 0) {
        container.innerHTML = `
            <h2 style="grid-column:1/-1;text-align:center; padding: 40px 0;">
                Nenhum serviço encontrado.
            </h2>
        `;
        return;
    }

    lista.forEach(ponto => {
        const categoria = ponto.categoria_nome.toLowerCase();
        const icone = icones[categoria] || "fa-location-dot";
        const cor = cores[categoria] || "azul";

        // Caminho da imagem, caso não exista, coloca uma genérica
        const imagemSrc = ponto.imagem ? `/imagens/pontos/${ponto.imagem}` : '/imagens/placeholder.png';

        container.innerHTML += `
        <div class="card">
            <div class="card-imagem-container">
                <img class="card-imagem" src="${imagemSrc}" alt="${ponto.nome}">
                <div class="card-icone ${cor}">
                    <i class="fa-solid ${icone}"></i>
                </div>
            </div>

            <div class="card-body">
                <span class="categoria-card ${cor}">
                    ${ponto.categoria_nome}
                </span>

                <h3>${ponto.nome}</h3>
                
                <p class="endereco-card">
                    <i class="fa-solid fa-location-dot"></i> ${ponto.endereco}
                </p>

                <p class="descricao-card">
                    ${ponto.descricao.substring(0, 100)}...
                </p>

                <button class="btn-detalhes" onclick="abrirModal(${ponto.id})">
                    Ver detalhes <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        </div>
        `;
    });
}

const campoPesquisa = document.querySelector(".pesquisa");
if (campoPesquisa) {
    campoPesquisa.addEventListener("input", () => {
        aplicarFiltros();
    });
}

const botoesFiltro = document.querySelectorAll(".filtros button");
botoesFiltro.forEach(botao => {
    botao.addEventListener("click", () => {
        botoesFiltro.forEach(btn => btn.classList.remove("ativo"));
        botao.classList.add("ativo");
        aplicarFiltros();
    });
});

// Função poderosa para remover acentos
function removerAcentos(texto) {
    if (!texto) return "";
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function aplicarFiltros() {
    const textoOriginal = campoPesquisa ? campoPesquisa.value.toLowerCase().trim() : "";
    const texto = removerAcentos(textoOriginal);

    const categoriaAtiva = document.querySelector(".filtros .ativo");
    const categoria = categoriaAtiva ? removerAcentos(categoriaAtiva.dataset.categoria.toLowerCase().trim()) : "todos";

    pontosFiltrados = pontos.filter(ponto => {
        const nomeStr = removerAcentos(ponto.nome.toLowerCase());
        const descStr = removerAcentos(ponto.descricao.toLowerCase());
        const endStr = removerAcentos(ponto.endereco.toLowerCase());


        const catStr = removerAcentos(ponto.categoria_nome.toLowerCase().trim());

        const combinaTexto = nomeStr.includes(texto) ||
            descStr.includes(texto) ||
            endStr.includes(texto) ||
            catStr.includes(texto);


        const combinaCategoria = (categoria === "todos") || catStr.includes(categoria) || categoria.includes(catStr);

        return combinaTexto && combinaCategoria;
    });

    renderizarCards(pontosFiltrados);
}

// MODAL

function abrirModal(id) {
    const ponto = pontos.find(item => item.id == id);
    if (!ponto) return;

    const categoria = ponto.categoria_nome.toLowerCase();
    const icone = icones[categoria] || "fa-location-dot";
    const cor = cores[categoria] || "azul";
    const imagemSrc = ponto.imagem ? `/imagens/pontos/${ponto.imagem}` : '/imagens/placeholder.png';
    const googleMaps = `https://www.google.com/maps/dir/?api=1&destination=${ponto.latitude},${ponto.longitude}`;
    const mapa = `/mapa/index.html#ponto-${ponto.id}`;

    const modal = document.getElementById("modal");
    const conteudo = document.getElementById("modalContent");


    conteudo.innerHTML = `
    <span class="fechar" onclick="fecharModal()">&times;</span>
    <img src="${imagemSrc}" alt="${ponto.nome}" class="modal-imagem">
    
    <div class="modal-body">
        <span class="categoria-card ${cor}" style="margin-bottom: 15px;">
            <i class="fa-solid ${icone}"></i> ${ponto.categoria_nome}
        </span>
        <h2>${ponto.nome}</h2>
        <p style="margin-bottom: 20px; line-height: 1.5;">${ponto.descricao}</p>
        
        <div class="info-box">
            <p><strong>📍 Endereço:</strong> ${ponto.endereco}</p>
        </div>
        
           <a href="mapa.html?categoria=${ponto.categoria_nome.toLowerCase()}&nome=${ponto.nome}">
                <button class="btn-ver-mapa">Ver no mapa</button>
             </a>
        </div>
    </div>
    `;

    modal.style.display = "flex";
}

function fecharModal() {
    document.getElementById("modal").style.display = "none";
}

window.addEventListener("click", (e) => {
    const modal = document.getElementById("modal");
    if (e.target === modal) {
        fecharModal();
    }
});


// INICIALIZAÇÃO E EVENTOS GERAIS

document.addEventListener("DOMContentLoaded", () => {
    carregarServicos();


    const tema = localStorage.getItem("tema");
    if (tema === "Escuro") {
        document.body.classList.add("Escuro");
    }

    const btnTema = document.getElementById("conteiner");
    if (btnTema) {
        btnTema.addEventListener("click", () => {
            document.body.classList.toggle("Escuro");
            if (document.body.classList.contains("Escuro")) {
                localStorage.setItem("tema", "Escuro");
            } else {
                localStorage.setItem("tema", "Claro");
            }
        });
    }

    // Lógica do Menu Lateral
    const menu = document.getElementById("botaoMenu");
    const fechar = document.getElementById("closeMenu");
    const painel = document.querySelector(".escondido");

    if (menu && fechar && painel) {
        menu.addEventListener("click", () => {
            painel.classList.add("aberto");
        });

        fechar.addEventListener("click", () => {
            painel.classList.remove("aberto");
        });
    }
});