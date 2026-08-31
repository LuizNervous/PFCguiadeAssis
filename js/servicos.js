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

// 1. CARREGAR DADOS DA API
async function carregarServicos() {
    try {
        const resposta = await fetch(API);
        pontos = await resposta.json();
        pontosFiltrados = [...pontos];
        renderizarCards(pontosFiltrados);
    } catch (erro) {
        console.error("Erro ao carregar a API:", erro);
        const container = document.getElementById("containerCards");
         container.innerHTML= "<p>Carregando avaliações...</p>";
        if (container) {
            container.innerHTML = "<h2 style='text-align:center; width:100%'>Erro ao carregar os serviços.</h2>";
        }
    }
}
// 2. RENDERIZAR CARDS NA TELA
function renderizarCards(lista) {
    const container = document.getElementById("containerCards");
    if (!container) return;
    
   

    if (lista.length === 0) {
        container.innerHTML = `
            <h2 style="grid-column:1/-1;text-align:center; padding: 40px 0;">
                Nenhum serviço encontrado.
            </h2>
        `;
        return;
    }
    let htmlGerado = "";

    lista.forEach(ponto => {
        const categoria = ponto.categoria_nome ? ponto.categoria_nome.toLowerCase() : "";
        const icone = icones[categoria] || "fa-location-dot";
        const cor = cores[categoria] || "azul";
        const imagemSrc = ponto.imagem ? `/imagens/pontos/${ponto.imagem}` : '/imagens/placeholder.png';

        // Correção do bug da descrição nula ou curta
        const descricaoTexto = ponto.descricao ? ponto.descricao : "";
        const descricaoCurta = descricaoTexto.length > 100 ? `${descricaoTexto.substring(0, 100)}...` : descricaoTexto;

        htmlGerado += `
        <div class="card">
            <div class="card-imagem-container">
                <img class="card-imagem" src="${imagemSrc}" alt="${ponto.nome || 'Serviço'}">
                <div class="card-icone ${cor}">
                    <i class="fa-solid ${icone}"></i>
                </div>
            </div>

            <div class="card-body">
                <span class="categoria-card ${cor}">
                    ${ponto.categoria_nome || 'Geral'}
                </span>

                <h3>${ponto.nome || 'Sem nome'}</h3>
                <h4>avaliação</h4>
                
                <p class="endereco-card">
                    <i class="fa-solid fa-location-dot"></i> ${ponto.endereco || 'Endereço não informado'}
                </p>

                <p class="descricao-card">
                    ${descricaoCurta}
                </p>

                <button class="btn-detalhes" onclick="abrirModal(${ponto.id})">
                    Ver detalhes <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        </div>
        `;
    });
    container.innerHTML = htmlGerado;
}

// 3. REMOVER ACENTOS E APLICAR FILTROS
function removerAcentos(texto) {
    if (!texto) return "";
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function aplicarFiltros() {
    const campoPesquisa = document.querySelector(".pesquisa");
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

        const combinaCategoria = (categoria === "todos") || catStr === (categoria);

        return combinaTexto && combinaCategoria;
    });

    renderizarCards(pontosFiltrados);
}

// 4. LÓGICA DO MODAL
function abrirModal(id) {
    const ponto = pontos.find(item => item.id == id);
    if (!ponto) return;

    const categoria = ponto.categoria_nome.toLowerCase();
    const icone = icones[categoria] || "fa-location-dot";
    const cor = cores[categoria] || "azul";
    const imagemSrc = ponto.imagem ? `/imagens/pontos/${ponto.imagem}` : '/imagens/placeholder.png';

    const modal = document.getElementById("modal");
    const conteudo = document.getElementById("modalContent");

    if (!modal || !conteudo) return;

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
        
        <div style="display:flex; gap:9px;">
            <button class="btn-mapa" onclick="window.location='../mapa/index.html?categoria=${ponto.categoria_nome.toLowerCase()}&nome=${encodeURIComponent(ponto.nome)}'">
                 Ver no mapa
            </button>
            <button class="btn-mapa2" onclick="window.location.href='../servicos/avalia.html?id=${ponto.id}'">
                 Avalie e veja as avaliações
            </button>
        </div>
        
    </div>
    `;

    modal.style.display = "flex";
}

function fecharModal() {
    const modal = document.getElementById("modal");
    if (modal) modal.style.display = "none";
}

window.addEventListener("click", (e) => {
    const modal = document.getElementById("modal");
    if (e.target === modal) {
        fecharModal();
    }
});

// 5. EVENTOS INICIAIS
document.addEventListener("DOMContentLoaded", () => {
    carregarServicos();

    const campoPesquisa = document.querySelector(".pesquisa");
    if (campoPesquisa) {
        campoPesquisa.addEventListener("input", aplicarFiltros);
    }

    const botoesFiltro = document.querySelectorAll(".filtros button");
    botoesFiltro.forEach(botao => {
        botao.addEventListener("click", () => {
            botoesFiltro.forEach(btn => btn.classList.remove("ativo"));
            botao.classList.add("ativo");
            aplicarFiltros();
        });
    });
});