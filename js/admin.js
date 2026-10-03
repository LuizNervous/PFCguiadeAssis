// Depende de global.js (API_URL, escaparHtml, criarAlerta, urlImagemPonto), carregado antes.

const admToken = localStorage.getItem("token");
const admVerificando = document.getElementById("admVerificando");
const admPainel = document.getElementById("admPainel");
const admEl = (id) => document.getElementById(id);

const ADM_TIPOS = ["image/jpeg", "image/png", "image/webp"];
const ADM_MAX_BYTES = 5 * 1024 * 1024;

let admPontos = [];
let admCategorias = [];
let admPreviewUrl = null; // URL temporária da imagem escolhida (precisa ser liberada)
let admIdExcluir = null;

/* ==========================================
   1. PORTEIRO (quem decide é o backend)
   ========================================== */
function admMostrarProibido() {
  document.title = "403 Forbidden";
  document.querySelector("main").innerHTML =
    '<div class="adm-proibido"><h1>403</h1><p>Forbidden</p></div>';
}

function admMostrarErroVerificacao(texto) {
  admVerificando.textContent = texto;
}

async function admVerificarAdmin() {
  if (!admToken) {
    admMostrarProibido();
    return false;
  }

  try {
    const resposta = await fetch(`${API_URL}/admin/verificar`, {
      headers: { "Authorization": `Bearer ${admToken}` }
    });

    if (resposta.ok) return true;

    if (resposta.status === 401 || resposta.status === 403) {
      if (resposta.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
      }
      admMostrarProibido();
    } else {
      admMostrarErroVerificacao("Não foi possível verificar suas permissões agora. Recarregue a página em instantes.");
    }
  } catch (erro) {
    console.error("Erro ao verificar permissão de administrador:", erro);
    admMostrarErroVerificacao("Erro de conexão com o servidor. Recarregue a página em instantes.");
  }
  return false;
}

async function admFetch(caminho, opcoes = {}) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: { ...opcoes.headers, "Authorization": `Bearer ${admToken}` }
  });
  if (resposta.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    admMostrarProibido();
    return null; // quem chamou deve parar
  }
  return resposta;
}

async function admLerJson(resposta) {
  try {
    return await resposta.json();
  } catch {
    return {};
  }
}


function admMostrarSecao(nome) {
  document.querySelectorAll(".adm-secao").forEach((secao) => {
    secao.hidden = secao.id !== `sec-${nome}`;
  });

  document.querySelectorAll(".adm-nav button").forEach((botao) => {
    const ativo = botao.dataset.secao === nome;
    botao.classList.toggle("ativo", ativo);
    if (ativo) botao.setAttribute("aria-current", "page");
    else botao.removeAttribute("aria-current");
  });
}


function admNormalizar(texto) {
  return String(texto ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function admRenderResumo() {
  const categorias = new Set(admPontos.map((p) => p.categoria_nome));
  const avaliacoes = admPontos.reduce((total, p) => total + (Number(p.total_avaliacoes) || 0), 0);
  const itens = [
    ["Pontos cadastrados", admPontos.length],
    ["Categorias em uso", categorias.size],
    ["Avaliações recebidas", avaliacoes]
  ];
  admEl("admResumo").innerHTML = itens
    .map(([rotulo, valor]) => `<div class="adm-card"><strong>${valor}</strong><span>${rotulo}</span></div>`)
    .join("");
}

function admRenderTabela(lista) {
  const alvo = admEl("admTabela");

  if (lista.length === 0) {
    const msg = admPontos.length === 0 ? "Nenhum ponto cadastrado ainda." : "Nenhum ponto encontrado para esse filtro.";
    alvo.innerHTML = `<p class="adm-status">${msg}</p>`;
    return;
  }

  const linhas = lista.map((p) => {
    const nome = escaparHtml(p.nome);
    const id = Number(p.id);
    return `
    <tr>
      <td data-label="Imagem"><img class="adm-mini" src="${escaparHtml(urlImagemPonto(p.imagem))}" alt="" loading="lazy"></td>
      <td data-label="Nome">${nome}</td>
      <td data-label="Categoria">${escaparHtml(p.categoria_nome)}</td>
      <td data-label="Endereço">${escaparHtml(p.endereco)}</td>
      <td data-label="Nota">${(Number(p.media_nota) || 0).toFixed(1)} (${Number(p.total_avaliacoes) || 0})</td>
      <td class="adm-linha-acoes">
        <button type="button" class="adm-btn" data-acao="editar" data-id="${id}" aria-label="Editar ${nome}">Editar</button>
        <button type="button" class="adm-btn adm-btn-perigo" data-acao="excluir" data-id="${id}" aria-label="Excluir ${nome}">Excluir</button>
      </td>
    </tr>`;
  }).join("");

  alvo.innerHTML = `
    <div class="adm-tabela-wrap">
      <table>
        <caption class="adm-so-leitor">Pontos cadastrados</caption>
        <thead>
          <tr>
            <th scope="col">Imagem</th>
            <th scope="col">Nome</th>
            <th scope="col">Categoria</th>
            <th scope="col">Endereço</th>
            <th scope="col">Nota (avaliações)</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
}

function admRenderImagens() {
  const alvo = admEl("admImagens");
  if (admPontos.length === 0) {
    alvo.innerHTML = '<p class="adm-status">Nenhuma imagem para mostrar.</p>';
    return;
  }
  alvo.innerHTML = admPontos.map((p) => `
    <figure class="adm-foto">
      <img src="${escaparHtml(urlImagemPonto(p.imagem))}" alt="${escaparHtml(p.nome)}" loading="lazy">
      <figcaption>${escaparHtml(p.nome)}</figcaption>
    </figure>`).join("");
}

function admFiltrar() {
  const termo = admNormalizar(admEl("admBusca").value.trim());
  const categoria = admEl("admFiltroCategoria").value;

  const lista = admPontos.filter((p) => {
    const bateCategoria = !categoria || String(p.id_categoria) === categoria;
    const bateTexto = !termo || [p.nome, p.endereco, p.categoria_nome, p.descricao]
      .some((campo) => admNormalizar(campo).includes(termo));
    return bateCategoria && bateTexto;
  });

  admRenderTabela(lista);
  admEl("admContagem").textContent = `${lista.length} de ${admPontos.length} pontos`;
}

async function admCarregarPontos(silencioso = false) {
  const ids = ["admResumo", "admTabela", "admImagens"];
  if (!silencioso) {
    ids.forEach((id) => {
      admEl(id).innerHTML = '<p class="adm-status" role="status">Carregando…</p>';
    });
  }

  try {
    const resposta = await fetch(`${API_URL}/pontos`);
    if (!resposta.ok) throw new Error(`Status ${resposta.status}`);
    admPontos = await resposta.json();

    admRenderResumo();
    admFiltrar();
    admRenderImagens();
  } catch (erro) {
    console.error("Erro ao carregar os pontos no painel:", erro);
    if (!silencioso) {
      ids.forEach((id) => {
        admEl(id).innerHTML = '<p class="adm-status">Não foi possível carregar os dados. Recarregue a página.</p>';
      });
    }
    criarAlerta("Erro ao carregar os pontos.", "alertRuim", 5000);
  }
}

async function admCarregarCategorias() {
  try {
    const resposta = await admFetch("/admin/categorias");
    if (!resposta || !resposta.ok) throw new Error("Falha ao buscar categorias");
    admCategorias = await resposta.json();
  } catch (erro) {
    console.error("Erro ao carregar categorias:", erro);
    criarAlerta("Não foi possível carregar as categorias.", "alertRuim", 5000);
    return;
  }

  const opcoes = admCategorias
    .map((c) => `<option value="${Number(c.id)}">${escaparHtml(c.nome)}</option>`)
    .join("");
  admEl("admFiltroCategoria").innerHTML = '<option value="">Todas as categorias</option>' + opcoes;
  admEl("admCategoria").innerHTML = '<option value="">Selecione…</option>' + opcoes;
}

function admErroForm(texto) {
  const caixa = admEl("admErroForm");
  caixa.textContent = texto || "";
  caixa.hidden = !texto;
}

function admMostrarPreview(url, legenda) {
  const img = admEl("admPreview");
  if (url) {
    img.src = url;
    img.hidden = false;
  } else {
    img.removeAttribute("src");
    img.hidden = true;
  }
  admEl("admLegendaPreview").textContent = url ? legenda : "Nenhuma imagem selecionada";
}

function admLiberarPreview() {
  if (admPreviewUrl) {
    URL.revokeObjectURL(admPreviewUrl);
    admPreviewUrl = null;
  }
}

function admPreviewAtual() {
  const ponto = admPontos.find((p) => String(p.id) === admEl("admId").value);
  admMostrarPreview(ponto ? urlImagemPonto(ponto.imagem) : null, "Imagem atual");
}

function admAbrirForm(ponto = null) {
  admEl("admForm").reset();
  admErroForm("");
  admLiberarPreview();

  admEl("admId").value = ponto ? ponto.id : "";
  admEl("admTituloForm").textContent = ponto ? "Editar ponto" : "Novo ponto";
  admEl("admImagemDica").textContent = ponto
    ? "Opcional: escolha um arquivo só se quiser trocar a imagem atual."
    : "Obrigatória. JPEG, PNG ou WebP, até 5 MB.";

  if (ponto) {
    admEl("admNome").value = ponto.nome ?? "";
    admEl("admCategoria").value = String(ponto.id_categoria);
    admEl("admEndereco").value = ponto.endereco ?? "";
    admEl("admDescricao").value = ponto.descricao ?? "";
    admEl("admLatitude").value = ponto.latitude ?? "";
    admEl("admLongitude").value = ponto.longitude ?? "";
  }
  admPreviewAtual();
  admEl("admDialogoPonto").showModal();
}

function admAoEscolherImagem() {
  const arquivo = admEl("admImagem").files[0];
  admLiberarPreview();
  admErroForm("");

  if (!arquivo) return admPreviewAtual();

  if (!ADM_TIPOS.includes(arquivo.type)) {
    admEl("admImagem").value = "";
    admErroForm("Escolha uma imagem JPEG, PNG ou WebP.");
    return admPreviewAtual();
  }
  if (arquivo.size > ADM_MAX_BYTES) {
    admEl("admImagem").value = "";
    admErroForm("A imagem deve ter no máximo 5 MB.");
    return admPreviewAtual();
  }

  admPreviewUrl = URL.createObjectURL(arquivo);
  admMostrarPreview(admPreviewUrl, "Nova imagem (será salva ao confirmar)");
}

function admValidarForm(edicao) {
  if (!admEl("admNome").value.trim() || !admEl("admEndereco").value.trim() || !admEl("admDescricao").value.trim()) {
    return "Preencha nome, endereço e descrição.";
  }
  if (!admEl("admCategoria").value) return "Selecione uma categoria.";

  const lat = parseFloat(admEl("admLatitude").value);
  const lng = parseFloat(admEl("admLongitude").value);
  if (!(lat >= -90 && lat <= 90)) return "Latitude inválida (use um valor entre -90 e 90).";
  if (!(lng >= -180 && lng <= 180)) return "Longitude inválida (use um valor entre -180 e 180).";

  if (!edicao && !admEl("admImagem").files[0]) return "Escolha uma imagem para o ponto.";
  return "";
}

async function admEnviarForm(evento) {
  evento.preventDefault();
  const id = admEl("admId").value;
  const edicao = id !== "";

  const erro = admValidarForm(edicao);
  if (erro) return admErroForm(erro);
  admErroForm("");

  const dados = new FormData();
  dados.append("nome", admEl("admNome").value.trim());
  dados.append("id_categoria", admEl("admCategoria").value);
  dados.append("endereco", admEl("admEndereco").value.trim());
  dados.append("descricao", admEl("admDescricao").value.trim());
  dados.append("latitude", admEl("admLatitude").value);
  dados.append("longitude", admEl("admLongitude").value);
  const arquivo = admEl("admImagem").files[0];
  if (arquivo) dados.append("imagem", arquivo);

  const botao = admEl("admSalvar");
  botao.disabled = true;
  botao.textContent = "Salvando…";

  try {
    const caminho = edicao ? `/admin/pontos/${encodeURIComponent(id)}` : "/admin/pontos";
    const resposta = await admFetch(caminho, { method: edicao ? "PUT" : "POST", body: dados });
    if (!resposta) return;

    const retorno = await admLerJson(resposta);
    if (resposta.ok) {
      admEl("admDialogoPonto").close();
      criarAlerta(retorno.mensagem || "Ponto salvo.", "alertBom", 3500);
      await admCarregarPontos(true);
    } else if (resposta.status === 403) {
      admErroForm("Você não tem permissão para esta ação.");
    } else {
      admErroForm(retorno.mensagem || "Não foi possível salvar o ponto.");
    }
  } catch (erro) {
    console.error("Erro ao salvar ponto:", erro);
    admErroForm("Erro de conexão com o servidor. Tente novamente.");
  } finally {
    botao.disabled = false;
    botao.textContent = "Salvar";
  }
}


function admPedirExclusao(id) {
  const ponto = admPontos.find((p) => String(p.id) === String(id));
  if (!ponto) return;
  admIdExcluir = ponto.id;
  admEl("admNomeExcluir").textContent = ponto.nome;
  admEl("admDialogoExcluir").showModal();
}

async function admConfirmarExclusao() {
  const botao = admEl("admConfirmarExcluir");
  botao.disabled = true;
  botao.textContent = "Excluindo…";

  try {
    const resposta = await admFetch(`/admin/pontos/${encodeURIComponent(admIdExcluir)}`, { method: "DELETE" });
    if (!resposta) return;

    const retorno = await admLerJson(resposta);
    admEl("admDialogoExcluir").close();
    if (resposta.ok) {
      criarAlerta(retorno.mensagem || "Ponto excluído.", "alertBom", 3500);
      await admCarregarPontos(true);
    } else {
      criarAlerta(retorno.mensagem || "Não foi possível excluir o ponto.", "alertRuim", 5000);
    }
  } catch (erro) {
    console.error("Erro ao excluir ponto:", erro);
    admEl("admDialogoExcluir").close();
    criarAlerta("Erro de conexão com o servidor.", "alertRuim", 5000);
  } finally {
    botao.disabled = false;
    botao.textContent = "Excluir";
  }
}

function admLigarEventos() {
  document.querySelectorAll(".adm-nav button").forEach((botao) => {
    botao.addEventListener("click", () => admMostrarSecao(botao.dataset.secao));
  });

  admEl("admNovo").addEventListener("click", () => admAbrirForm());
  admEl("admBusca").addEventListener("input", admFiltrar);
  admEl("admFiltroCategoria").addEventListener("change", admFiltrar);

  admEl("admTabela").addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;
    if (botao.dataset.acao === "editar") {
      const ponto = admPontos.find((p) => String(p.id) === botao.dataset.id);
      if (ponto) admAbrirForm(ponto);
    } else {
      admPedirExclusao(botao.dataset.id);
    }
  });

  admEl("admForm").addEventListener("submit", admEnviarForm);
  admEl("admImagem").addEventListener("change", admAoEscolherImagem);
  admEl("admCancelar").addEventListener("click", () => admEl("admDialogoPonto").close());
  admEl("admDialogoPonto").addEventListener("close", admLiberarPreview);

  admEl("admCancelarExcluir").addEventListener("click", () => admEl("admDialogoExcluir").close());
  admEl("admConfirmarExcluir").addEventListener("click", admConfirmarExclusao);
}

(async function admIniciar() {
  const permitido = await admVerificarAdmin();
  if (!permitido) return;

  admVerificando.hidden = true;
  admPainel.hidden = false;

  admLigarEventos();
  admCarregarCategorias();
  admCarregarPontos();
})();