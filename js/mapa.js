// 1. Inicialização do Mapa
const meuMapa = L.map('mapa').setView([-24.4183, -53.5210], 14);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(meuMapa);

// 2. Grupos de Camadas (Layer Groups)
const grupoMobilidade = L.layerGroup();
const grupoTurismo = L.layerGroup();
const grupoGastronomia = L.layerGroup();
const grupoPostos = L.layerGroup();
const grupoHospitais = L.layerGroup();
const grupoPostosSaude = L.layerGroup();
const grupoFarmacia = L.layerGroup();

// Mapeamento das categorias
const todasCategorias = {
    "mobilidade": grupoMobilidade,
    "turismo": grupoTurismo,
    "gastronomia": grupoGastronomia,
    "posto": grupoPostos,
    "postos": grupoPostos,
    "hospital": grupoHospitais,
    "hospitais": grupoHospitais,
    "posto de saúde": grupoPostosSaude,
    "postos de saúde": grupoPostosSaude,
    "farmacia": grupoFarmacia,
    "farmacias": grupoFarmacia
};

let dadosDosPontos = [];
let todosOsPinos = {};

// 3. Desenhar os Cards na Tela
function renderizarCards(categoria) {
    const divs = document.getElementById("informacoes");
    if (!divs) return;

    divs.innerHTML = '';
    const categoriaNormalizada = categoria.toLowerCase().trim();

    const pontosFiltrados = dadosDosPontos.filter(ponto => {
        const catPonto = ponto.categoria_nome.toLowerCase().trim();
        return catPonto === categoriaNormalizada ||
            (categoriaNormalizada === 'postos' && catPonto === 'posto') ||
            (categoriaNormalizada === 'hospitais' && catPonto === 'hospital') ||
            (categoriaNormalizada === 'farmacias' && catPonto === 'farmacia') ||
            (categoriaNormalizada === 'postos de saúde' && catPonto === 'posto de saúde');
    });

    if (pontosFiltrados.length === 0) {
        divs.innerHTML = '<p style="text-align:center; padding: 20px;">Nenhum local cadastrado nesta categoria ainda.</p>';
        return;
    }

    pontosFiltrados.forEach(ponto => {
        const googleGPS = `https://www.google.com/maps/dir/?api=1&destination=${ponto.latitude},${ponto.longitude}`;
        const wazeGPS = `https://waze.com/ul?ll=${ponto.latitude},${ponto.longitude}&navigate=yes`;

        divs.innerHTML += `
             <div class="ponto-card" id="ponto-${ponto.id}">
                <div class="introducao">
                    <img src="../imagens/pontos/${ponto.imagem}" alt="${ponto.nome}">
                    <div class="descricao">
                        <h3>${ponto.nome}</h3>
                        <p><strong>Endereço: </strong>${ponto.endereco}</p>
                        <p>${ponto.descricao}</p>
                    </div>
                </div>
                <div class="links">
                    <a href="${googleGPS}" target="_blank"><button id="maps">Abrir no Google Maps</button></a>
                    <a href="${wazeGPS}" target="_blank"><button id="waze">Abrir no Waze</button></a>
                </div>
             </div>`;
    });
}

// 4. Requisição de dados da API
async function carregarPontos() {
    try {
        const resposta = await fetch("https://guia-assis.onrender.com/api/pontos");
        dadosDosPontos = await resposta.json();

        dadosDosPontos.forEach(ponto => {
            const pino = L.marker([ponto.latitude, ponto.longitude]).bindPopup(`
                <div class="popup-ponto">
                    <img src="../imagens/pontos/${ponto.imagem}" alt="${ponto.nome}">
                    <h3>${ponto.nome}</h3>
                    <a href="javascript:void(0)" 
                       onclick="document.getElementById('ponto-${ponto.id}')?.scrollIntoView({ behavior: 'smooth', block: 'center' })" 
                       class="btn-popup">
                       Ver mais
                    </a>
                </div>
            `);

            const grupoCategoria = ponto.categoria_nome.toLowerCase().trim();

            if (todasCategorias[grupoCategoria]) {
                pino.addTo(todasCategorias[grupoCategoria]);
            }

            todosOsPinos[ponto.nome] = pino;
        });

        const parametrosUrl = new URLSearchParams(window.location.search);
        const categoriaUrl = parametrosUrl.get('categoria')?.toLowerCase().trim();
        const nomeUrl = parametrosUrl.get('nome')?.trim();

        const categoriaInicial = categoriaUrl || 'mobilidade';

        if (todasCategorias[categoriaInicial]) {
            todasCategorias[categoriaInicial].addTo(meuMapa);
        }

        const botoes = document.querySelectorAll('.btn-filtro');
        botoes.forEach(b => {
            b.classList.remove('ativo');
            if (b.getAttribute('data-categoria')?.toLowerCase().trim() === categoriaInicial) {
                b.classList.add('ativo');
            }
        });

        renderizarCards(categoriaInicial);

        if (nomeUrl && todosOsPinos[nomeUrl]) {
            const pinoAlvo = todosOsPinos[nomeUrl];
            meuMapa.setView(pinoAlvo.getLatLng(), 16);
            pinoAlvo.openPopup();
        }

    } catch (erro) {
        console.error("Erro ao carregar os dados do mapa:", erro);
    }
}

// 5. Botões de Filtro do Painel
const botoes = document.querySelectorAll('.btn-filtro');
botoes.forEach(function (botao) {
    botao.addEventListener('click', function () {
        botoes.forEach(b => b.classList.remove('ativo'));
        this.classList.add('ativo');

        for (var key in todasCategorias) {
            meuMapa.removeLayer(todasCategorias[key]);
        }

        var categoriaClicada = this.getAttribute('data-categoria').toLowerCase().trim();

        if (todasCategorias[categoriaClicada]) {
            todasCategorias[categoriaClicada].addTo(meuMapa);
        }

        renderizarCards(categoriaClicada);
    });
});

carregarPontos();