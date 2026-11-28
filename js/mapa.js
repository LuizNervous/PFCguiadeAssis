const CENTRO_ASSIS = [-24.4183, -53.5210];
const ZOOM_PADRAO = 14;
const LIMITE_LOTE = 20;

const ICONES_SVG = {
  todos: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>',
  favoritos: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
  mobilidade: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>',
  turismo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
  gastronomia: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
  posto: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/></svg>',
  farmacia: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>',
  "posto de saude": '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/></svg>',
  hospital: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/></svg>',
  padrao: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
};

const CONFIG_CATEGORIAS = {
  mobilidade: { rotulo: "Mobilidade", cor: "#2563eb", bg: "rgba(37, 99, 235, 0.12)", svg: ICONES_SVG.mobilidade },
  turismo: { rotulo: "Turismo", cor: "#0891b2", bg: "rgba(8, 145, 178, 0.12)", svg: ICONES_SVG.turismo },
  gastronomia: { rotulo: "Gastronomia", cor: "#d97706", bg: "rgba(217, 119, 6, 0.12)", svg: ICONES_SVG.gastronomia },
  posto: { rotulo: "Postos", cor: "#059669", bg: "rgba(5, 150, 105, 0.12)", svg: ICONES_SVG.posto },
  farmacia: { rotulo: "Farmácias", cor: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)", svg: ICONES_SVG.farmacia },
  "posto de saude": { rotulo: "Postos de Saúde", cor: "#e11d48", bg: "rgba(225, 29, 72, 0.12)", svg: ICONES_SVG["posto de saude"] },
  hospital: { rotulo: "Hospitais", cor: "#dc2626", bg: "rgba(220, 38, 38, 0.12)", svg: ICONES_SVG.hospital }
};

const ALIAS_URL = {
  postos: "posto",
  "postos de combustivel": "posto",
  farmacias: "farmacia",
  hospitais: "hospital",
  "postos de saude": "posto de saude"
};

function normalizarTexto(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function chaveCategoria(nome) {
  const norm = normalizarTexto(nome);
  return ALIAS_URL[norm] || norm;
}

function obterMetaCategoria(nome) {
  const chave = chaveCategoria(nome);
  if (CONFIG_CATEGORIAS[chave]) return CONFIG_CATEGORIAS[chave];
  return {
    rotulo: nome ? String(nome).trim() : "Geral",
    cor: "#4f46e5",
    bg: "rgba(79, 70, 229, 0.12)",
    svg: ICONES_SVG.padrao
  };
}

const meuMapa = L.map("mapa", {
  zoomControl: false,
  zoomSnap: 0.55,
  zoomDelta: 0.5,
  wheelPxPerZoomLevel: 160,
  wheelDebounceTime: 50,
  inertia: true,
  inertiaDeceleration: 1400,
  inertiaMaxSpeed: 1800,
  easeLinearity: 0.18,
  bounceAtZoomLimits: false,
  fadeAnimation: true,
  zoomAnimation: true,
  markerZoomAnimation: true
}).setView(CENTRO_ASSIS, ZOOM_PADRAO);
L.control.zoom({ position: "bottomright" }).addTo(meuMapa);

const atualizarTamanhoMapa = () => meuMapa.invalidateSize({ animate: false });
const palcoMapaEl = document.querySelector(".mapa-palco");
if (palcoMapaEl && typeof ResizeObserver === "function") {
  new ResizeObserver(atualizarTamanhoMapa).observe(palcoMapaEl);
}
if (palcoMapaEl && typeof IntersectionObserver === "function") {
  new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      atualizarTamanhoMapa();
    }
  }, { threshold: 0.05 }).observe(palcoMapaEl);
}
window.addEventListener("load", atualizarTamanhoMapa);
window.addEventListener("resize", atualizarTamanhoMapa);
requestAnimationFrame(atualizarTamanhoMapa);
setTimeout(atualizarTamanhoMapa, 250);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  className: "map-tiles",
  maxZoom: 19,
  keepBuffer: 6,
  updateWhenIdle: false,
  updateWhenZooming: false,
  updateInterval: 100,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(meuMapa);

const usaCluster = typeof L.markerClusterGroup === "function";
const camadaMarcadores = usaCluster
  ? L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 42,
      iconCreateFunction: (cluster) => {
        const qtd = cluster.getChildCount();
        const classe = qtd >= 20 ? "grande" : qtd >= 8 ? "medio" : "";
        return L.divIcon({
          html: `<div class="mapa-cluster ${classe}">${qtd}</div>`,
          className: "mapa-cluster-wrap",
          iconSize: [42, 42]
        });
      }
    })
  : L.layerGroup();

camadaMarcadores.addTo(meuMapa);

let dadosDosPontos = [];
let pontosFiltrados = [];
let categoriaAtiva = "todos";
let termoBusca = "";
let ordenacaoAtiva = "relevancia";
let limiteExibicao = LIMITE_LOTE;
let idPontoSelecionado = null;
let posicaoUsuario = null;
let marcadorUsuario = null;
let circuloPrecisaoUsuario = null;
let watchGeoId = null;
let timerGeoRefino = null;
const RAIO_MAX_CIDADE_METROS = 25000;
const marcadoresPorId = new Map();

const elCategorias = document.getElementById("mapaCategorias");
const elLista = document.getElementById("informacoes");
const elContagem = document.getElementById("mapaContagem");
const elBadgeMapa = document.getElementById("mapaBadgeContagem");
const elTotalLocais = document.getElementById("mapaTotalLocais");
const elBusca = document.getElementById("mapaBusca");
const elAtalho = document.getElementById("mapaAtalhoTecla");
const elLimparBusca = document.getElementById("btnLimparBusca");
const elOrdenar = document.getElementById("mapaOrdenar");
const elCarregarMaisWrap = document.getElementById("mapaCarregarMaisWrap");
const elBtnCarregarMais = document.getElementById("btnCarregarMais");
const elStatusChip = document.getElementById("mapaStatusChip");
const elStatusTexto = document.getElementById("mapaStatusTexto");
const elBtnPerto = document.getElementById("btnPertoDeMim");

function mostrarSkeleton() {
  if (!elLista) return;
  elLista.innerHTML = Array.from({ length: 5 }, () => '<div class="mapa-skeleton" aria-hidden="true"></div>').join("");
}

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatarDistancia(metros) {
  if (!Number.isFinite(metros)) return "";
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toFixed(1).replace(".", ",")} km`;
}

function criarIconePino(ponto, ativo = false) {
  const meta = obterMetaCategoria(ponto.categoria_nome);
  return L.divIcon({
    className: "mapa-pino-wrapper",
    html: `<div class="mapa-pino ${ativo ? "ativo" : ""}" style="--pino-cor:${meta.cor};">${meta.svg}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -30],
    tooltipAnchor: [14, -18]
  });
}

function atualizarDestaquePino(novoId) {
  const anteriorId = idPontoSelecionado;
  idPontoSelecionado = novoId;

  if (anteriorId && marcadoresPorId.has(anteriorId)) {
    const { marcador, ponto } = marcadoresPorId.get(anteriorId);
    marcador.setIcon(criarIconePino(ponto, false));
  }
  if (novoId && marcadoresPorId.has(novoId)) {
    const { marcador, ponto } = marcadoresPorId.get(novoId);
    marcador.setIcon(criarIconePino(ponto, true));
  }
}

function criarHtmlPopup(ponto) {
  const meta = obterMetaCategoria(ponto.categoria_nome);
  const nota = Number(ponto.media_nota || 0).toFixed(1);
  const totalAv = Number(ponto.total_avaliacoes || 0);
  const googleGPS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ponto.latitude)},${encodeURIComponent(ponto.longitude)}`;
  const urlAvaliar = `../servicos/avalia.html?id=${encodeURIComponent(ponto.id)}`;

  return `
    <div class="popup-ponto">
      <div class="popup-imagem-container">
        <img src="${escaparHtml(urlImagemPonto(ponto.imagem))}" alt="${escaparHtml(ponto.nome)}" class="popup-imagem" onerror="this.onerror=null;this.src='/imagens/placeholder.png'">
      </div>
      <div class="popup-conteudo">
        <div class="popup-topo-meta">
          <span class="mapa-pill-cat" style="--cat-cor:${meta.cor};">${escaparHtml(meta.rotulo)}</span>
          <span class="mapa-nota-badge"><span class="estrela">★</span> ${nota} <span class="qtd">(${totalAv})</span></span>
        </div>
        <h3>${escaparHtml(ponto.nome)}</h3>
        <p class="popup-endereco">${escaparHtml(ponto.endereco || "Assis Chateaubriand, PR")}</p>
        <p class="popup-descricao">${escaparHtml(ponto.descricao || "Conheça este local no Guia Assis.")}</p>
        <div class="popup-acoes">
          <a href="${googleGPS}" target="_blank" rel="noopener noreferrer" class="btn-popup btn-popup-sec">Rotas (Maps)</a>
          <a href="${urlAvaliar}" class="btn-popup">Ver e avaliar</a>
        </div>
      </div>
    </div>`;
}

function construirMarcadores() {
  marcadoresPorId.clear();

  dadosDosPontos.forEach((ponto) => {
    const lat = Number(ponto.latitude);
    const lng = Number(ponto.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const meta = obterMetaCategoria(ponto.categoria_nome);
    const pino = L.marker([lat, lng], {
      icon: criarIconePino(ponto, false),
      title: `${ponto.nome} — ${meta.rotulo}`,
      alt: `${ponto.nome} (${meta.rotulo})`
    });

    pino.bindTooltip(escaparHtml(ponto.nome), { direction: "top" });
    pino.bindPopup(criarHtmlPopup(ponto), {
      maxWidth: 276,
      minWidth: 230,
      autoPanPaddingTopLeft: [16, 78],
      autoPanPaddingBottomRight: [16, 20]
    });

    pino.on("click", () => selecionarPontoDaLista(Number(ponto.id), false));
    marcadoresPorId.set(Number(ponto.id), { marcador: pino, ponto });
  });
}



// ==========================================
// DECK DE CATEGORIAS DINÂMICO
// ==========================================
function construirDeckCategorias() {
  if (!elCategorias) return;

  const contagens = new Map();
  const nomesOriginais = new Map();

  dadosDosPontos.forEach((p) => {
    const chave = chaveCategoria(p.categoria_nome);
    contagens.set(chave, (contagens.get(chave) || 0) + 1);
    if (!nomesOriginais.has(chave)) {
      nomesOriginais.set(chave, p.categoria_nome);
    }
  });

  const ordemPreferida = ["mobilidade", "turismo", "gastronomia", "posto", "farmacia", "posto de saude", "hospital"];
  const chavesOrdenadas = Array.from(contagens.keys()).sort((a, b) => {
    const ia = ordemPreferida.indexOf(a);
    const ib = ordemPreferida.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, "pt-BR");
  });

  const tiles = [
    {
      chave: "todos",
      rotulo: "Todos",
      cor: "#2563eb",
      bg: "rgba(37, 99, 235, 0.12)",
      svg: ICONES_SVG.todos,
      qtd: dadosDosPontos.length
    },
    {
      chave: "favoritos",
      rotulo: "Favoritos",
      cor: "#db2777",
      bg: "rgba(219, 39, 119, 0.12)",
      svg: ICONES_SVG.favoritos,
      qtd: typeof Favoritos !== "undefined" ? Favoritos.total() : 0
    }
  ];

  chavesOrdenadas.forEach((chave) => {
    const meta = obterMetaCategoria(nomesOriginais.get(chave));
    tiles.push({
      chave,
      rotulo: meta.rotulo,
      cor: meta.cor,
      bg: meta.bg,
      svg: meta.svg,
      qtd: contagens.get(chave) || 0
    });
  });

  elCategorias.innerHTML = tiles
    .map(
      (t) => `
      <button type="button"
        class="cat-tile ${categoriaAtiva === t.chave ? "ativo" : ""}"
        role="tab"
        aria-selected="${categoriaAtiva === t.chave}"
        data-cat="${escaparHtml(t.chave)}"
        style="--cat-cor:${t.cor}; --cat-bg:${t.bg};">
        <span class="cat-tile-icone" aria-hidden="true">${t.svg}</span>
        <span class="cat-tile-nome">${escaparHtml(t.rotulo)}</span>
        <span class="cat-tile-qtd">${t.qtd}</span>
      </button>`
    )
    .join("");
}

// ==========================================
// FILTRAGEM, ORDENAÇÃO E SINCRONIA
// ==========================================
function obterListaFiltrada() {
  const termo = normalizarTexto(termoBusca);

  const filtrados = dadosDosPontos.filter((p) => {
    const chave = chaveCategoria(p.categoria_nome);
    const bateCat =
      categoriaAtiva === "todos"
        ? true
        : categoriaAtiva === "favoritos"
          ? typeof Favoritos !== "undefined" && Favoritos.estaSalvo(p.id)
          : chave === categoriaAtiva;

    if (!bateCat) return false;
    if (!termo) return true;

    return [p.nome, p.endereco, p.descricao, p.categoria_nome, p.tags]
      .some((campo) => normalizarTexto(campo).includes(termo));
  });

  const comDistancia = filtrados.map((p) => ({
    ...p,
    distanciaMetros: posicaoUsuario
      ? calcularDistanciaMetros(posicaoUsuario.lat, posicaoUsuario.lng, Number(p.latitude), Number(p.longitude))
      : null
  }));

  if (ordenacaoAtiva === "nota") {
    comDistancia.sort((a, b) => Number(b.media_nota || 0) - Number(a.media_nota || 0) || Number(b.total_avaliacoes || 0) - Number(a.total_avaliacoes || 0));
  } else if (ordenacaoAtiva === "nome") {
    comDistancia.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
  } else if (ordenacaoAtiva === "distancia" && posicaoUsuario) {
    comDistancia.sort((a, b) => (a.distanciaMetros ?? Infinity) - (b.distanciaMetros ?? Infinity));
  }

  return comDistancia;
}

function atualizarStatusHUD() {
  let rotulo = "Todos os locais";
  let cor = "#2563eb";

  if (categoriaAtiva === "favoritos") {
    rotulo = "Seus favoritos";
    cor = "#db2777";
  } else if (categoriaAtiva !== "todos") {
    const meta = obterMetaCategoria(categoriaAtiva);
    rotulo = meta.rotulo;
    cor = meta.cor;
  }

  const sufixoBusca = termoBusca ? ` · "${termoBusca}"` : "";
  if (elStatusTexto) elStatusTexto.textContent = `${rotulo}${sufixoBusca}`;
  if (elStatusChip) elStatusChip.style.setProperty("--cat-cor-ativa", cor);
}

function sincronizarMarcadoresMapa(lista) {
  camadaMarcadores.clearLayers();
  const camadasVisiveis = [];

  lista.forEach((p) => {
    const entry = marcadoresPorId.get(Number(p.id));
    if (entry) camadasVisiveis.push(entry.marcador);
  });

  if (usaCluster && typeof camadaMarcadores.addLayers === "function") {
    camadaMarcadores.addLayers(camadasVisiveis);
  } else {
    camadasVisiveis.forEach((m) => camadaMarcadores.addLayer(m));
  }
}

function enquadrarResultados(lista = pontosFiltrados) {
  const coords = lista
    .map((p) => [Number(p.latitude), Number(p.longitude)])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

  if (coords.length === 0) return;
  if (coords.length === 1) {
    meuMapa.flyTo(coords[0], 16, { duration: 0.75, easeLinearity: 0.22 });
    return;
  }
  const bounds = L.latLngBounds(coords);
  meuMapa.fitBounds(bounds, { padding: [46, 46], maxZoom: 16, animate: true, duration: 0.75 });
}

function criarCardHtml(ponto) {
  const meta = obterMetaCategoria(ponto.categoria_nome);
  const nota = Number(ponto.media_nota || 0).toFixed(1);
  const totalAv = Number(ponto.total_avaliacoes || 0);
  const googleGPS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ponto.latitude)},${encodeURIComponent(ponto.longitude)}`;
  const wazeGPS = `https://waze.com/ul?ll=${encodeURIComponent(ponto.latitude)},${encodeURIComponent(ponto.longitude)}&navigate=yes`;
  const urlAvaliar = `../servicos/avalia.html?id=${encodeURIComponent(ponto.id)}`;
  const btnFav = typeof Favoritos !== "undefined" ? Favoritos.botaoHtml(ponto.id, ponto.nome, "icone") : "";
  const distHtml = Number.isFinite(ponto.distanciaMetros)
    ? `<span class="mapa-dist-badge">${escaparHtml(formatarDistancia(ponto.distanciaMetros))}</span>`
    : "";
  const selecionado = Number(ponto.id) === Number(idPontoSelecionado) ? "selecionado" : "";

  return `
    <article class="mapa-card ${selecionado}" id="ponto-${Number(ponto.id)}" data-card-id="${Number(ponto.id)}">
      <div class="mapa-card-topo">
        <div class="mapa-card-thumb">
          <img src="${escaparHtml(urlImagemPonto(ponto.imagem))}" alt="${escaparHtml(ponto.nome)}" loading="lazy" onerror="this.onerror=null;this.src='/imagens/placeholder.png'">
          ${btnFav}
        </div>
        <div class="mapa-card-info">
          <div class="mapa-card-meta">
            <span class="mapa-pill-cat" style="--cat-cor:${meta.cor};">${escaparHtml(meta.rotulo)}</span>
            <span class="mapa-nota-badge"><span class="estrela">★</span> ${nota} <span class="qtd">(${totalAv})</span></span>
            ${distHtml}
          </div>
          <h3>${escaparHtml(ponto.nome)}</h3>
          <p class="mapa-card-end" title="${escaparHtml(ponto.endereco || "")}">📍 ${escaparHtml(ponto.endereco || "Assis Chateaubriand, PR")}</p>
          <p class="mapa-card-desc">${escaparHtml(ponto.descricao || "Veja mais detalhes e rotas para este local.")}</p>
        </div>
      </div>
      <div class="mapa-card-acoes">
        <button type="button" class="mapa-btn-focar" data-focar-id="${Number(ponto.id)}">Ver no mapa</button>
        <a href="${googleGPS}" target="_blank" rel="noopener noreferrer" class="mapa-btn-rota mapa-btn-maps">Maps</a>
        <a href="${wazeGPS}" target="_blank" rel="noopener noreferrer" class="mapa-btn-rota mapa-btn-waze">Waze</a>
        <a href="${urlAvaliar}" class="mapa-btn-rota mapa-btn-avaliar">Avaliar</a>
      </div>
    </article>`;
}

function renderizarLista() {
  if (!elLista) return;

  const total = pontosFiltrados.length;
  if (elContagem) {
    elContagem.textContent = total === 1 ? "1 local encontrado" : `${total} locais encontrados`;
  }
  if (elBadgeMapa) {
    elBadgeMapa.textContent = `${total} no mapa`;
  }

  if (total === 0) {
    const deslogadoFav =
      categoriaAtiva === "favoritos" &&
      typeof Favoritos !== "undefined" &&
      !Favoritos.estaLogado();

    if (deslogadoFav) {
      elLista.innerHTML = `
        <div class="mapa-vazio">
          <h3>Entre para ver seus favoritos</h3>
          <p>Entre na sua conta para salvar e visualizar seus locais favoritos no mapa.</p>
          <div class="mapa-vazio-acoes">
            <a href="../login/login.html" class="mapa-btn-limpar-filtros">Entrar na conta</a>
            <button type="button" id="btnLimparFiltrosVazio" class="mapa-btn-secundario">Mostrar todos</button>
          </div>
        </div>`;
    } else {
      elLista.innerHTML = `
        <div class="mapa-vazio">
          <h3>Nenhum local encontrado</h3>
          <p>${categoriaAtiva === "favoritos" ? "Você ainda não salvou nenhum local nos favoritos." : "Tente buscar outro termo ou escolher outra categoria."}</p>
          <button type="button" id="btnLimparFiltrosVazio" class="mapa-btn-limpar-filtros">Mostrar todos os locais</button>
        </div>`;
    }
    if (elCarregarMaisWrap) elCarregarMaisWrap.hidden = true;
    document.getElementById("btnLimparFiltrosVazio")?.addEventListener("click", resetarFiltros);
    return;
  }

  const visiveis = pontosFiltrados.slice(0, limiteExibicao);
  elLista.innerHTML = visiveis.map(criarCardHtml).join("");
  if (typeof Favoritos !== "undefined") Favoritos.atualizarBotoes(elLista);

  if (elCarregarMaisWrap && elBtnCarregarMais) {
    const restantes = total - visiveis.length;
    elCarregarMaisWrap.hidden = restantes <= 0;
    if (restantes > 0) {
      elBtnCarregarMais.textContent = `Mostrar mais (${Math.min(LIMITE_LOTE, restantes)} de ${restantes} restantes)`;
    }
  }
}

function aplicarFiltrosEAtualizar({ ajustarZoom = false } = {}) {
  pontosFiltrados = obterListaFiltrada();
  sincronizarMarcadoresMapa(pontosFiltrados);
  renderizarLista();
  atualizarStatusHUD();
  if (ajustarZoom) {
    enquadrarResultados(pontosFiltrados);
  }
}

function resetarFiltros() {
  categoriaAtiva = "todos";
  termoBusca = "";
  if (elBusca) elBusca.value = "";
  if (elLimparBusca) elLimparBusca.hidden = true;
  if (elAtalho) elAtalho.hidden = false;
  limiteExibicao = LIMITE_LOTE;
  construirDeckCategorias();
  aplicarFiltrosEAtualizar({ ajustarZoom: true });
}

function focarPontoNoMapa(id) {
  const entry = marcadoresPorId.get(Number(id));
  if (!entry) return;

  atualizarDestaquePino(Number(id));
  document.querySelectorAll(".mapa-card.selecionado").forEach((c) => c.classList.remove("selecionado"));
  document.getElementById(`ponto-${Number(id)}`)?.classList.add("selecionado");

  const { marcador } = entry;
  if (usaCluster && typeof camadaMarcadores.zoomToShowLayer === "function") {
    camadaMarcadores.zoomToShowLayer(marcador, () => {
      marcador.openPopup();
    });
  } else {
    meuMapa.flyTo(marcador.getLatLng(), 16, { duration: 0.75, easeLinearity: 0.22 });
    marcador.openPopup();
  }

  if (window.innerWidth <= 960) {
    document.querySelector(".mapa-palco")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function selecionarPontoDaLista(id, abrirPopup = false) {
  const idx = pontosFiltrados.findIndex((p) => Number(p.id) === Number(id));
  if (idx !== -1 && idx >= limiteExibicao) {
    limiteExibicao = Math.ceil((idx + 1) / LIMITE_LOTE) * LIMITE_LOTE;
    renderizarLista();
  }

  atualizarDestaquePino(Number(id));
  document.querySelectorAll(".mapa-card.selecionado").forEach((c) => c.classList.remove("selecionado"));
  const card = document.getElementById(`ponto-${Number(id)}`);
  if (card) {
    card.classList.add("selecionado");
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (abrirPopup) focarPontoNoMapa(id);
}

// ==========================================
// GEOLOCALIZAÇÃO ("PERTO DE MIM")
// ==========================================
function pararMonitoramentoGeo() {
  if (watchGeoId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchGeoId);
    watchGeoId = null;
  }
  if (timerGeoRefino !== null) {
    clearTimeout(timerGeoRefino);
    timerGeoRefino = null;
  }
}

function posicionarMarcadorUsuario(lat, lng, precisaoMetros = null, { ajustarCamera = true, aviso = null } = {}) {
  posicaoUsuario = { lat, lng };

  if (marcadorUsuario) meuMapa.removeLayer(marcadorUsuario);
  if (circuloPrecisaoUsuario) {
    meuMapa.removeLayer(circuloPrecisaoUsuario);
    circuloPrecisaoUsuario = null;
  }

  if (Number.isFinite(precisaoMetros) && precisaoMetros > 30 && precisaoMetros <= 5000) {
    circuloPrecisaoUsuario = L.circle([lat, lng], {
      radius: precisaoMetros,
      color: "#2563eb",
      weight: 1.5,
      fillColor: "#2563eb",
      fillOpacity: 0.12,
      interactive: false
    }).addTo(meuMapa);
  }

  const textoTooltip =
    precisaoMetros === null
      ? "Sua posição (ajustada manualmente) · arraste para mover"
      : precisaoMetros <= 100
        ? `Você está aqui (±${Math.round(precisaoMetros)} m) · arraste para ajustar`
        : `Posição aproximada (±${formatarDistancia(precisaoMetros)}) · arraste para ajustar`;

  marcadorUsuario = L.marker([lat, lng], {
    draggable: true,
    autoPan: true,
    zIndexOffset: 900,
    icon: L.divIcon({
      className: "mapa-user-dot-wrap",
      html: '<div class="mapa-user-dot"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    }),
    title: "Sua localização (arraste para ajustar)"
  })
    .bindTooltip(textoTooltip, { direction: "top" })
    .addTo(meuMapa);

  marcadorUsuario.on("dragend", (ev) => {
    const novaPos = ev.target.getLatLng();
    posicionarMarcadorUsuario(novaPos.lat, novaPos.lng, null, {
      ajustarCamera: false,
      aviso: { texto: "Posição ajustada! Distâncias recalculadas.", tipo: "alertBom", tempo: 2800 }
    });
  });

  const opDist = elOrdenar?.querySelector('option[value="distancia"]');
  if (opDist) {
    opDist.hidden = false;
    opDist.disabled = false;
  }
  if (elOrdenar) elOrdenar.value = "distancia";
  ordenacaoAtiva = "distancia";

  elBtnPerto?.classList.add("ativo");
  if (ajustarCamera) {
    const zoomAlvo = Number.isFinite(precisaoMetros) && precisaoMetros > 500 ? 14 : 15.5;
    meuMapa.flyTo([lat, lng], zoomAlvo, { duration: 0.75, easeLinearity: 0.22 });
  }

  aplicarFiltrosEAtualizar({ ajustarZoom: false });
  if (aviso && typeof criarAlerta === "function") {
    criarAlerta(aviso.texto, aviso.tipo, aviso.tempo || 4500);
  }
}

function ativarGeolocalizacao() {
  if (!navigator.geolocation) {
    if (typeof criarAlerta === "function") {
      criarAlerta("Seu navegador não suporta geolocalização.", "alertRuim", 4000);
    }
    return;
  }

  pararMonitoramentoGeo();
  elBtnPerto.disabled = true;
  elBtnPerto.classList.add("carregando");

  let melhorLeitura = null;
  let finalizado = false;

  function finalizarBuscaGeo(erroMsg = null) {
    if (finalizado) return;
    finalizado = true;
    pararMonitoramentoGeo();
    elBtnPerto.disabled = false;
    elBtnPerto.classList.remove("carregando");

    if (!melhorLeitura) {
      if (typeof criarAlerta === "function") {
        criarAlerta(
          erroMsg || "Não foi possível obter sua localização. Verifique a permissão do navegador.",
          "alertRuim",
          4500
        );
      }
      return;
    }

    const distCidade = calcularDistanciaMetros(
      CENTRO_ASSIS[0],
      CENTRO_ASSIS[1],
      melhorLeitura.lat,
      melhorLeitura.lng
    );

    if (distCidade > RAIO_MAX_CIDADE_METROS) {
      posicionarMarcadorUsuario(CENTRO_ASSIS[0], CENTRO_ASSIS[1], null, {
        ajustarCamera: true,
        aviso: {
          texto: "Seu navegador retornou uma posição aproximada fora de Assis (comum em PC sem GPS). Arraste o ponto azul para o seu local exato!",
          tipo: "alertRuim",
          tempo: 6000
        }
      });
      return;
    }

    if (melhorLeitura.accuracy > 500) {
      posicionarMarcadorUsuario(melhorLeitura.lat, melhorLeitura.lng, melhorLeitura.accuracy, {
        ajustarCamera: true,
        aviso: {
          texto: `Localização aproximada (±${formatarDistancia(melhorLeitura.accuracy)}). Arraste o ponto azul para sua rua exata!`,
          tipo: "alertBom",
          tempo: 5500
        }
      });
      return;
    }

    posicionarMarcadorUsuario(melhorLeitura.lat, melhorLeitura.lng, melhorLeitura.accuracy, {
      ajustarCamera: true,
      aviso: {
        texto: `Localização encontrada (±${Math.round(melhorLeitura.accuracy)} m)! Locais ordenados por distância.`,
        tipo: "alertBom",
        tempo: 3500
      }
    });
  }

  watchGeoId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      const precisao = Number.isFinite(accuracy) ? accuracy : 9999;

      if (!melhorLeitura || precisao < melhorLeitura.accuracy) {
        melhorLeitura = { lat, lng, accuracy: precisao };
      }

      if (precisao <= 35) {
        finalizarBuscaGeo();
      }
    },
    (erro) => {
      if (melhorLeitura) {
        finalizarBuscaGeo();
        return;
      }
      let msg = "Não foi possível obter sua localização. Verifique a permissão do navegador.";
      if (erro?.code === 1) msg = "Permissão de localização negada no navegador.";
      else if (erro?.code === 2) msg = "Sinal de localização indisponível no momento.";
      else if (erro?.code === 3) msg = "Tempo esgotado ao buscar sua localização.";
      finalizarBuscaGeo(msg);
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
  );

  timerGeoRefino = setTimeout(() => finalizarBuscaGeo(), 5000);
}

// ==========================================
// CARREGAMENTO DE DADOS E EVENTOS
// ==========================================
async function carregarPontos() {
  mostrarSkeleton();
  try {
    const promessaFav =
      typeof Favoritos !== "undefined" && typeof Favoritos.carregar === "function"
        ? Favoritos.carregar()
        : Promise.resolve([]);

    const [resPontos] = await Promise.allSettled([fetch(`${API_URL}/pontos`), promessaFav]);
    if (resPontos.status !== "fulfilled" || !resPontos.value.ok) {
      throw new Error(`Status ${resPontos.status === "fulfilled" ? resPontos.value.status : "rede"}`);
    }
    const json = await resPontos.value.json();
    dadosDosPontos = Array.isArray(json) ? json : [];

    if (elTotalLocais) elTotalLocais.textContent = String(dadosDosPontos.length);

    construirMarcadores();

    const parametrosUrl = new URLSearchParams(window.location.search);
    const catParam = parametrosUrl.get("categoria");
    const nomeParam = parametrosUrl.get("nome")?.trim();

    if (catParam) {
      const chave = chaveCategoria(catParam);
      if (chave === "favoritos" || dadosDosPontos.some((p) => chaveCategoria(p.categoria_nome) === chave)) {
        categoriaAtiva = chave;
      }
    }

    construirDeckCategorias();
    aplicarFiltrosEAtualizar({ ajustarZoom: Boolean(catParam) });

    if (nomeParam) {
      const alvo = dadosDosPontos.find((p) => normalizarTexto(p.nome) === normalizarTexto(nomeParam));
      if (alvo) {
        selecionarPontoDaLista(Number(alvo.id), true);
      }
    }
  } catch (erro) {
    console.error("Erro ao carregar os dados do mapa:", erro);
    if (elContagem) elContagem.textContent = "Erro ao carregar locais";
    if (elLista) {
      elLista.innerHTML = `
        <div class="mapa-vazio">
          <h3>Não foi possível carregar o mapa</h3>
          <p>Verifique sua conexão com a internet e tente novamente.</p>
          <button type="button" id="btnRecarregarMapa" class="mapa-btn-limpar-filtros">Tentar novamente</button>
        </div>`;
      document.getElementById("btnRecarregarMapa")?.addEventListener("click", carregarPontos);
    }
  }
}

elCategorias?.addEventListener("click", (evento) => {
  const tile = evento.target.closest("button[data-cat]");
  if (!tile) return;
  categoriaAtiva = tile.dataset.cat;
  limiteExibicao = LIMITE_LOTE;
  construirDeckCategorias();
  aplicarFiltrosEAtualizar({ ajustarZoom: true });
});

elLista?.addEventListener("click", (evento) => {
  if (evento.target.closest("a") || evento.target.closest("[data-favorito-id]")) return;
  const btnFocar = evento.target.closest("[data-focar-id]");
  if (btnFocar) {
    focarPontoNoMapa(Number(btnFocar.dataset.focarId));
    return;
  }
  const card = evento.target.closest("[data-card-id]");
  if (card) {
    focarPontoNoMapa(Number(card.dataset.cardId));
  }
});

let timerBusca;
elBusca?.addEventListener("input", () => {
  const temTexto = elBusca.value.length > 0;
  if (elLimparBusca) elLimparBusca.hidden = !temTexto;
  if (elAtalho) elAtalho.hidden = temTexto;

  clearTimeout(timerBusca);
  timerBusca = setTimeout(() => {
    termoBusca = elBusca.value.trim();
    limiteExibicao = LIMITE_LOTE;
    aplicarFiltrosEAtualizar({ ajustarZoom: false });
  }, 180);
});

elLimparBusca?.addEventListener("click", () => {
  elBusca.value = "";
  termoBusca = "";
  elLimparBusca.hidden = true;
  if (elAtalho) elAtalho.hidden = false;
  limiteExibicao = LIMITE_LOTE;
  aplicarFiltrosEAtualizar({ ajustarZoom: false });
  elBusca.focus();
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
    evento.preventDefault();
    elBusca?.focus();
  } else if (evento.key === "Escape" && document.activeElement === elBusca) {
    elBusca.blur();
  }
});

elOrdenar?.addEventListener("change", () => {
  ordenacaoAtiva = elOrdenar.value;
  limiteExibicao = LIMITE_LOTE;
  aplicarFiltrosEAtualizar({ ajustarZoom: false });
});

elBtnCarregarMais?.addEventListener("click", () => {
  limiteExibicao += LIMITE_LOTE;
  renderizarLista();
});

elBtnPerto?.addEventListener("click", ativarGeolocalizacao);
document.getElementById("btnEnquadrar")?.addEventListener("click", () => enquadrarResultados(pontosFiltrados));
document.getElementById("btnCentralizar")?.addEventListener("click", () => {
  meuMapa.flyTo(CENTRO_ASSIS, ZOOM_PADRAO, { duration: 0.75, easeLinearity: 0.22 });
});

document.addEventListener("favoritos:alterado", () => {
  if (dadosDosPontos.length === 0) return;
  construirDeckCategorias();
  if (categoriaAtiva === "favoritos") {
    aplicarFiltrosEAtualizar({ ajustarZoom: false });
  } else {
    renderizarLista();
  }
});

carregarPontos();
