
const Favoritos = (() => {
  let ids = new Set();
  let lista = [];
  let carregando = null;
  const emAndamento = new Set();

  const ICONE = `
    <svg class="fav-icone" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
    </svg>`;

  function obterToken() {
    return localStorage.getItem('token');
  }

  function estaLogado() {
    return Boolean(obterToken() && localStorage.getItem('usuario'));
  }

  function escapar(texto) {
    return typeof escaparHtml === 'function' ? escaparHtml(texto) : String(texto ?? '');
  }

  function avisar(mensagem, tipo, tempo) {
    if (typeof criarAlerta === 'function') criarAlerta(mensagem, tipo, tempo);
  }

  function sessaoExpirada() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    ids = new Set();
    lista = [];
    atualizarBotoes();
    avisar('Sua sessão expirou. Faça login novamente para salvar locais.', 'alertRuim', 5000);
    setTimeout(() => {
      window.location.href = '/login/login.html';
    }, 2500);
  }

  function rotulo(salvo) {
    return salvo ? 'Remover dos favoritos' : 'Salvar nos favoritos';
  }

  // Busca no banco os favoritos do usuário logado.
  async function carregar(forcar = false) {
    if (!estaLogado()) {
      ids = new Set();
      lista = [];
      atualizarBotoes();
      return lista;
    }
    if (carregando && !forcar) return carregando;

    carregando = (async () => {
      try {
        const resposta = await fetch(`${API_URL}/usuario/favoritos`, {
          headers: { Authorization: `Bearer ${obterToken()}` }
        });
        if (resposta.status === 401) {
          ids = new Set();
          lista = [];
          return lista;
        }
        if (resposta.status === 403) {
          const dadosErro = await resposta.json().catch(() => ({}));
          if (dadosErro.codigo === 'CONTA_BLOQUEADA') {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            ids = new Set();
            lista = [];
            avisar(dadosErro.mensagem || 'Sua conta está bloqueada pelo administrador.', 'alertRuim', 5000);
            return lista;
          }
        }
        if (!resposta.ok) throw new Error('Falha ao carregar favoritos');

        const dados = await resposta.json();
        lista = Array.isArray(dados.favoritos) ? dados.favoritos : [];
        ids = new Set(lista.map((item) => Number(item.id)));
        return lista;
      } finally {
        carregando = null;
        atualizarBotoes();
      }
    })();

    return carregando;
  }

  function estaSalvo(idPonto) {
    return ids.has(Number(idPonto));
  }

  function obterLista() {
    return [...lista];
  }

  function total() {
    return ids.size;
  }

  // variante: 'icone' (botão redondo sobre a imagem) ou 'texto' (botão com rótulo)
  function botaoHtml(idPonto, nomePonto = '', variante = 'icone') {
    const id = Number(idPonto);
    const salvo = estaSalvo(id);
    const classes = ['btn-fav', variante === 'texto' ? 'btn-fav-texto' : 'btn-fav-flutuante'];
    if (salvo) classes.push('salvo');

    const conteudo = variante === 'texto'
      ? `${ICONE}<span class="fav-label-off">Salvar nos favoritos</span><span class="fav-label-on">Salvo nos favoritos</span>`
      : ICONE;

    return `
      <button type="button" class="${classes.join(' ')}"
        data-favorito-id="${id}"
        data-favorito-nome="${escapar(nomePonto)}"
        aria-pressed="${salvo}"
        aria-label="${rotulo(salvo)}"
        title="${rotulo(salvo)}">${conteudo}</button>`;
  }

  // Sincroniza o visual de todos os botões de favorito da página.
  function atualizarBotoes(raiz = document) {
    raiz.querySelectorAll('[data-favorito-id]').forEach((botao) => {
      const salvo = estaSalvo(botao.dataset.favoritoId);
      botao.classList.toggle('salvo', salvo);
      botao.setAttribute('aria-pressed', String(salvo));
      botao.setAttribute('aria-label', rotulo(salvo));
      botao.setAttribute('title', rotulo(salvo));
    });
  }

  function definirCarregando(idPonto, ativo) {
    document.querySelectorAll(`[data-favorito-id="${Number(idPonto)}"]`).forEach((botao) => {
      botao.disabled = ativo;
    });
  }

  async function alternar(idPonto) {
    const id = Number(idPonto);
    if (!Number.isInteger(id) || id <= 0) return null;

    if (!estaLogado()) {
      avisar('Faça login para salvar locais nos seus favoritos.', 'alertRuim', 4000);
      return null;
    }
    if (emAndamento.has(id)) return null;

    const salvoAntes = estaSalvo(id);
    emAndamento.add(id);
    definirCarregando(id, true);

    try {
      const resposta = await fetch(`${API_URL}/usuario/favoritos/${id}`, {
        method: salvoAntes ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${obterToken()}` }
      });

      if (resposta.status === 401) {
        sessaoExpirada();
        return null;
      }

      const dados = await resposta.json().catch(() => ({}));
      if (resposta.status === 403 && dados.codigo === 'CONTA_BLOQUEADA') {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        ids = new Set();
        lista = [];
        atualizarBotoes();
        avisar(dados.mensagem || 'Sua conta está bloqueada pelo administrador.', 'alertRuim', 5000);
        setTimeout(() => {
          window.location.href = '/login/login.html';
        }, 2500);
        return null;
      }
      if (!resposta.ok) {
        avisar(dados.mensagem || 'Não foi possível atualizar seus favoritos.', 'alertRuim', 4000);
        return null;
      }

      if (salvoAntes) {
        ids.delete(id);
        lista = lista.filter((item) => Number(item.id) !== id);
        avisar('Local removido dos favoritos.', 'alertBom', 2500);
      } else {
        ids.add(id);
        avisar('Local salvo nos favoritos!', 'alertBom', 2500);
      }

      atualizarBotoes();
      document.dispatchEvent(new CustomEvent('favoritos:alterado', {
        detail: { id, salvo: !salvoAntes }
      }));
      return !salvoAntes;
    } catch (erro) {
      console.error('Erro ao atualizar favorito:', erro);
      avisar('Erro de conexão com o servidor.', 'alertRuim', 4000);
      return null;
    } finally {
      emAndamento.delete(id);
      definirCarregando(id, false);
    }
  }

  // Um único listener cuida de todos os botões, inclusive os criados depois.
  document.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-favorito-id]');
    if (!botao) return;
    evento.preventDefault();
    evento.stopPropagation();
    alternar(botao.dataset.favoritoId);
  });

  carregar().catch((erro) => console.error('Erro ao carregar favoritos:', erro));

  return { carregar, estaSalvo, obterLista, total, botaoHtml, atualizarBotoes, alternar, estaLogado };
})();
