const admToken = localStorage.getItem("token");
const admVerificando = document.getElementById("admVerificando");
const admPainel = document.getElementById("admPainel");
const admEl = (id) => document.getElementById(id);

const ADM_TIPOS = ["image/jpeg", "image/png", "image/webp"];
const ADM_MAX_BYTES = 5 * 1024 * 1024;
const ADM_CATEGORIAS_PADRAO = new Set([
  "turismo",
  "gastronomia",
  "posto",
  "farmacia",
  "hospital",
  "posto de saude",
  "posto de saúde",
  "mobilidade"
]);

const ADM_ROTULOS_ACAO = {
  PROMOVER_ADMIN: "Promover admin",
  REBAIXAR_ADMIN: "Rebaixar admin",
  BLOQUEAR_USUARIO: "Bloquear usuário",
  DESBLOQUEAR_USUARIO: "Desbloquear usuário",
  EXCLUIR_USUARIO: "Excluir usuário",
  CRIAR_PONTO: "Criar ponto",
  EDITAR_PONTO: "Editar ponto",
  EXCLUIR_PONTO: "Excluir ponto",
  CRIAR_CATEGORIA: "Criar categoria",
  EDITAR_CATEGORIA: "Editar categoria",
  EXCLUIR_CATEGORIA: "Excluir categoria",
  EXCLUIR_AVALIACAO: "Excluir avaliação"
};

const admCollator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

let admAdminAtual = null;
let admPontos = [];
let admCategorias = [];
let admPreviewUrl = null;
let admIdExcluir = null;
let admIdCategoriaExcluir = null;
let admAlvoUsuarioAdmin = null;
let admAlvoUsuarioBloqueio = null;
let admAlvoUsuarioExcluir = null;
let admIdAvaliacaoExcluir = null;

const admEstadoPontos = { ordenar: "nome", direcao: "asc", pagina: 1, limite: 10 };
const admEstadoCategorias = { ordenar: "nome", direcao: "asc", pagina: 1, limite: 10 };
const admEstadoUsuarios = { ordenar: "id", direcao: "desc", pagina: 1, limite: 10, itens: [], total: 0, totalPaginas: 1, carregado: false };
const admEstadoAvaliacoes = { ordenar: "id", direcao: "desc", pagina: 1, limite: 10, itens: [], total: 0, totalPaginas: 1, carregado: false };
const admEstadoAuditoria = { ordenar: "criado_em", direcao: "desc", pagina: 1, limite: 10, itens: [], total: 0, totalPaginas: 1, carregado: false };

function admMostrarProibido(mensagem = "Forbidden", titulo = "403") {
  document.title = `${titulo} Forbidden`;
  document.querySelector("main").innerHTML =
    `<div class="adm-proibido"><h1>${escaparHtml(titulo)}</h1><p>${escaparHtml(mensagem)}</p></div>`;
}

function admMostrarErroVerificacao(texto) {
  admVerificando.textContent = texto;
}

function admLimparSessaoLocal() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

async function admLerJson(resposta) {
  try {
    return await resposta.json();
  } catch {
    return {};
  }
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
    const dados = await admLerJson(resposta);

    if (resposta.ok) {
      admAdminAtual = dados.usuario || null;
      return true;
    }

    if (resposta.status === 401 || resposta.status === 403) {
      if (resposta.status === 401 || dados.codigo === "CONTA_BLOQUEADA") {
        admLimparSessaoLocal();
      }
      admMostrarProibido(dados.codigo === "CONTA_BLOQUEADA" ? dados.mensagem : "Forbidden");
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
    admLimparSessaoLocal();
    admMostrarProibido();
    return null;
  }
  if (resposta.status === 403) {
    const clone = resposta.clone();
    const dados = await admLerJson(clone);
    if (dados.codigo === "CONTA_BLOQUEADA") {
      admLimparSessaoLocal();
      admMostrarProibido(dados.mensagem || "Sua conta está bloqueada.");
      return null;
    }
  }
  return resposta;
}

function admNormalizar(texto) {
  return String(texto ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function admFormatarData(valor) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function admThOrdenavel(campo, rotulo, estado) {
  const ativo = estado.ordenar === campo;
  const ariaSort = ativo ? (estado.direcao === "asc" ? "ascending" : "descending") : "none";
  const seta = ativo ? (estado.direcao === "asc" ? "▲" : "▼") : "↕";
  return `
    <th scope="col" aria-sort="${ariaSort}">
      <button type="button" class="adm-th-ordem" data-ordem="${escaparHtml(campo)}">
        <span>${escaparHtml(rotulo)}</span>
        <span class="adm-ordem-seta" aria-hidden="true">${seta}</span>
      </button>
    </th>`;
}

function admAlternarOrdem(estado, campo) {
  if (estado.ordenar === campo) {
    estado.direcao = estado.direcao === "asc" ? "desc" : "asc";
  } else {
    estado.ordenar = campo;
    estado.direcao = "asc";
  }
  estado.pagina = 1;
}

function admOrdenarLocal(lista, campo, direcao, seletores) {
  const seletor = seletores[campo];
  if (!seletor) return [...lista];
  const fator = direcao === "desc" ? -1 : 1;
  return [...lista].sort((a, b) => {
    const va = seletor(a);
    const vb = seletor(b);
    if (typeof va === "number" && typeof vb === "number") {
      return (va - vb) * fator;
    }
    return admCollator.compare(String(va ?? ""), String(vb ?? "")) * fator;
  });
}

function admPaginarLocal(lista, estado) {
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / estado.limite));
  if (estado.pagina > totalPaginas) estado.pagina = totalPaginas;
  const inicio = (estado.pagina - 1) * estado.limite;
  return {
    itens: lista.slice(inicio, inicio + estado.limite),
    total,
    pagina: estado.pagina,
    limite: estado.limite,
    totalPaginas
  };
}

function admRenderPaginacao(containerId, info, aoMudarPagina, aoMudarLimite) {
  const alvo = admEl(containerId);
  if (!alvo) return;

  const { pagina, limite, total, totalPaginas } = info;
  if (total === 0) {
    alvo.innerHTML = "";
    return;
  }

  const inicio = (pagina - 1) * limite + 1;
  const fim = Math.min(total, pagina * limite);

  const paginas = [];
  const iniJanela = Math.max(1, pagina - 2);
  const fimJanela = Math.min(totalPaginas, pagina + 2);
  for (let p = iniJanela; p <= fimJanela; p++) {
    paginas.push(
      `<button type="button" class="adm-btn adm-btn-pequeno ${p === pagina ? "adm-btn-principal" : ""}" data-pag="${p}" ${p === pagina ? 'aria-current="page"' : ""}>${p}</button>`
    );
  }

  alvo.innerHTML = `
    <div class="adm-paginacao">
      <span>Mostrando ${inicio}–${fim} de ${total}</span>
      <div class="adm-paginacao-controles">
        <label class="adm-paginacao-limite">
          <span>Por página:</span>
          <select data-limite>
            ${[10, 25, 50].map((n) => `<option value="${n}" ${n === limite ? "selected" : ""}>${n}</option>`).join("")}
          </select>
        </label>
        <button type="button" class="adm-btn adm-btn-pequeno" data-pag="${pagina - 1}" ${pagina <= 1 ? "disabled" : ""}>Anterior</button>
        ${paginas.join("")}
        <button type="button" class="adm-btn adm-btn-pequeno" data-pag="${pagina + 1}" ${pagina >= totalPaginas ? "disabled" : ""}>Próxima</button>
      </div>
    </div>`;

  alvo.querySelectorAll("button[data-pag]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nova = Number(btn.dataset.pag);
      if (nova >= 1 && nova <= totalPaginas && nova !== pagina) {
        aoMudarPagina(nova);
      }
    });
  });

  alvo.querySelector("select[data-limite]")?.addEventListener("change", (e) => {
    aoMudarLimite(Number(e.target.value));
  });
}

function admDebounce(fn, espera = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), espera);
  };
}

function admConfigurarCampoReauth(labelEl, inputEl) {
  const temSenha = admAdminAtual ? admAdminAtual.tem_senha !== false : true;
  inputEl.value = "";
  if (temSenha) {
    labelEl.textContent = "Sua senha de administrador";
    inputEl.type = "password";
    inputEl.autocomplete = "current-password";
    inputEl.placeholder = "Digite sua senha atual";
  } else {
    labelEl.textContent = "Confirme seu e-mail de administrador (conta Google)";
    inputEl.type = "email";
    inputEl.autocomplete = "email";
    inputEl.placeholder = admAdminAtual?.email || "seu-email@exemplo.com";
  }
}

function admLerCorpoReauth(inputEl) {
  const temSenha = admAdminAtual ? admAdminAtual.tem_senha !== false : true;
  if (temSenha) {
    return { senhaAdmin: inputEl.value };
  }
  return { emailConfirmacao: inputEl.value.trim() };
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

  if (nome === "usuarios" && !admEstadoUsuarios.carregado) {
    admCarregarUsuarios();
  } else if (nome === "avaliacoes" && !admEstadoAvaliacoes.carregado) {
    admCarregarAvaliacoes();
  } else if (nome === "auditoria" && !admEstadoAuditoria.carregado) {
    admCarregarAuditoria();
  }
}

/* ==========================================
   VISÃO GERAL
   ========================================== */
async function admCarregarResumo(silencioso = false) {
  const alvo = admEl("admResumo");
  if (!silencioso) {
    alvo.innerHTML = '<p class="adm-status" role="status">Carregando…</p>';
  }

  try {
    const resposta = await admFetch("/admin/resumo");
    if (!resposta) return;
    if (!resposta.ok) throw new Error(`Status ${resposta.status}`);

    const r = await resposta.json();
    const cards = [
      ["Pontos cadastrados", r.total_pontos, `${r.categorias_em_uso} categorias em uso`],
      ["Categorias", r.total_categorias, "Categorias registradas"],
      ["Avaliações recebidas", r.total_avaliacoes, `Média geral: ${Number(r.media_avaliacoes || 0).toFixed(1)} ★`],
      ["Usuários cadastrados", r.total_usuarios, `${r.total_pendentes} e-mail(s) pendente(s)`],
      ["Administradores ativos", r.total_admins, "Contas com acesso ao painel"],
      ["Usuários bloqueados", r.total_bloqueados, "Contas suspensas"]
    ];

    alvo.innerHTML = cards
      .map(
        ([rotulo, valor, detalhe]) => `
        <div class="adm-card">
          <strong>${Number(valor) || 0}</strong>
          <span>${escaparHtml(rotulo)}</span>
          <small>${escaparHtml(detalhe)}</small>
        </div>`
      )
      .join("");
  } catch (erro) {
    console.error("Erro ao carregar resumo:", erro);
    if (!silencioso) {
      alvo.innerHTML = '<p class="adm-status">Não foi possível carregar o resumo.</p>';
    }
  }
}

/* ==========================================
   PONTOS
   ========================================== */
function admRenderTabela(listaPaginada) {
  const alvo = admEl("admTabela");

  if (listaPaginada.length === 0) {
    const msg = admPontos.length === 0 ? "Nenhum ponto cadastrado ainda." : "Nenhum ponto encontrado para esse filtro.";
    alvo.innerHTML = `<p class="adm-status">${msg}</p>`;
    return;
  }

  const linhas = listaPaginada.map((p) => {
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
        <div class="adm-acoes-grupo">
          <button type="button" class="adm-btn adm-btn-pequeno" data-acao="editar" data-id="${id}" aria-label="Editar ${nome}">Editar</button>
          <button type="button" class="adm-btn adm-btn-pequeno adm-btn-perigo" data-acao="excluir" data-id="${id}" aria-label="Excluir ${nome}">Excluir</button>
        </div>
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
            ${admThOrdenavel("nome", "Nome", admEstadoPontos)}
            ${admThOrdenavel("categoria_nome", "Categoria", admEstadoPontos)}
            ${admThOrdenavel("endereco", "Endereço", admEstadoPontos)}
            ${admThOrdenavel("media_nota", "Nota (avaliações)", admEstadoPontos)}
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;

  alvo.querySelectorAll("button[data-ordem]").forEach((btn) => {
    btn.addEventListener("click", () => {
      admAlternarOrdem(admEstadoPontos, btn.dataset.ordem);
      admFiltrar();
    });
  });
}

function admFiltrar(resetarPagina = false) {
  if (resetarPagina) admEstadoPontos.pagina = 1;
  const termo = admNormalizar(admEl("admBusca").value.trim());
  const categoria = admEl("admFiltroCategoria").value;

  const filtrados = admPontos.filter((p) => {
    const bateCategoria = !categoria || String(p.id_categoria) === categoria;
    const bateTexto = !termo || [p.nome, p.endereco, p.categoria_nome, p.descricao]
      .some((campo) => admNormalizar(campo).includes(termo));
    return bateCategoria && bateTexto;
  });

  const ordenados = admOrdenarLocal(filtrados, admEstadoPontos.ordenar, admEstadoPontos.direcao, {
    nome: (p) => p.nome || "",
    categoria_nome: (p) => p.categoria_nome || "",
    endereco: (p) => p.endereco || "",
    media_nota: (p) => Number(p.media_nota) || 0
  });

  const paginacao = admPaginarLocal(ordenados, admEstadoPontos);
  admRenderTabela(paginacao.itens);
  admEl("admContagem").textContent = `${filtrados.length} de ${admPontos.length} pontos`;

  admRenderPaginacao(
    "admPaginacaoPontos",
    paginacao,
    (novaPagina) => {
      admEstadoPontos.pagina = novaPagina;
      admFiltrar(false);
    },
    (novoLimite) => {
      admEstadoPontos.limite = novoLimite;
      admEstadoPontos.pagina = 1;
      admFiltrar(false);
    }
  );
}

async function admCarregarPontos(silencioso = false) {
  if (!silencioso) {
    admEl("admTabela").innerHTML = '<p class="adm-status" role="status">Carregando…</p>';
  }

  try {
    const resposta = await fetch(`${API_URL}/pontos`);
    if (!resposta.ok) throw new Error(`Status ${resposta.status}`);
    admPontos = await resposta.json();
    admFiltrar(false);
  } catch (erro) {
    console.error("Erro ao carregar os pontos no painel:", erro);
    if (!silencioso) {
      admEl("admTabela").innerHTML = '<p class="adm-status">Não foi possível carregar os dados. Recarregue a página.</p>';
    }
    criarAlerta("Erro ao carregar os pontos.", "alertRuim", 5000);
  }
}

/* ==========================================
   CATEGORIAS
   ========================================== */
function admSincronizarSelectsCategorias() {
  const opcoes = admCategorias
    .map((c) => `<option value="${Number(c.id)}">${escaparHtml(c.nome)}</option>`)
    .join("");

  const valFiltro = admEl("admFiltroCategoria").value;
  const valAv = admEl("admFiltroCategoriaAv").value;

  admEl("admFiltroCategoria").innerHTML = '<option value="">Todas as categorias</option>' + opcoes;
  admEl("admCategoria").innerHTML = '<option value="">Selecione…</option>' + opcoes;
  admEl("admFiltroCategoriaAv").innerHTML = '<option value="">Todas as categorias</option>' + opcoes;

  admEl("admFiltroCategoria").value = valFiltro;
  admEl("admFiltroCategoriaAv").value = valAv;
}

function admRenderCategorias(listaPaginada) {
  const alvo = admEl("admTabelaCategorias");

  if (listaPaginada.length === 0) {
    const msg = admCategorias.length === 0 ? "Nenhuma categoria cadastrada." : "Nenhuma categoria encontrada para esse filtro.";
    alvo.innerHTML = `<p class="adm-status">${msg}</p>`;
    return;
  }

  const linhas = listaPaginada.map((c) => {
    const id = Number(c.id);
    const nome = escaparHtml(c.nome);
    const totalPontos = Number(c.total_pontos) || 0;
    const emUso = totalPontos > 0;
    return `
      <tr>
        <td data-label="Nome"><strong>${nome}</strong></td>
        <td data-label="Pontos vinculados">${totalPontos}</td>
        <td class="adm-linha-acoes">
          <div class="adm-acoes-grupo">
            <button type="button" class="adm-btn adm-btn-pequeno" data-cat-acao="editar" data-id="${id}">Renomear</button>
            <button type="button" class="adm-btn adm-btn-pequeno adm-btn-perigo" data-cat-acao="excluir" data-id="${id}" ${emUso ? 'disabled title="Remova ou reatribua os pontos desta categoria antes de excluir"' : ""}>Excluir</button>
          </div>
        </td>
      </tr>`;
  }).join("");

  alvo.innerHTML = `
    <div class="adm-tabela-wrap">
      <table>
        <caption class="adm-so-leitor">Categorias cadastradas</caption>
        <thead>
          <tr>
            ${admThOrdenavel("nome", "Nome", admEstadoCategorias)}
            ${admThOrdenavel("total_pontos", "Pontos vinculados", admEstadoCategorias)}
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;

  alvo.querySelectorAll("button[data-ordem]").forEach((btn) => {
    btn.addEventListener("click", () => {
      admAlternarOrdem(admEstadoCategorias, btn.dataset.ordem);
      admFiltrarCategorias(false);
    });
  });
}

function admFiltrarCategorias(resetarPagina = false) {
  if (resetarPagina) admEstadoCategorias.pagina = 1;
  const termo = admNormalizar(admEl("admBuscaCategorias").value.trim());

  const filtradas = admCategorias.filter((c) => !termo || admNormalizar(c.nome).includes(termo));
  const ordenadas = admOrdenarLocal(filtradas, admEstadoCategorias.ordenar, admEstadoCategorias.direcao, {
    nome: (c) => c.nome || "",
    total_pontos: (c) => Number(c.total_pontos) || 0
  });

  const paginacao = admPaginarLocal(ordenadas, admEstadoCategorias);
  admRenderCategorias(paginacao.itens);
  admEl("admContagemCategorias").textContent = `${filtradas.length} de ${admCategorias.length} categorias`;

  admRenderPaginacao(
    "admPaginacaoCategorias",
    paginacao,
    (novaPagina) => {
      admEstadoCategorias.pagina = novaPagina;
      admFiltrarCategorias(false);
    },
    (novoLimite) => {
      admEstadoCategorias.limite = novoLimite;
      admEstadoCategorias.pagina = 1;
      admFiltrarCategorias(false);
    }
  );
}

async function admCarregarCategorias(silencioso = false) {
  if (!silencioso) {
    admEl("admTabelaCategorias").innerHTML = '<p class="adm-status" role="status">Carregando…</p>';
  }

  try {
    const resposta = await admFetch("/admin/categorias");
    if (!resposta || !resposta.ok) throw new Error("Falha ao buscar categorias");
    admCategorias = await resposta.json();
    admSincronizarSelectsCategorias();
    admFiltrarCategorias(false);
  } catch (erro) {
    console.error("Erro ao carregar categorias:", erro);
    if (!silencioso) {
      admEl("admTabelaCategorias").innerHTML = '<p class="adm-status">Não foi possível carregar as categorias.</p>';
    }
    criarAlerta("Não foi possível carregar as categorias.", "alertRuim", 5000);
  }
}

function admAbrirFormCategoria(cat = null) {
  admEl("admFormCategoria").reset();
  admEl("admErroCategoria").textContent = "";
  admEl("admErroCategoria").hidden = true;
  admEl("admCategoriaId").value = cat ? cat.id : "";
  admEl("admTituloCategoria").textContent = cat ? "Renomear categoria" : "Nova categoria";
  admEl("admCategoriaNome").value = cat ? cat.nome : "";

  const ehPadrao = cat ? ADM_CATEGORIAS_PADRAO.has(admNormalizar(cat.nome)) : false;
  admEl("admAvisoCategoria").hidden = !ehPadrao;

  admEl("admDialogoCategoria").showModal();
}

async function admEnviarFormCategoria(evento) {
  evento.preventDefault();
  const id = admEl("admCategoriaId").value;
  const edicao = id !== "";
  const nome = admEl("admCategoriaNome").value.trim().replace(/\s+/g, " ");

  const caixaErro = admEl("admErroCategoria");
  if (nome.length < 2 || nome.length > 50) {
    caixaErro.textContent = "Informe entre 2 e 50 caracteres.";
    caixaErro.hidden = false;
    return;
  }
  caixaErro.hidden = true;

  const botao = admEl("admSalvarCategoria");
  botao.disabled = true;
  botao.textContent = "Salvando…";

  try {
    const caminho = edicao ? `/admin/categorias/${encodeURIComponent(id)}` : "/admin/categorias";
    const resposta = await admFetch(caminho, {
      method: edicao ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome })
    });
    if (!resposta) return;

    const retorno = await admLerJson(resposta);
    if (resposta.ok) {
      admEl("admDialogoCategoria").close();
      criarAlerta(retorno.mensagem || "Categoria salva.", "alertBom", 3500);
      await Promise.all([admCarregarCategorias(true), admCarregarPontos(true), admCarregarResumo(true)]);
      if (admEstadoAvaliacoes.carregado) admCarregarAvaliacoes(true);
      if (admEstadoAuditoria.carregado) admCarregarAuditoria(true);
    } else {
      caixaErro.textContent = retorno.mensagem || "Não foi possível salvar a categoria.";
      caixaErro.hidden = false;
    }
  } catch (erro) {
    console.error("Erro ao salvar categoria:", erro);
    caixaErro.textContent = "Erro de conexão com o servidor.";
    caixaErro.hidden = false;
  } finally {
    botao.disabled = false;
    botao.textContent = "Salvar";
  }
}

function admPedirExclusaoCategoria(id) {
  const cat = admCategorias.find((c) => String(c.id) === String(id));
  if (!cat) return;
  admIdCategoriaExcluir = cat.id;
  admEl("admNomeExcluirCategoria").textContent = cat.nome;
  admEl("admDialogoExcluirCategoria").showModal();
}

async function admConfirmarExclusaoCategoria() {
  const botao = admEl("admConfirmarExcluirCategoria");
  botao.disabled = true;
  botao.textContent = "Excluindo…";

  try {
    const resposta = await admFetch(`/admin/categorias/${encodeURIComponent(admIdCategoriaExcluir)}`, {
      method: "DELETE"
    });
    if (!resposta) return;

    const retorno = await admLerJson(resposta);
    admEl("admDialogoExcluirCategoria").close();
    if (resposta.ok) {
      criarAlerta(retorno.mensagem || "Categoria excluída.", "alertBom", 3500);
      await Promise.all([admCarregarCategorias(true), admCarregarResumo(true)]);
      if (admEstadoAuditoria.carregado) admCarregarAuditoria(true);
    } else {
      criarAlerta(retorno.mensagem || "Não foi possível excluir a categoria.", "alertRuim", 5000);
    }
  } catch (erro) {
    console.error("Erro ao excluir categoria:", erro);
    admEl("admDialogoExcluirCategoria").close();
    criarAlerta("Erro de conexão com o servidor.", "alertRuim", 5000);
  } finally {
    botao.disabled = false;
    botao.textContent = "Excluir";
  }
}

/* ==========================================
   USUÁRIOS
   ========================================== */
function admRenderUsuarios() {
  const alvo = admEl("admTabelaUsuarios");
  const lista = admEstadoUsuarios.itens;

  if (lista.length === 0) {
    alvo.innerHTML = '<p class="adm-status">Nenhum usuário encontrado para esse filtro.</p>';
    admEl("admPaginacaoUsuarios").innerHTML = "";
    return;
  }

  const linhas = lista.map((u) => {
    const id = Number(u.id);
    const ehProprio = admAdminAtual && Number(admAdminAtual.id) === id;
    const nome = escaparHtml(u.nome);
    const email = escaparHtml(u.email);
    const avatar = escaparHtml(u.foto_url || "/imagens/IUsuario.png");

    const metodoLogin = u.tem_google && u.tem_senha
      ? "E-mail + Google"
      : u.tem_google
        ? "Google"
        : "E-mail";

    let badgeStatus = '<span class="adm-badge adm-badge-ativo">Ativo</span>';
    if (u.bloqueado) {
      const dicaMotivo = u.motivo_bloqueio ? ` title="${escaparHtml(u.motivo_bloqueio)}"` : "";
      badgeStatus = `<span class="adm-badge adm-badge-bloqueado"${dicaMotivo}>Bloqueado</span>`;
    } else if (!u.email_verificado) {
      badgeStatus = '<span class="adm-badge adm-badge-pendente">Pendente</span>';
    }

    const badgeCargo = u.eh_admin
      ? '<span class="adm-badge adm-badge-admin">Admin</span>'
      : '<span class="adm-badge">Usuário</span>';

    const desabilitarPromover = ehProprio || (!u.eh_admin && (u.bloqueado || !u.email_verificado));
    const motivoDesabPromover = ehProprio
      ? "Você não pode alterar seu próprio cargo"
      : u.bloqueado
        ? "Desbloqueie o usuário antes de promovê-lo"
        : !u.email_verificado
          ? "Apenas contas com e-mail verificado podem virar admin"
          : "";

    const motivoBloqHtml = u.bloqueado && u.motivo_bloqueio
      ? `<span class="adm-subtexto">Motivo: ${escaparHtml(u.motivo_bloqueio)}</span>`
      : "";

    return `
      <tr>
        <td data-label="Usuário">
          <div class="adm-celula-usuario">
            <img class="adm-avatar-tabela" src="${avatar}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/imagens/IUsuario.png'">
            <div class="adm-usuario-meta">
              <span class="adm-usuario-nome">
                ${nome}
                ${ehProprio ? '<span class="adm-badge adm-badge-voce">Você</span>' : ""}
              </span>
              <span class="adm-subtexto">${email}</span>
              ${motivoBloqHtml}
            </div>
          </div>
        </td>
        <td data-label="Login">${escaparHtml(metodoLogin)}</td>
        <td data-label="Status">${badgeStatus}</td>
        <td data-label="Cargo">${badgeCargo}</td>
        <td data-label="Avaliações">${Number(u.total_avaliacoes) || 0}</td>
        <td data-label="Cadastro">${escaparHtml(admFormatarData(u.criado_em))}</td>
        <td class="adm-linha-acoes">
          <div class="adm-acoes-grupo">
            <button type="button" class="adm-btn adm-btn-pequeno ${u.eh_admin ? "adm-btn-aviso" : "adm-btn-principal"}"
              data-usr-acao="admin" data-id="${id}"
              ${desabilitarPromover ? `disabled title="${escaparHtml(motivoDesabPromover)}"` : ""}>
              ${u.eh_admin ? "Remover admin" : "Tornar admin"}
            </button>
            <button type="button" class="adm-btn adm-btn-pequeno ${u.bloqueado ? "" : "adm-btn-aviso"}"
              data-usr-acao="bloqueio" data-id="${id}"
              ${ehProprio ? 'disabled title="Você não pode bloquear sua própria conta"' : ""}>
              ${u.bloqueado ? "Desbloquear" : "Bloquear"}
            </button>
            <button type="button" class="adm-btn adm-btn-pequeno adm-btn-perigo"
              data-usr-acao="excluir" data-id="${id}"
              ${ehProprio ? 'disabled title="Você não pode excluir sua própria conta aqui"' : ""}>
              Excluir
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");

  alvo.innerHTML = `
    <div class="adm-tabela-wrap">
      <table>
        <caption class="adm-so-leitor">Usuários cadastrados</caption>
        <thead>
          <tr>
            ${admThOrdenavel("nome", "Usuário", admEstadoUsuarios)}
            <th scope="col">Login</th>
            ${admThOrdenavel("bloqueado", "Status", admEstadoUsuarios)}
            ${admThOrdenavel("eh_admin", "Cargo", admEstadoUsuarios)}
            ${admThOrdenavel("total_avaliacoes", "Avaliações", admEstadoUsuarios)}
            ${admThOrdenavel("criado_em", "Cadastro", admEstadoUsuarios)}
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;

  alvo.querySelectorAll("button[data-ordem]").forEach((btn) => {
    btn.addEventListener("click", () => {
      admAlternarOrdem(admEstadoUsuarios, btn.dataset.ordem);
      admCarregarUsuarios();
    });
  });

  admRenderPaginacao(
    "admPaginacaoUsuarios",
    admEstadoUsuarios,
    (novaPagina) => {
      admEstadoUsuarios.pagina = novaPagina;
      admCarregarUsuarios();
    },
    (novoLimite) => {
      admEstadoUsuarios.limite = novoLimite;
      admEstadoUsuarios.pagina = 1;
      admCarregarUsuarios();
    }
  );
}

async function admCarregarUsuarios(silencioso = false) {
  if (!silencioso) {
    admEl("admTabelaUsuarios").innerHTML = '<p class="adm-status" role="status">Carregando…</p>';
  }

  const params = new URLSearchParams({
    busca: admEl("admBuscaUsuarios").value.trim(),
    cargo: admEl("admFiltroCargo").value,
    status: admEl("admFiltroStatus").value,
    ordenar: admEstadoUsuarios.ordenar,
    direcao: admEstadoUsuarios.direcao,
    pagina: String(admEstadoUsuarios.pagina),
    limite: String(admEstadoUsuarios.limite)
  });

  try {
    const resposta = await admFetch(`/admin/usuarios?${params.toString()}`);
    if (!resposta) return;
    if (!resposta.ok) throw new Error(`Status ${resposta.status}`);

    const dados = await resposta.json();
    admEstadoUsuarios.itens = Array.isArray(dados.itens) ? dados.itens : [];
    admEstadoUsuarios.total = Number(dados.total || 0);
    admEstadoUsuarios.pagina = Number(dados.pagina || 1);
    admEstadoUsuarios.limite = Number(dados.limite || 10);
    admEstadoUsuarios.totalPaginas = Number(dados.totalPaginas || 1);
    admEstadoUsuarios.carregado = true;

    admEl("admContagemUsuarios").textContent = `${admEstadoUsuarios.total} usuário(s) encontrado(s)`;
    admRenderUsuarios();
  } catch (erro) {
    console.error("Erro ao carregar usuários:", erro);
    if (!silencioso) {
      admEl("admTabelaUsuarios").innerHTML = '<p class="adm-status">Não foi possível carregar os usuários.</p>';
    }
    criarAlerta("Erro ao carregar a lista de usuários.", "alertRuim", 5000);
  }
}

function admAbrirModalAdminUsuario(u) {
  admAlvoUsuarioAdmin = u;
  const promover = !u.eh_admin;
  admEl("admTituloAdminUsuario").textContent = promover
    ? "Promover usuário a administrador?"
    : "Remover permissão de administrador?";
  admEl("admDescAdminUsuario").textContent = promover
    ? `${u.nome} (${u.email}) passará a ter acesso total ao painel administrativo.`
    : `${u.nome} (${u.email}) perderá acesso ao painel administrativo e terá suas sessões atuais encerradas.`;

  admConfigurarCampoReauth(admEl("admLabelReauthAdmin"), admEl("admInputReauthAdmin"));
  admEl("admErroAdminUsuario").hidden = true;
  admEl("admDialogoAdminUsuario").showModal();
}

async function admEnviarAdminUsuario(evento) {
  evento.preventDefault();
  if (!admAlvoUsuarioAdmin) return;

  const caixaErro = admEl("admErroAdminUsuario");
  const inputReauth = admEl("admInputReauthAdmin");
  if (!inputReauth.value.trim()) {
    caixaErro.textContent = "Preencha o campo de confirmação.";
    caixaErro.hidden = false;
    return;
  }
  caixaErro.hidden = true;

  const botao = admEl("admConfirmarAdminUsuario");
  botao.disabled = true;
  botao.textContent = "Processando…";

  try {
    const corpo = {
      eh_admin: !admAlvoUsuarioAdmin.eh_admin,
      ...admLerCorpoReauth(inputReauth)
    };
    const resposta = await admFetch(`/admin/usuarios/${encodeURIComponent(admAlvoUsuarioAdmin.id)}/admin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo)
    });
    if (!resposta) return;

    const retorno = await admLerJson(resposta);
    if (resposta.ok) {
      admEl("admDialogoAdminUsuario").close();
      criarAlerta(retorno.mensagem || "Permissão atualizada.", "alertBom", 3500);
      await Promise.all([admCarregarUsuarios(true), admCarregarResumo(true)]);
      if (admEstadoAuditoria.carregado) admCarregarAuditoria(true);
    } else {
      caixaErro.textContent = retorno.mensagem || "Não foi possível alterar o cargo.";
      caixaErro.hidden = false;
    }
  } catch (erro) {
    console.error("Erro ao alterar cargo do usuário:", erro);
    caixaErro.textContent = "Erro de conexão com o servidor.";
    caixaErro.hidden = false;
  } finally {
    botao.disabled = false;
    botao.textContent = "Confirmar";
  }
}

function admAbrirModalBloqueioUsuario(u) {
  admAlvoUsuarioBloqueio = u;
  const bloquear = !u.bloqueado;
  admEl("admTituloBloqueioUsuario").textContent = bloquear ? "Bloquear usuário?" : "Desbloquear usuário?";
  admEl("admDescBloqueioUsuario").textContent = bloquear
    ? `${u.nome} (${u.email}) será desconectado imediatamente e não poderá entrar nem avaliar locais.`
    : `${u.nome} (${u.email}) poderá voltar a acessar a conta normalmente.`;
  admEl("admCampoMotivoBloqueio").hidden = !bloquear;
  admEl("admInputMotivoBloqueio").value = "";
  admEl("admErroBloqueioUsuario").hidden = true;
  admEl("admDialogoBloqueioUsuario").showModal();
}

async function admEnviarBloqueioUsuario(evento) {
  evento.preventDefault();
  if (!admAlvoUsuarioBloqueio) return;

  const caixaErro = admEl("admErroBloqueioUsuario");
  caixaErro.hidden = true;

  const bloquear = !admAlvoUsuarioBloqueio.bloqueado;
  const motivo = admEl("admInputMotivoBloqueio").value.trim();

  const botao = admEl("admConfirmarBloqueioUsuario");
  botao.disabled = true;
  botao.textContent = "Salvando…";

  try {
    const corpo = bloquear ? { bloqueado: true, motivo: motivo || null } : { bloqueado: false };
    const resposta = await admFetch(`/admin/usuarios/${encodeURIComponent(admAlvoUsuarioBloqueio.id)}/bloqueio`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo)
    });
    if (!resposta) return;

    const retorno = await admLerJson(resposta);
    if (resposta.ok) {
      admEl("admDialogoBloqueioUsuario").close();
      criarAlerta(retorno.mensagem || "Status atualizado.", "alertBom", 3500);
      await Promise.all([admCarregarUsuarios(true), admCarregarResumo(true)]);
      if (admEstadoAvaliacoes.carregado) admCarregarAvaliacoes(true);
      if (admEstadoAuditoria.carregado) admCarregarAuditoria(true);
    } else {
      caixaErro.textContent = retorno.mensagem || "Não foi possível alterar o bloqueio.";
      caixaErro.hidden = false;
    }
  } catch (erro) {
    console.error("Erro ao bloquear/desbloquear usuário:", erro);
    caixaErro.textContent = "Erro de conexão com o servidor.";
    caixaErro.hidden = false;
  } finally {
    botao.disabled = false;
    botao.textContent = "Confirmar";
  }
}

function admAbrirModalExcluirUsuario(u) {
  admAlvoUsuarioExcluir = u;
  admEl("admDescExcluirUsuario").textContent =
    `Você vai excluir definitivamente ${u.nome} (${u.email}), incluindo todas as avaliações, favoritos e foto de perfil. Esta ação não pode ser desfeita.`;
  admEl("admConfirmacaoTextoUsuario").value = "";
  admConfigurarCampoReauth(admEl("admLabelReauthExcluir"), admEl("admInputReauthExcluir"));
  admEl("admErroExcluirUsuario").hidden = true;
  admEl("admDialogoExcluirUsuario").showModal();
}

async function admEnviarExcluirUsuario(evento) {
  evento.preventDefault();
  if (!admAlvoUsuarioExcluir) return;

  const caixaErro = admEl("admErroExcluirUsuario");
  const confirmacao = admEl("admConfirmacaoTextoUsuario").value.trim();
  const inputReauth = admEl("admInputReauthExcluir");

  if (confirmacao !== "EXCLUIR") {
    caixaErro.textContent = "Digite EXCLUIR exatamente em maiúsculas para confirmar.";
    caixaErro.hidden = false;
    return;
  }
  if (!inputReauth.value.trim()) {
    caixaErro.textContent = "Preencha a confirmação de administrador.";
    caixaErro.hidden = false;
    return;
  }
  caixaErro.hidden = true;

  const botao = admEl("admConfirmarExcluirUsuario");
  botao.disabled = true;
  botao.textContent = "Excluindo…";

  try {
    const corpo = {
      confirmacao,
      ...admLerCorpoReauth(inputReauth)
    };
    const resposta = await admFetch(`/admin/usuarios/${encodeURIComponent(admAlvoUsuarioExcluir.id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo)
    });
    if (!resposta) return;

    const retorno = await admLerJson(resposta);
    if (resposta.ok) {
      admEl("admDialogoExcluirUsuario").close();
      criarAlerta(retorno.mensagem || "Usuário excluído.", "alertBom", 3500);
      await Promise.all([
        admCarregarUsuarios(true),
        admCarregarResumo(true),
        admCarregarPontos(true)
      ]);
      if (admEstadoAvaliacoes.carregado) admCarregarAvaliacoes(true);
      if (admEstadoAuditoria.carregado) admCarregarAuditoria(true);
    } else {
      caixaErro.textContent = retorno.mensagem || "Não foi possível excluir o usuário.";
      caixaErro.hidden = false;
    }
  } catch (erro) {
    console.error("Erro ao excluir usuário:", erro);
    caixaErro.textContent = "Erro de conexão com o servidor.";
    caixaErro.hidden = false;
  } finally {
    botao.disabled = false;
    botao.textContent = "Excluir definitivamente";
  }
}

/* ==========================================
   AVALIAÇÕES (MODERAÇÃO)
   ========================================== */
function admRenderAvaliacoes() {
  const alvo = admEl("admTabelaAvaliacoes");
  const lista = admEstadoAvaliacoes.itens;

  if (lista.length === 0) {
    alvo.innerHTML = '<p class="adm-status">Nenhuma avaliação encontrada para esse filtro.</p>';
    admEl("admPaginacaoAvaliacoes").innerHTML = "";
    return;
  }

  const linhas = lista.map((av) => {
    const id = Number(av.id);
    const nota = Math.max(1, Math.min(5, Number(av.nota) || 1));
    const estrelas = "★".repeat(nota) + "☆".repeat(5 - nota);
    const tags = av.tags ? escaparHtml(av.tags) : '<span class="adm-subtexto">Sem tags</span>';
    return `
      <tr>
        <td data-label="Ponto">
          <a class="adm-link-ponto" href="../servicos/avalia.html?id=${encodeURIComponent(av.id_ponto)}" target="_blank" rel="noopener noreferrer">${escaparHtml(av.ponto_nome)}</a>
        </td>
        <td data-label="Categoria">${escaparHtml(av.categoria_nome)}</td>
        <td data-label="Autor">
          <div class="adm-usuario-meta">
            <span class="adm-usuario-nome">
              ${escaparHtml(av.usuario_nome)}
              ${av.usuario_bloqueado ? '<span class="adm-badge adm-badge-bloqueado">Bloqueado</span>' : ""}
            </span>
            <span class="adm-subtexto">${escaparHtml(av.usuario_email)}</span>
          </div>
        </td>
        <td data-label="Nota"><span aria-label="${nota} de 5 estrelas">${estrelas} (${nota})</span></td>
        <td data-label="Tags">${tags}</td>
        <td class="adm-linha-acoes">
          <div class="adm-acoes-grupo">
            <button type="button" class="adm-btn adm-btn-pequeno adm-btn-perigo" data-av-excluir="${id}">Excluir</button>
          </div>
        </td>
      </tr>`;
  }).join("");

  alvo.innerHTML = `
    <div class="adm-tabela-wrap">
      <table>
        <caption class="adm-so-leitor">Avaliações dos usuários</caption>
        <thead>
          <tr>
            ${admThOrdenavel("ponto_nome", "Ponto", admEstadoAvaliacoes)}
            ${admThOrdenavel("categoria_nome", "Categoria", admEstadoAvaliacoes)}
            ${admThOrdenavel("usuario_nome", "Autor", admEstadoAvaliacoes)}
            ${admThOrdenavel("nota", "Nota", admEstadoAvaliacoes)}
            <th scope="col">Observações / Tags</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;

  alvo.querySelectorAll("button[data-ordem]").forEach((btn) => {
    btn.addEventListener("click", () => {
      admAlternarOrdem(admEstadoAvaliacoes, btn.dataset.ordem);
      admCarregarAvaliacoes();
    });
  });

  admRenderPaginacao(
    "admPaginacaoAvaliacoes",
    admEstadoAvaliacoes,
    (novaPagina) => {
      admEstadoAvaliacoes.pagina = novaPagina;
      admCarregarAvaliacoes();
    },
    (novoLimite) => {
      admEstadoAvaliacoes.limite = novoLimite;
      admEstadoAvaliacoes.pagina = 1;
      admCarregarAvaliacoes();
    }
  );
}

async function admCarregarAvaliacoes(silencioso = false) {
  if (!silencioso) {
    admEl("admTabelaAvaliacoes").innerHTML = '<p class="adm-status" role="status">Carregando…</p>';
  }

  const params = new URLSearchParams({
    busca: admEl("admBuscaAvaliacoes").value.trim(),
    nota: admEl("admFiltroNota").value,
    id_categoria: admEl("admFiltroCategoriaAv").value,
    ordenar: admEstadoAvaliacoes.ordenar,
    direcao: admEstadoAvaliacoes.direcao,
    pagina: String(admEstadoAvaliacoes.pagina),
    limite: String(admEstadoAvaliacoes.limite)
  });

  try {
    const resposta = await admFetch(`/admin/avaliacoes?${params.toString()}`);
    if (!resposta) return;
    if (!resposta.ok) throw new Error(`Status ${resposta.status}`);

    const dados = await resposta.json();
    admEstadoAvaliacoes.itens = Array.isArray(dados.itens) ? dados.itens : [];
    admEstadoAvaliacoes.total = Number(dados.total || 0);
    admEstadoAvaliacoes.pagina = Number(dados.pagina || 1);
    admEstadoAvaliacoes.limite = Number(dados.limite || 10);
    admEstadoAvaliacoes.totalPaginas = Number(dados.totalPaginas || 1);
    admEstadoAvaliacoes.carregado = true;

    admEl("admContagemAvaliacoes").textContent = `${admEstadoAvaliacoes.total} avaliação(ões) encontrada(s)`;
    admRenderAvaliacoes();
  } catch (erro) {
    console.error("Erro ao carregar avaliações:", erro);
    if (!silencioso) {
      admEl("admTabelaAvaliacoes").innerHTML = '<p class="adm-status">Não foi possível carregar as avaliações.</p>';
    }
    criarAlerta("Erro ao carregar as avaliações.", "alertRuim", 5000);
  }
}

function admPedirExclusaoAvaliacao(id) {
  const av = admEstadoAvaliacoes.itens.find((item) => String(item.id) === String(id));
  if (!av) return;
  admIdAvaliacaoExcluir = av.id;
  admEl("admDescExcluirAvaliacao").textContent =
    `Você vai excluir a avaliação de ${av.usuario_nome} (${av.nota}/5) em "${av.ponto_nome}". Esta ação não pode ser desfeita.`;
  admEl("admDialogoExcluirAvaliacao").showModal();
}

async function admConfirmarExclusaoAvaliacao() {
  const botao = admEl("admConfirmarExcluirAvaliacao");
  botao.disabled = true;
  botao.textContent = "Excluindo…";

  try {
    const resposta = await admFetch(`/admin/avaliacoes/${encodeURIComponent(admIdAvaliacaoExcluir)}`, {
      method: "DELETE"
    });
    if (!resposta) return;

    const retorno = await admLerJson(resposta);
    admEl("admDialogoExcluirAvaliacao").close();
    if (resposta.ok) {
      criarAlerta(retorno.mensagem || "Avaliação excluída.", "alertBom", 3500);
      await Promise.all([
        admCarregarAvaliacoes(true),
        admCarregarPontos(true),
        admCarregarResumo(true)
      ]);
      if (admEstadoUsuarios.carregado) admCarregarUsuarios(true);
      if (admEstadoAuditoria.carregado) admCarregarAuditoria(true);
    } else {
      criarAlerta(retorno.mensagem || "Não foi possível excluir a avaliação.", "alertRuim", 5000);
    }
  } catch (erro) {
    console.error("Erro ao excluir avaliação:", erro);
    admEl("admDialogoExcluirAvaliacao").close();
    criarAlerta("Erro de conexão com o servidor.", "alertRuim", 5000);
  } finally {
    botao.disabled = false;
    botao.textContent = "Excluir";
  }
}

/* ==========================================
   AUDITORIA
   ========================================== */
function admRenderAuditoria() {
  const alvo = admEl("admTabelaAuditoria");
  const lista = admEstadoAuditoria.itens;

  if (lista.length === 0) {
    alvo.innerHTML = '<p class="adm-status">Nenhum registro de auditoria encontrado.</p>';
    admEl("admPaginacaoAuditoria").innerHTML = "";
    return;
  }

  const linhas = lista.map((log) => {
    const rotuloAcao = ADM_ROTULOS_ACAO[log.acao] || log.acao;
    const adminTexto = log.admin_nome
      ? `${escaparHtml(log.admin_nome)}<br><span class="adm-subtexto">${escaparHtml(log.admin_email || "")}</span>`
      : "—";
    const alvoTexto = log.alvo_id ? `${escaparHtml(log.alvo_tipo)} #${Number(log.alvo_id)}` : escaparHtml(log.alvo_tipo);

    return `
      <tr>
        <td data-label="Data/Hora">${escaparHtml(admFormatarData(log.criado_em))}</td>
        <td data-label="Administrador">${adminTexto}</td>
        <td data-label="Ação"><span class="adm-badge">${escaparHtml(rotuloAcao)}</span></td>
        <td data-label="Alvo">${alvoTexto}</td>
        <td data-label="Detalhes">${escaparHtml(log.detalhes || "—")}</td>
        <td data-label="IP">${escaparHtml(log.ip || "—")}</td>
      </tr>`;
  }).join("");

  alvo.innerHTML = `
    <div class="adm-tabela-wrap">
      <table>
        <caption class="adm-so-leitor">Logs de auditoria administrativa</caption>
        <thead>
          <tr>
            ${admThOrdenavel("criado_em", "Data/Hora", admEstadoAuditoria)}
            ${admThOrdenavel("admin_nome", "Administrador", admEstadoAuditoria)}
            ${admThOrdenavel("acao", "Ação", admEstadoAuditoria)}
            ${admThOrdenavel("alvo_tipo", "Alvo", admEstadoAuditoria)}
            <th scope="col">Detalhes</th>
            <th scope="col">IP</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;

  alvo.querySelectorAll("button[data-ordem]").forEach((btn) => {
    btn.addEventListener("click", () => {
      admAlternarOrdem(admEstadoAuditoria, btn.dataset.ordem);
      admCarregarAuditoria();
    });
  });

  admRenderPaginacao(
    "admPaginacaoAuditoria",
    admEstadoAuditoria,
    (novaPagina) => {
      admEstadoAuditoria.pagina = novaPagina;
      admCarregarAuditoria();
    },
    (novoLimite) => {
      admEstadoAuditoria.limite = novoLimite;
      admEstadoAuditoria.pagina = 1;
      admCarregarAuditoria();
    }
  );
}

async function admCarregarAuditoria(silencioso = false) {
  if (!silencioso) {
    admEl("admTabelaAuditoria").innerHTML = '<p class="adm-status" role="status">Carregando…</p>';
  }

  const params = new URLSearchParams({
    busca: admEl("admBuscaAuditoria").value.trim(),
    acao: admEl("admFiltroAcao").value,
    alvo_tipo: admEl("admFiltroAlvo").value,
    ordenar: admEstadoAuditoria.ordenar,
    direcao: admEstadoAuditoria.direcao,
    pagina: String(admEstadoAuditoria.pagina),
    limite: String(admEstadoAuditoria.limite)
  });

  try {
    const resposta = await admFetch(`/admin/auditoria?${params.toString()}`);
    if (!resposta) return;
    if (!resposta.ok) throw new Error(`Status ${resposta.status}`);

    const dados = await resposta.json();
    admEstadoAuditoria.itens = Array.isArray(dados.itens) ? dados.itens : [];
    admEstadoAuditoria.total = Number(dados.total || 0);
    admEstadoAuditoria.pagina = Number(dados.pagina || 1);
    admEstadoAuditoria.limite = Number(dados.limite || 10);
    admEstadoAuditoria.totalPaginas = Number(dados.totalPaginas || 1);
    admEstadoAuditoria.carregado = true;

    admEl("admContagemAuditoria").textContent = `${admEstadoAuditoria.total} registro(s) encontrado(s)`;
    admRenderAuditoria();
  } catch (erro) {
    console.error("Erro ao carregar auditoria:", erro);
    if (!silencioso) {
      admEl("admTabelaAuditoria").innerHTML = '<p class="adm-status">Não foi possível carregar os logs de auditoria.</p>';
    }
    criarAlerta("Erro ao carregar os logs de auditoria.", "alertRuim", 5000);
  }
}

/* ==========================================
   MODAL DE PONTOS (CRIAR / EDITAR / EXCLUIR)
   ========================================== */
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
      await Promise.all([admCarregarPontos(true), admCarregarCategorias(true), admCarregarResumo(true)]);
      if (admEstadoAuditoria.carregado) admCarregarAuditoria(true);
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
      await Promise.all([admCarregarPontos(true), admCarregarCategorias(true), admCarregarResumo(true)]);
      if (admEstadoAvaliacoes.carregado) admCarregarAvaliacoes(true);
      if (admEstadoAuditoria.carregado) admCarregarAuditoria(true);
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

/* ==========================================
   EVENTOS E INICIALIZAÇÃO
   ========================================== */
function admLigarEventos() {
  document.querySelectorAll(".adm-nav button").forEach((botao) => {
    botao.addEventListener("click", () => admMostrarSecao(botao.dataset.secao));
  });

  // Pontos
  admEl("admNovo").addEventListener("click", () => admAbrirForm());
  admEl("admBusca").addEventListener("input", () => admFiltrar(true));
  admEl("admFiltroCategoria").addEventListener("change", () => admFiltrar(true));
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

  // Categorias
  admEl("admNovaCategoria").addEventListener("click", () => admAbrirFormCategoria());
  admEl("admBuscaCategorias").addEventListener("input", () => admFiltrarCategorias(true));
  admEl("admTabelaCategorias").addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-cat-acao]");
    if (!botao) return;
    if (botao.dataset.catAcao === "editar") {
      const cat = admCategorias.find((c) => String(c.id) === botao.dataset.id);
      if (cat) admAbrirFormCategoria(cat);
    } else {
      admPedirExclusaoCategoria(botao.dataset.id);
    }
  });
  admEl("admFormCategoria").addEventListener("submit", admEnviarFormCategoria);
  admEl("admCancelarCategoria").addEventListener("click", () => admEl("admDialogoCategoria").close());
  admEl("admCancelarExcluirCategoria").addEventListener("click", () => admEl("admDialogoExcluirCategoria").close());
  admEl("admConfirmarExcluirCategoria").addEventListener("click", admConfirmarExclusaoCategoria);

  // Usuários
  const recarregarUsuariosBusca = admDebounce(() => {
    admEstadoUsuarios.pagina = 1;
    admCarregarUsuarios();
  }, 300);
  admEl("admBuscaUsuarios").addEventListener("input", recarregarUsuariosBusca);
  admEl("admFiltroCargo").addEventListener("change", () => {
    admEstadoUsuarios.pagina = 1;
    admCarregarUsuarios();
  });
  admEl("admFiltroStatus").addEventListener("change", () => {
    admEstadoUsuarios.pagina = 1;
    admCarregarUsuarios();
  });
  admEl("admTabelaUsuarios").addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-usr-acao]");
    if (!botao) return;
    const usuario = admEstadoUsuarios.itens.find((u) => String(u.id) === botao.dataset.id);
    if (!usuario) return;

    if (botao.dataset.usrAcao === "admin") admAbrirModalAdminUsuario(usuario);
    else if (botao.dataset.usrAcao === "bloqueio") admAbrirModalBloqueioUsuario(usuario);
    else if (botao.dataset.usrAcao === "excluir") admAbrirModalExcluirUsuario(usuario);
  });
  admEl("admFormAdminUsuario").addEventListener("submit", admEnviarAdminUsuario);
  admEl("admCancelarAdminUsuario").addEventListener("click", () => admEl("admDialogoAdminUsuario").close());
  admEl("admFormBloqueioUsuario").addEventListener("submit", admEnviarBloqueioUsuario);
  admEl("admCancelarBloqueioUsuario").addEventListener("click", () => admEl("admDialogoBloqueioUsuario").close());
  admEl("admFormExcluirUsuario").addEventListener("submit", admEnviarExcluirUsuario);
  admEl("admCancelarExcluirUsuario").addEventListener("click", () => admEl("admDialogoExcluirUsuario").close());

  // Avaliações
  const recarregarAvaliacoesBusca = admDebounce(() => {
    admEstadoAvaliacoes.pagina = 1;
    admCarregarAvaliacoes();
  }, 300);
  admEl("admBuscaAvaliacoes").addEventListener("input", recarregarAvaliacoesBusca);
  admEl("admFiltroNota").addEventListener("change", () => {
    admEstadoAvaliacoes.pagina = 1;
    admCarregarAvaliacoes();
  });
  admEl("admFiltroCategoriaAv").addEventListener("change", () => {
    admEstadoAvaliacoes.pagina = 1;
    admCarregarAvaliacoes();
  });
  admEl("admTabelaAvaliacoes").addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-av-excluir]");
    if (botao) admPedirExclusaoAvaliacao(botao.dataset.avExcluir);
  });
  admEl("admCancelarExcluirAvaliacao").addEventListener("click", () => admEl("admDialogoExcluirAvaliacao").close());
  admEl("admConfirmarExcluirAvaliacao").addEventListener("click", admConfirmarExclusaoAvaliacao);

  // Auditoria
  const recarregarAuditoriaBusca = admDebounce(() => {
    admEstadoAuditoria.pagina = 1;
    admCarregarAuditoria();
  }, 300);
  admEl("admBuscaAuditoria").addEventListener("input", recarregarAuditoriaBusca);
  admEl("admFiltroAcao").addEventListener("change", () => {
    admEstadoAuditoria.pagina = 1;
    admCarregarAuditoria();
  });
  admEl("admFiltroAlvo").addEventListener("change", () => {
    admEstadoAuditoria.pagina = 1;
    admCarregarAuditoria();
  });
}

(async function admIniciar() {
  const permitido = await admVerificarAdmin();
  if (!permitido) return;

  admVerificando.hidden = true;
  admPainel.hidden = false;

  admLigarEventos();
  admCarregarResumo();
  admCarregarCategorias();
  admCarregarPontos();
})();
