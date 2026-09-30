const admToken = localStorage.getItem("token");
const admVerificando = document.getElementById("admVerificando");
const admPainel = document.getElementById("admPainel");
let admPontos = [];

function admSair(destino, mensagem, limparSessao = false) {
  if (limparSessao) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
  }
  criarAlerta(mensagem, "alertRuim", 4000);
  setTimeout(() => window.location.replace(destino), 2500);
}

function admMostrarErroVerificacao(texto) {
  admVerificando.textContent = texto;
}

async function admVerificarAdmin() {
  if (!admToken) {
    admSair("../login/login.html", "Faça login para acessar o painel.");
    return false;
  }

  try {
    const resposta = await fetch(`${API_URL}/admin/verificar`, {
      headers: { "Authorization": `Bearer ${admToken}` }
    });

    if (resposta.ok) return true;

    if (resposta.status === 401) {
      admSair("../login/login.html", "Sua sessão expirou. Faça login novamente.", true);
    } else if (resposta.status === 403) {
      admSair("../index.html", "Você não tem permissão para acessar esta área.");
    } else {
      admMostrarErroVerificacao("Não foi possível verificar suas permissões agora. Recarregue a página em instantes.");
    }
  } catch (erro) {
    console.error("Erro ao verificar permissão de administrador:", erro);
    admMostrarErroVerificacao("Erro de conexão com o servidor. Recarregue a página em instantes.");
  }
  return false;
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

function admUrlImagem(ponto) {
  if (!ponto.imagem) return "/imagens/placeholder.png";
  return /^https?:\/\//.test(ponto.imagem) ? ponto.imagem : `/imagens/pontos/${ponto.imagem}`;
}

function admRenderResumo() {
  const categorias = new Set(admPontos.map((p) => p.categoria_nome));
  const avaliacoes = admPontos.reduce((total, p) => total + (Number(p.total_avaliacoes) || 0), 0);
  const itens = [
    ["Pontos cadastrados", admPontos.length],
    ["Categorias em uso", categorias.size],
    ["Avaliações recebidas", avaliacoes]
  ];

  document.getElementById("admResumo").innerHTML = itens
    .map(([rotulo, valor]) => `<div class="adm-card"><strong>${valor}</strong><span>${rotulo}</span></div>`)
    .join("");
}

function admRenderTabela() {
  const alvo = document.getElementById("admTabela");

  if (admPontos.length === 0) {
    alvo.innerHTML = '<p class="adm-status">Nenhum ponto cadastrado ainda.</p>';
    return;
  }

  const linhas = admPontos.map((p) => `
    <tr>
      <td>${escaparHtml(p.nome)}</td>
      <td>${escaparHtml(p.categoria_nome)}</td>
      <td>${escaparHtml(p.endereco)}</td>
      <td>${(Number(p.media_nota) || 0).toFixed(1)} (${Number(p.total_avaliacoes) || 0})</td>
    </tr>`).join("");

  alvo.innerHTML = `
    <div class="adm-tabela-wrap">
      <table>
        <caption class="adm-so-leitor">Pontos cadastrados</caption>
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Categoria</th>
            <th scope="col">Endereço</th>
            <th scope="col">Nota (avaliações)</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
}

function admRenderImagens() {
  const alvo = document.getElementById("admImagens");

  if (admPontos.length === 0) {
    alvo.innerHTML = '<p class="adm-status">Nenhuma imagem para mostrar.</p>';
    return;
  }

  alvo.innerHTML = admPontos.map((p) => `
    <figure class="adm-foto">
      <img src="${escaparHtml(admUrlImagem(p))}" alt="${escaparHtml(p.nome)}" loading="lazy">
      <figcaption>${escaparHtml(p.nome)}</figcaption>
    </figure>`).join("");
}

async function admCarregarPontos() {
  const ids = ["admResumo", "admTabela", "admImagens"];
  ids.forEach((id) => {
    document.getElementById(id).innerHTML = '<p class="adm-status" role="status">Carregando…</p>';
  });

  try {
    const resposta = await fetch(`${API_URL}/pontos`);
    if (!resposta.ok) throw new Error(`Status ${resposta.status}`);
    admPontos = await resposta.json();

    admRenderResumo();
    admRenderTabela();
    admRenderImagens();
  } catch (erro) {
    console.error("Erro ao carregar os pontos no painel:", erro);
    ids.forEach((id) => {
      document.getElementById(id).innerHTML = '<p class="adm-status">Não foi possível carregar os dados. Recarregue a página.</p>';
    });
    criarAlerta("Erro ao carregar os pontos.", "alertRuim", 5000);
  }
}

(async function admIniciar() {
  const permitido = await admVerificarAdmin();
  if (!permitido) return;

  admVerificando.hidden = true;
  admPainel.hidden = false;

  document.querySelectorAll(".adm-nav button").forEach((botao) => {
    botao.addEventListener("click", () => admMostrarSecao(botao.dataset.secao));
  });

  admCarregarPontos();
})();
