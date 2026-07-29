const meuMapa = L.map('mapa').setView([-24.4183, -53.5210], 14);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(meuMapa);


const grupoMobilidade = L.layerGroup();
const grupoTurismo = L.layerGroup();
const grupoGastronomia = L.layerGroup();
const grupoPostos = L.layerGroup();
const grupoHospitais = L.layerGroup();
const grupoPostosSaude = L.layerGroup();
const grupoFarmacia = L.layerGroup();

const todasCategorias = {
    "mobilidade": grupoMobilidade,
    "turismo": grupoTurismo,
    "gastronomia": grupoGastronomia,
    "posto": grupoPostos,
    "hospital": grupoHospitais,
    "posto de saúde": grupoPostosSaude,
    "farmacia": grupoFarmacia
};

let dadosDosPontos = [];

async function carregarPontos() {
    try {
        const resposta = await fetch("https://guia-assis.onrender.com/api/pontos");
        dadosDosPontos = await resposta.json();

        dadosDosPontos.forEach(ponto => {
            const pino = L.marker([ponto.latitude, ponto.longitude]).bindPopup(`
                <b>${ponto.nome}</b>
                 <br>
                <a href="#ponto-${ponto.id}">Ver mais</a>`);
            const grupoCategoria = ponto.categoria_nome.toLowerCase();

            if (todasCategorias[grupoCategoria]) {
                pino.addTo(todasCategorias[grupoCategoria]);
            }
        });
        todasCategorias['mobilidade'].addTo(meuMapa);
        rederizarCards('mobilidade');

    } catch (erro) {
        console.error("Erro ao carregar os dados do mapa:", erro);
    }
}
function rederizarCards(categoria) {
    const divs = document.getElementById("informacoes");
    divs.innerHTML = '';

    const pontosFiltrados = dadosDosPontos.filter(ponto => ponto.categoria_nome.toLowerCase() === categoria)

    pontosFiltrados.forEach(ponto => {
        const googleGPS = `https://www.google.com/maps/dir/?api=1&destination=${ponto.latitude},${ponto.longitude}`;
        const wazeGPS = `https://waze.com/ul?ll=${ponto.latitude},${ponto.longitude}&navigate=yes`;

        divs.innerHTML += `
             <div class="ponto-card" id="ponto-${ponto.id}">
                <div class="introducao">
                <h3>${ponto.imagem}</h3>
                    <img src="../imagens/pontos/${ponto.imagem}">
                    <div class="descricao">
                    <h3>${ponto.nome}</h3>
                    <p><strong>Endereço : </strong>${ponto.endereco}</p>
                    <p>${ponto.descricao}</p>
                    </div>
                </div>
                <div class="links">
                    <a href="${googleGPS}"  target="_blank" ><button id="maps">Abrir no Google Maps</button></a>
                    <a href="${wazeGPS}"  target="_blank" ><button id="waze">Abrir no Waze</button></a>
                </div>
             </div>`
    });
};

const botoes = document.querySelectorAll('.btn-filtro');
botoes.forEach(function (botao) {
    botao.addEventListener('click', function () {

        botoes.forEach(b => b.classList.remove('ativo'));

        this.classList.add('ativo');

        for (var key in todasCategorias) {
            meuMapa.removeLayer(todasCategorias[key]);
        }

        var categoriaClicada = this.getAttribute('data-categoria');
        
        if (todasCategorias[categoriaClicada]) {
            todasCategorias[categoriaClicada].addTo(meuMapa);
        }

        rederizarCards(categoriaClicada);
    });
});
carregarPontos();document.addEventListener('DOMContentLoaded', () => {

    const temaSalvo = localStorage.getItem("tema");
    if (temaSalvo === "Escuro") {
        document.body.classList.add("Escuro");
    } 


    const botaoMenu = document.getElementById("botaoMenu");
    const fechar = document.getElementById("closeMenu");
    
   if (botaoMenu && fechar) {
        botaoMenu.addEventListener("click", () => {
            document.querySelector(".escondido").classList.toggle('aberto');
        });
        fechar.addEventListener("click", () => {
            document.querySelector(".escondido").classList.remove('aberto');
        });
    }

    const botaoEscuro = document.getElementById("conteiner");

     if (botaoEscuro) {
        botaoEscuro.addEventListener("click", () => {
            document.body.classList.toggle("Escuro");
           
            if (document.body.classList.contains("Escuro")) {
                localStorage.setItem("tema","Escuro");
                 
                botaoEscuro.classList.add("Claro")
            }
            else {
                localStorage.setItem("tema","Claro");
               
            }
        });
    } 

});
