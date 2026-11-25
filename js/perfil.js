const usuarioSalvo = localStorage.getItem('usuario');
const token = localStorage.getItem('token');

if (!token || !usuarioSalvo) {
  window.location.replace('../login/login.html');
  throw new Error('Usuário não autenticado.');
}

let usuario;
try {
  usuario = JSON.parse(usuarioSalvo);
} catch {
  localStorage.removeItem('usuario');
  localStorage.removeItem('token');
  window.location.replace('../login/login.html');
  throw new Error('Sessão inválida.');
}

if (!usuario || !usuario.id) {
  localStorage.removeItem('usuario');
  localStorage.removeItem('token');
  window.location.replace('../login/login.html');
  throw new Error('Dados de usuário inválidos.');
}

// Limpa chaves legadas que não são mais armazenadas localmente.
localStorage.removeItem(`favoritos_${usuario.id}`);
localStorage.removeItem(`atividade_${usuario.id}`);
localStorage.removeItem(`perfil_extras_${usuario.id}`);

const FOTO_PADRAO = '/imagens/IUsuario.png';
const FOTO_FALLBACK_LOCAL = '/imagens/placeholder.png';
const FOTO_TAM_MAX = 5 * 1024 * 1024;
const FOTO_TIPOS = ['image/jpeg', 'image/png', 'image/webp'];

let pontosGuia = [];
let minhasAvaliacoes = [];
let avaliacaoEmEdicao = null;
let notaSelecionadaEdicao = 0;

function textoSeguro(valor) {
  return typeof escaparHtml === 'function' ? escaparHtml(valor) : String(valor ?? '');
}

function notificar(mensagem, tipo = 'alertBom', tempo = 3500) {
  if (typeof criarAlerta === 'function') {
    criarAlerta(mensagem, tipo, tempo);
  }
}

function imagemPontoSegura(imagem) {
  if (typeof urlImagemPonto === 'function') {
    return urlImagemPonto(imagem);
  }
  return imagem || FOTO_FALLBACK_LOCAL;
}

function aplicarFallbackImagens(container) {
  if (!container) return;
  container.querySelectorAll('img[data-fallback]').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        const fallback = img.dataset.fallback || FOTO_FALLBACK_LOCAL;
        if (!img.src.endsWith(fallback)) {
          img.src = fallback;
        }
      },
      { once: true }
    );
  });
}

function ehUsuarioGoogle() {
  return Boolean(usuario.isGoogle || (usuario.tem_google && usuario.tem_senha === false));
}

function contaSemSenha() {
  return usuario.tem_senha === false;
}

function limparSessaoLocal() {
  localStorage.removeItem('usuario');
  localStorage.removeItem('token');
  localStorage.removeItem('nomeUsuario');
  localStorage.removeItem('emailUsuario');
  localStorage.removeItem('fotoUsuario');
}

function sessaoExpirou() {
  limparSessaoLocal();
  notificar('Sua sessão expirou. Faça login novamente.', 'alertRuim', 5000);
  setTimeout(() => {
    window.location.replace('../login/login.html');
  }, 2200);
}

let redirecionandoBloqueio = false;
function contaBloqueada(mensagem) {
  if (redirecionandoBloqueio) return;
  redirecionandoBloqueio = true;
  limparSessaoLocal();
  notificar(mensagem || 'Sua conta foi bloqueada pelo administrador.', 'alertRuim', 5000);
  setTimeout(() => {
    window.location.replace('../login/login.html');
  }, 2200);
}

async function tratarRespostaBloqueada(resposta, dadosPreLidos = null) {
  if (resposta.status !== 403) return false;
  const dados = dadosPreLidos || await resposta.clone().json().catch(() => ({}));
  if (dados?.codigo === 'CONTA_BLOQUEADA') {
    contaBloqueada(dados.mensagem);
    return true;
  }
  return false;
}

/* ==========================================
   SIDEBAR E CONFIGURAÇÕES
   ========================================== */
function preencherSidebarEConfig() {
  const isGoogle = ehUsuarioGoogle();
  const semSenha = contaSemSenha();
  const ehAdmin = Number(usuario.eh_admin) === 1;

  document.getElementById('nomeUsuario').textContent = usuario.nome || 'Usuário';
  document.getElementById('emailUsuario').textContent = usuario.email || '—';

  document.getElementById('nomeEditar').value = usuario.nome || '';
  document.getElementById('emailEditar').value = usuario.email || '';

  document.getElementById('badgeGoogle').hidden = !isGoogle;
  document.getElementById('badgeAdmin').hidden = !ehAdmin;
  document.getElementById('btnPainelAdmin').hidden = !ehAdmin;

  const infoMetodoLogin = document.getElementById('infoMetodoLogin');
  const linkRedefinirSenha = document.getElementById('linkRedefinirSenha');
  if (infoMetodoLogin) {
    infoMetodoLogin.textContent = semSenha
      ? 'Autenticado com sua conta Google.'
      : isGoogle
        ? 'Autenticado com e-mail, senha e conta Google vinculada.'
        : 'Autenticado com e-mail e senha.';
  }
  if (linkRedefinirSenha) {
    linkRedefinirSenha.hidden = semSenha;
  }

  const controlesFotoConfig = document.getElementById('controlesFotoConfig');
  const avisoFotoGoogle = document.getElementById('avisoFotoGoogle');
  if (controlesFotoConfig) controlesFotoConfig.hidden = isGoogle;
  if (avisoFotoGoogle) avisoFotoGoogle.hidden = !isGoogle;
}

/* ==========================================
   FOTO DE PERFIL
   ========================================== */
const fotoPerfil = document.getElementById('fotoPerfil');
const inputFoto = document.getElementById('inputFoto');
const btnTrocarFoto = document.getElementById('trocarFoto');
const btnRemoverFoto = document.getElementById('removerFoto');
const btnTrocarFotoConfig = document.getElementById('trocarFotoConfig');
const btnRemoverFotoConfig = document.getElementById('removerFotoConfig');

function mostrarFoto(url) {
  fotoPerfil.src = url || FOTO_PADRAO;

  const fotoHeader = document.getElementById('FotoUsuario');
  if (fotoHeader) {
    fotoHeader.src = url || '../imagens/IUsuario.png';
  }

  const isGoogle = ehUsuarioGoogle();
  if (btnTrocarFoto) btnTrocarFoto.hidden = isGoogle;
  if (btnRemoverFoto) btnRemoverFoto.hidden = !url || isGoogle;
  if (btnRemoverFotoConfig) btnRemoverFotoConfig.hidden = !url || isGoogle;
}

fotoPerfil.addEventListener('error', () => {
  if (!fotoPerfil.src.endsWith(FOTO_PADRAO)) {
    fotoPerfil.src = FOTO_PADRAO;
  }
});

async function carregarPerfil() {
  mostrarFoto(usuario.foto_url);
  preencherSidebarEConfig();

  try {
    const resposta = await fetch(`${API_URL}/usuario`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (resposta.status === 401) {
      sessaoExpirou();
      return;
    }
    if (await tratarRespostaBloqueada(resposta)) return;
    if (!resposta.ok) return;

    const dados = await resposta.json();
    if (dados?.usuario) {
      usuario = { ...usuario, ...dados.usuario };
      localStorage.setItem('usuario', JSON.stringify(usuario));
      mostrarFoto(usuario.foto_url);
      preencherSidebarEConfig();
    }
  } catch (erro) {
    console.error('Erro ao carregar dados do usuário:', erro);
  }
}

function abrirSeletorFoto() {
  if (ehUsuarioGoogle()) return;
  inputFoto.click();
}

btnTrocarFoto.addEventListener('click', abrirSeletorFoto);
btnTrocarFotoConfig.addEventListener('click', abrirSeletorFoto);

inputFoto.addEventListener('change', async () => {
  if (ehUsuarioGoogle()) return;
  const arquivo = inputFoto.files[0];
  inputFoto.value = '';
  if (!arquivo) return;

  if (!FOTO_TIPOS.includes(arquivo.type)) {
    notificar('Escolha uma imagem JPEG, PNG ou WebP.', 'alertRuim', 5000);
    return;
  }
  if (arquivo.size > FOTO_TAM_MAX) {
    notificar('A imagem deve ter no máximo 5 MB.', 'alertRuim', 5000);
    return;
  }

  const formData = new FormData();
  formData.append('imagem', arquivo);

  btnTrocarFoto.disabled = true;
  btnTrocarFotoConfig.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}/usuario/foto`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const dados = await resposta.json();
    if (resposta.ok) {
      usuario.foto_url = dados.foto_url;
      localStorage.setItem('usuario', JSON.stringify(usuario));
      mostrarFoto(dados.foto_url);
      notificar('Foto atualizada com sucesso!', 'alertBom', 3000);
    } else if (resposta.status === 401) {
      sessaoExpirou();
    } else if (await tratarRespostaBloqueada(resposta, dados)) {
      return;
    } else {
      notificar(dados.mensagem || 'Erro ao enviar a foto.', 'alertRuim', 5000);
    }
  } catch (erro) {
    console.error('Erro ao enviar a foto:', erro);
    notificar('Erro de conexão com o servidor.', 'alertRuim', 5000);
  } finally {
    btnTrocarFoto.disabled = false;
    btnTrocarFotoConfig.disabled = false;
  }
});

async function removerFotoPerfil() {
  if (ehUsuarioGoogle()) return;
  if (!confirm('Remover sua foto de perfil?')) return;

  try {
    const resposta = await fetch(`${API_URL}/usuario/foto`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (resposta.ok) {
      usuario.foto_url = null;
      localStorage.setItem('usuario', JSON.stringify(usuario));
      mostrarFoto(null);
      notificar('Foto removida.', 'alertBom', 3000);
    } else if (resposta.status === 401) {
      sessaoExpirou();
    } else if (await tratarRespostaBloqueada(resposta)) {
      return;
    } else {
      notificar('Não foi possível remover a foto.', 'alertRuim', 5000);
    }
  } catch (erro) {
    console.error('Erro ao remover a foto:', erro);
    notificar('Erro de conexão com o servidor.', 'alertRuim', 5000);
  }
}

btnRemoverFoto.addEventListener('click', removerFotoPerfil);
btnRemoverFotoConfig.addEventListener('click', removerFotoPerfil);

/* ==========================================
   FORMULÁRIO DE DADOS PESSOAIS
   ========================================== */
document.getElementById('formMudarDados').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('nomeEditar').value.trim().replace(/\s+/g, ' ');
  const btnSalvar = document.getElementById('btnSalvarDados');

  if (nome.length < 3 || !nome.includes(' ')) {
    notificar('Por favor, digite seu nome e sobrenome.', 'alertRuim', 4000);
    return;
  }
  if (nome.length > 150) {
    notificar('O nome pode ter no máximo 150 caracteres.', 'alertRuim', 4000);
    return;
  }

  const textoOriginal = btnSalvar.textContent;
  btnSalvar.disabled = true;
  btnSalvar.textContent = 'Salvando...';

  try {
    const resposta = await fetch(`${API_URL}/usuario`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ nome })
    });
    const dados = await resposta.json();

    if (resposta.ok) {
      usuario = { ...usuario, ...(dados.usuario || {}), nome };
      localStorage.setItem('usuario', JSON.stringify(usuario));
      preencherSidebarEConfig();
      notificar('Dados atualizados com sucesso!', 'alertBom', 3000);
    } else if (resposta.status === 401) {
      sessaoExpirou();
    } else if (await tratarRespostaBloqueada(resposta, dados)) {
      return;
    } else {
      notificar(dados.mensagem || 'Erro ao atualizar os dados.', 'alertRuim', 5000);
    }
  } catch (erro) {
    console.error('Erro ao atualizar perfil:', erro);
    notificar('Erro de conexão com o servidor.', 'alertRuim', 5000);
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = textoOriginal;
  }
});

/* ==========================================
   SISTEMA DE ABAS
   ========================================== */
const botoesAbas = Array.from(document.querySelectorAll('.tab-btn'));
const paineisAbas = Array.from(document.querySelectorAll('.tab-painel'));

function ativarAba(nomeAba, atualizarHash = true) {
  const existe = botoesAbas.some((b) => b.dataset.tab === nomeAba);
  const alvo = existe ? nomeAba : 'visao-geral';

  botoesAbas.forEach((btn) => {
    const ativo = btn.dataset.tab === alvo;
    btn.classList.toggle('ativo', ativo);
    btn.setAttribute('aria-selected', String(ativo));
  });

  paineisAbas.forEach((painel) => {
    painel.hidden = painel.id !== `painel-${alvo}`;
  });

  if (atualizarHash) {
    history.replaceState(null, '', `#${alvo}`);
  }
}

botoesAbas.forEach((btn, indice) => {
  btn.addEventListener('click', () => ativarAba(btn.dataset.tab));

  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      const proximo = botoesAbas[(indice + 1) % botoesAbas.length];
      proximo.focus();
      ativarAba(proximo.dataset.tab);
    } else if (e.key === 'ArrowLeft') {
      const anterior = botoesAbas[(indice - 1 + botoesAbas.length) % botoesAbas.length];
      anterior.focus();
      ativarAba(anterior.dataset.tab);
    }
  });
});

document.getElementById('btnIrEditar').addEventListener('click', () => {
  ativarAba('configuracoes');
  setTimeout(() => {
    document.getElementById('nomeEditar')?.focus();
  }, 60);
});

const hashInicial = window.location.hash.replace('#', '');
if (hashInicial) {
  ativarAba(hashInicial, false);
}

/* ==========================================
   LOCAIS SALVOS (BANCO DE DADOS VIA Favoritos)
   ========================================== */
function atualizarContadoresFavoritos() {
  const total = typeof Favoritos !== 'undefined' ? Favoritos.total() : 0;
  const badge = document.getElementById('contadorFavoritosTab');
  const stat = document.getElementById('statTotalFavoritos');
  if (badge) badge.textContent = String(total);
  if (stat) stat.textContent = String(total);
}

function criarCardLocalHtml(ponto) {
  const nota = Number(ponto.media_nota || 0).toFixed(1);
  const totalAv = Number(ponto.total_avaliacoes || 0);
  const imgSrc = textoSeguro(imagemPontoSegura(ponto.imagem));
  const botaoFav = typeof Favoritos !== 'undefined'
    ? Favoritos.botaoHtml(ponto.id, ponto.nome)
    : '';

  return `
    <article class="card-local">
      <div class="card-local-topo">
        <img src="${imgSrc}" data-fallback="${FOTO_FALLBACK_LOCAL}" alt="${textoSeguro(ponto.nome)}" loading="lazy">
        <span class="card-local-categoria">${textoSeguro(ponto.categoria_nome || 'Geral')}</span>
        ${botaoFav}
      </div>
      <div class="card-local-corpo">
        <div class="card-local-linha">
          <h3>${textoSeguro(ponto.nome)}</h3>
          <span class="card-local-nota">★ ${nota} (${totalAv})</span>
        </div>
        <p class="card-local-endereco">${textoSeguro(ponto.endereco || 'Assis Chateaubriand, PR')}</p>
        <div class="card-local-acoes">
          <a href="../servicos/avalia.html?id=${encodeURIComponent(ponto.id)}" class="card-local-link">Ver detalhes e avaliar →</a>
        </div>
      </div>
    </article>
  `;
}

function renderizarDestaques() {
  const container = document.getElementById('destaquesLocais');
  if (!container || pontosGuia.length === 0) return;

  const destaques = [...pontosGuia]
    .sort((a, b) => Number(b.media_nota || 0) - Number(a.media_nota || 0) || Number(b.total_avaliacoes || 0) - Number(a.total_avaliacoes || 0))
    .slice(0, 4);

  container.innerHTML = destaques.map(criarCardLocalHtml).join('');
  aplicarFallbackImagens(container);
  if (typeof Favoritos !== 'undefined') Favoritos.atualizarBotoes(container);
}

function renderizarFavoritos() {
  const container = document.getElementById('listaFavoritos');
  const vazio = document.getElementById('vazioFavoritos');
  const buscaInput = document.getElementById('buscaFavoritos');
  if (!container || !vazio) return;

  const favoritos = typeof Favoritos !== 'undefined' ? Favoritos.obterLista() : [];
  const termo = (buscaInput?.value || '').trim().toLowerCase();
  const filtrados = termo
    ? favoritos.filter((item) =>
        `${item.nome} ${item.categoria_nome} ${item.endereco}`.toLowerCase().includes(termo)
      )
    : favoritos;

  atualizarContadoresFavoritos();

  if (favoritos.length === 0) {
    container.innerHTML = '';
    container.hidden = true;
    vazio.hidden = false;
    return;
  }

  vazio.hidden = true;
  container.hidden = false;

  if (filtrados.length === 0) {
    container.innerHTML = `
      <div class="estado-vazio" style="grid-column: 1 / -1;">
        <h3>Nenhum resultado encontrado</h3>
        <p>Nenhum local salvo corresponde a "${textoSeguro(buscaInput.value.trim())}".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtrados.map(criarCardLocalHtml).join('');
  aplicarFallbackImagens(container);
}

document.getElementById('buscaFavoritos').addEventListener('input', renderizarFavoritos);

async function carregarFavoritosDoBanco() {
  if (typeof Favoritos === 'undefined') return;
  const container = document.getElementById('listaFavoritos');
  const vazio = document.getElementById('vazioFavoritos');

  try {
    await Favoritos.carregar(true);
    renderizarFavoritos();
    renderizarDestaques();
  } catch (erro) {
    console.error('Erro ao carregar locais salvos:', erro);
    if (vazio) vazio.hidden = true;
    if (container) {
      container.hidden = false;
      container.innerHTML = `
        <div class="estado-vazio" style="grid-column: 1 / -1;">
          <h3>Não foi possível carregar seus locais salvos</h3>
          <p>Verifique sua conexão e tente novamente.</p>
          <button type="button" id="btnRecarregarFavoritos" class="btn-secundario">Tentar novamente</button>
        </div>
      `;
      document.getElementById('btnRecarregarFavoritos')?.addEventListener('click', carregarFavoritosDoBanco);
    }
  }
}

document.addEventListener('favoritos:alterado', async (evento) => {
  if (evento.detail?.salvo) {
    await carregarFavoritosDoBanco();
  } else {
    renderizarFavoritos();
  }
});

async function carregarPontosGuia() {
  const containerDestaques = document.getElementById('destaquesLocais');
  const statTotalPontos = document.getElementById('statTotalPontos');
  const statTotalCategorias = document.getElementById('statTotalCategorias');

  try {
    const resposta = await fetch(`${API_URL}/pontos`);
    if (!resposta.ok) throw new Error('Falha ao buscar pontos');
    const dados = await resposta.json();
    pontosGuia = Array.isArray(dados) ? dados : [];

    const categorias = new Set(pontosGuia.map((p) => p.categoria_nome).filter(Boolean));
    if (statTotalPontos) statTotalPontos.textContent = String(pontosGuia.length);
    if (statTotalCategorias) {
      statTotalCategorias.textContent = `${categorias.size} categorias em Assis Chateaubriand`;
    }

    renderizarDestaques();
  } catch (erro) {
    console.error('Erro ao carregar destaques do guia:', erro);
    if (statTotalPontos) statTotalPontos.textContent = '—';
    if (statTotalCategorias) statTotalCategorias.textContent = 'Não foi possível carregar agora';
    if (containerDestaques) {
      containerDestaques.innerHTML = `
        <div class="estado-vazio" style="grid-column: 1 / -1;">
          <h3>Não foi possível carregar os destaques</h3>
          <p>Verifique sua conexão e tente novamente.</p>
          <button type="button" id="btnRecarregarPontos" class="btn-secundario">Tentar novamente</button>
        </div>
      `;
      document.getElementById('btnRecarregarPontos')?.addEventListener('click', carregarPontosGuia);
    }
  }
}

/* ==========================================
   MINHAS AVALIAÇÕES (VER, EDITAR E EXCLUIR)
   ========================================== */
function atualizarContadoresAvaliacoes() {
  const total = minhasAvaliacoes.length;
  const badge = document.getElementById('contadorAvaliacoesTab');
  const stat = document.getElementById('statTotalAvaliacoes');
  if (badge) badge.textContent = String(total);
  if (stat) stat.textContent = String(total);
}

function renderizarMinhasAvaliacoes() {
  const container = document.getElementById('listaAvaliacoes');
  const vazio = document.getElementById('vazioAvaliacoes');
  if (!container || !vazio) return;

  atualizarContadoresAvaliacoes();

  if (minhasAvaliacoes.length === 0) {
    container.innerHTML = '';
    container.hidden = true;
    vazio.hidden = false;
    return;
  }

  vazio.hidden = true;
  container.hidden = false;

  container.innerHTML = minhasAvaliacoes
    .map((av) => {
      const nota = Math.max(0, Math.min(5, Number(av.nota) || 0));
      const estrelas = '★'.repeat(nota) + '☆'.repeat(5 - nota);
      const imgSrc = textoSeguro(imagemPontoSegura(av.ponto_imagem));
      const tags = (av.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const tagsHtml = tags.length > 0
        ? tags.map((t) => `<span class="avaliacao-tag-chip">${textoSeguro(t)}</span>`).join('')
        : '<span class="avaliacao-tag-vazio">Sem observações</span>';

      return `
        <article class="card-avaliacao-perfil">
          <div class="avaliacao-card-topo">
            <img src="${imgSrc}" data-fallback="${FOTO_FALLBACK_LOCAL}" alt="${textoSeguro(av.ponto_nome)}" class="avaliacao-card-img" loading="lazy">
            <div class="avaliacao-card-info">
              <div class="avaliacao-cabecalho-linha">
                <h3><a href="../servicos/avalia.html?id=${encodeURIComponent(av.id_ponto)}">${textoSeguro(av.ponto_nome)}</a></h3>
                <span class="avaliacao-estrelas" aria-label="${nota} de 5 estrelas">${estrelas}</span>
              </div>
              <p class="card-local-endereco">${textoSeguro(av.categoria_nome || 'Geral')} · ${textoSeguro(av.ponto_endereco || 'Assis Chateaubriand, PR')}</p>
              <div class="avaliacao-tags">${tagsHtml}</div>
            </div>
          </div>

          <div class="avaliacao-acoes">
            <a href="../servicos/avalia.html?id=${encodeURIComponent(av.id_ponto)}" class="btn-acao-card">Ver local</a>
            <button type="button" class="btn-acao-card" data-editar-avaliacao="${Number(av.id)}">Editar</button>
            <button type="button" class="btn-acao-card-perigo" data-excluir-avaliacao="${Number(av.id)}">Excluir</button>
          </div>
        </article>
      `;
    })
    .join('');

  aplicarFallbackImagens(container);

  container.querySelectorAll('[data-editar-avaliacao]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.editarAvaliacao);
      const item = minhasAvaliacoes.find((a) => Number(a.id) === id);
      if (item) abrirModalEditarAvaliacao(item);
    });
  });

  container.querySelectorAll('[data-excluir-avaliacao]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.excluirAvaliacao);
      const item = minhasAvaliacoes.find((a) => Number(a.id) === id);
      if (item) excluirAvaliacao(item, btn);
    });
  });
}

async function carregarMinhasAvaliacoes() {
  const container = document.getElementById('listaAvaliacoes');
  const vazio = document.getElementById('vazioAvaliacoes');

  try {
    const resposta = await fetch(`${API_URL}/usuario/avaliacoes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (resposta.status === 401) {
      sessaoExpirou();
      return;
    }
    if (await tratarRespostaBloqueada(resposta)) return;
    if (!resposta.ok) throw new Error('Falha ao buscar avaliações');

    const dados = await resposta.json();
    minhasAvaliacoes = Array.isArray(dados.avaliacoes) ? dados.avaliacoes : [];
    renderizarMinhasAvaliacoes();
  } catch (erro) {
    console.error('Erro ao carregar avaliações:', erro);
    if (vazio) vazio.hidden = true;
    if (container) {
      container.hidden = false;
      container.innerHTML = `
        <div class="estado-vazio">
          <h3>Não foi possível carregar suas avaliações</h3>
          <p>Verifique sua conexão e tente novamente.</p>
          <button type="button" id="btnRecarregarAvaliacoes" class="btn-secundario">Tentar novamente</button>
        </div>
      `;
      document.getElementById('btnRecarregarAvaliacoes')?.addEventListener('click', carregarMinhasAvaliacoes);
    }
  }
}

/* ==========================================
   MODAL DE EDIÇÃO DE AVALIAÇÃO
   ========================================== */
const modalEditarAvaliacao = document.getElementById('modalEditarAvaliacao');
const formEditarAvaliacao = document.getElementById('formEditarAvaliacao');
const botoesEstrelaEdicao = Array.from(document.querySelectorAll('#editarEstrelas .estrela-btn'));
const botoesTagEdicao = Array.from(document.querySelectorAll('#editarTags .tag-toggle'));

function definirNotaEdicao(nota) {
  notaSelecionadaEdicao = Number(nota) || 0;
  botoesEstrelaEdicao.forEach((btn) => {
    const valor = Number(btn.dataset.nota);
    const ativa = valor <= notaSelecionadaEdicao;
    btn.classList.toggle('ativa', ativa);
    btn.setAttribute('aria-checked', String(valor === notaSelecionadaEdicao));
  });

  const texto = document.getElementById('editarNotaTexto');
  if (texto) {
    texto.textContent = notaSelecionadaEdicao > 0
      ? `Nota selecionada: ${notaSelecionadaEdicao} de 5 estrela(s)`
      : 'Selecione de 1 a 5 estrelas';
  }
}

botoesEstrelaEdicao.forEach((btn) => {
  btn.addEventListener('click', () => definirNotaEdicao(Number(btn.dataset.nota)));
});

botoesTagEdicao.forEach((btn) => {
  btn.addEventListener('click', () => {
    const selecionada = btn.classList.toggle('selecionada');
    btn.setAttribute('aria-pressed', String(selecionada));
  });
});

function abrirModalEditarAvaliacao(avaliacao) {
  avaliacaoEmEdicao = avaliacao;
  document.getElementById('editarAvaliacaoLocal').textContent = avaliacao.ponto_nome || '';
  definirNotaEdicao(avaliacao.nota);

  const tagsAtuais = (avaliacao.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  botoesTagEdicao.forEach((btn) => {
    const marcada = tagsAtuais.includes(btn.dataset.tag);
    btn.classList.toggle('selecionada', marcada);
    btn.setAttribute('aria-pressed', String(marcada));
  });

  modalEditarAvaliacao.showModal();
}

formEditarAvaliacao.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!avaliacaoEmEdicao) return;

  if (!Number.isInteger(notaSelecionadaEdicao) || notaSelecionadaEdicao < 1 || notaSelecionadaEdicao > 5) {
    notificar('Selecione uma nota de 1 a 5 estrelas.', 'alertRuim', 4000);
    return;
  }

  const tagsSelecionadas = botoesTagEdicao
    .filter((btn) => btn.classList.contains('selecionada'))
    .map((btn) => btn.dataset.tag);

  const btnSalvar = document.getElementById('btnSalvarEdicaoAvaliacao');
  const textoOriginal = btnSalvar.textContent;
  btnSalvar.disabled = true;
  btnSalvar.textContent = 'Salvando...';

  try {
    const resposta = await fetch(`${API_URL}/usuario/avaliacoes/${Number(avaliacaoEmEdicao.id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        nota: notaSelecionadaEdicao,
        tags: tagsSelecionadas.join(', ')
      })
    });

    if (resposta.status === 401) {
      modalEditarAvaliacao.close();
      sessaoExpirou();
      return;
    }

    const dados = await resposta.json().catch(() => ({}));
    if (await tratarRespostaBloqueada(resposta, dados)) {
      modalEditarAvaliacao.close();
      return;
    }
    if (!resposta.ok) {
      notificar(dados.mensagem || 'Erro ao atualizar a avaliação.', 'alertRuim', 4000);
      return;
    }

    const idx = minhasAvaliacoes.findIndex((a) => Number(a.id) === Number(avaliacaoEmEdicao.id));
    if (idx !== -1 && dados.avaliacao) {
      minhasAvaliacoes[idx] = {
        ...minhasAvaliacoes[idx],
        nota: dados.avaliacao.nota,
        tags: dados.avaliacao.tags
      };
    }

    renderizarMinhasAvaliacoes();
    modalEditarAvaliacao.close();
    notificar('Avaliação atualizada!', 'alertBom', 3000);
    carregarPontosGuia();
    carregarFavoritosDoBanco();
  } catch (erro) {
    console.error('Erro ao editar avaliação:', erro);
    notificar('Erro de conexão com o servidor.', 'alertRuim', 4000);
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = textoOriginal;
  }
});

async function excluirAvaliacao(avaliacao, botao) {
  if (!confirm(`Excluir sua avaliação de "${avaliacao.ponto_nome}"?`)) return;

  botao.disabled = true;
  try {
    const resposta = await fetch(`${API_URL}/usuario/avaliacoes/${Number(avaliacao.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (resposta.status === 401) {
      sessaoExpirou();
      return;
    }

    const dados = await resposta.json().catch(() => ({}));
    if (await tratarRespostaBloqueada(resposta, dados)) {
      return;
    }
    if (!resposta.ok) {
      notificar(dados.mensagem || 'Não foi possível excluir a avaliação.', 'alertRuim', 4000);
      botao.disabled = false;
      return;
    }

    minhasAvaliacoes = minhasAvaliacoes.filter((a) => Number(a.id) !== Number(avaliacao.id));
    renderizarMinhasAvaliacoes();
    notificar('Avaliação excluída.', 'alertBom', 3000);
    carregarPontosGuia();
    carregarFavoritosDoBanco();
  } catch (erro) {
    console.error('Erro ao excluir avaliação:', erro);
    notificar('Erro de conexão com o servidor.', 'alertRuim', 4000);
    botao.disabled = false;
  }
}

/* ==========================================
   EXCLUSÃO PERMANENTE DE CONTA
   ========================================== */
const modalExcluirConta = document.getElementById('modalExcluirConta');
const formExcluirConta = document.getElementById('formExcluirConta');
const checkConfirmarExclusao = document.getElementById('checkConfirmarExclusao');
const inputConfirmacaoExclusao = document.getElementById('inputConfirmacaoExclusao');
const grupoSenhaExclusao = document.getElementById('grupoSenhaExclusao');
const inputSenhaExclusao = document.getElementById('inputSenhaExclusao');
const grupoEmailExclusao = document.getElementById('grupoEmailExclusao');
const inputEmailExclusao = document.getElementById('inputEmailExclusao');
const btnConfirmarExclusaoConta = document.getElementById('btnConfirmarExclusaoConta');

function resetarCamposExclusao() {
  checkConfirmarExclusao.checked = false;
  inputConfirmacaoExclusao.value = '';
  inputSenhaExclusao.value = '';
  inputEmailExclusao.value = '';
  btnConfirmarExclusaoConta.disabled = true;
}

function validarFormularioExclusao() {
  const marcou = checkConfirmarExclusao.checked;
  const digitouExcluir = inputConfirmacaoExclusao.value.trim() === 'EXCLUIR';
  let identidadeOk = false;

  if (contaSemSenha()) {
    const emailEsperado = String(usuario.email || '').trim().toLowerCase();
    identidadeOk = Boolean(emailEsperado) && inputEmailExclusao.value.trim().toLowerCase() === emailEsperado;
  } else {
    identidadeOk = inputSenhaExclusao.value.length > 0;
  }

  btnConfirmarExclusaoConta.disabled = !(marcou && digitouExcluir && identidadeOk);
}

[checkConfirmarExclusao, inputConfirmacaoExclusao, inputSenhaExclusao, inputEmailExclusao].forEach((el) => {
  el.addEventListener('input', validarFormularioExclusao);
  el.addEventListener('change', validarFormularioExclusao);
});

modalExcluirConta.addEventListener('close', resetarCamposExclusao);

document.getElementById('btnAbrirExclusaoConta').addEventListener('click', () => {
  const totalFav = typeof Favoritos !== 'undefined' ? Favoritos.total() : 0;
  document.getElementById('exclusaoTotalFavoritos').textContent = String(totalFav);
  document.getElementById('exclusaoTotalAvaliacoes').textContent = String(minhasAvaliacoes.length);

  const semSenha = contaSemSenha();
  grupoSenhaExclusao.hidden = semSenha;
  grupoEmailExclusao.hidden = !semSenha;

  resetarCamposExclusao();
  modalExcluirConta.showModal();
});

formExcluirConta.addEventListener('submit', async (e) => {
  e.preventDefault();
  validarFormularioExclusao();
  if (btnConfirmarExclusaoConta.disabled) return;

  const semSenha = contaSemSenha();
  const corpo = { confirmacao: inputConfirmacaoExclusao.value.trim() };
  if (semSenha) {
    corpo.emailConfirmacao = inputEmailExclusao.value.trim();
  } else {
    corpo.senha = inputSenhaExclusao.value;
  }

  const textoOriginal = btnConfirmarExclusaoConta.textContent;
  btnConfirmarExclusaoConta.disabled = true;
  btnConfirmarExclusaoConta.textContent = 'Excluindo...';

  try {
    const resposta = await fetch(`${API_URL}/usuario`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(corpo)
    });

    if (resposta.status === 401) {
      modalExcluirConta.close();
      sessaoExpirou();
      return;
    }

    const dados = await resposta.json().catch(() => ({}));
    if (await tratarRespostaBloqueada(resposta, dados)) {
      modalExcluirConta.close();
      return;
    }
    if (!resposta.ok) {
      notificar(dados.mensagem || 'Não foi possível excluir a conta.', 'alertRuim', 5000);
      btnConfirmarExclusaoConta.textContent = textoOriginal;
      validarFormularioExclusao();
      return;
    }

    modalExcluirConta.close();
    limparSessaoLocal();
    notificar('Sua conta foi excluída permanentemente.', 'alertBom', 3500);
    setTimeout(() => {
      window.location.replace('../index.html');
    }, 1500);
  } catch (erro) {
    console.error('Erro ao excluir conta:', erro);
    notificar('Erro de conexão com o servidor.', 'alertRuim', 5000);
    btnConfirmarExclusaoConta.textContent = textoOriginal;
    validarFormularioExclusao();
  }
});

/* ==========================================
   FECHAR MODAIS (<dialog>)
   ========================================== */
[modalEditarAvaliacao, modalExcluirConta].forEach((dialog) => {
  dialog.querySelectorAll('[data-fechar-dialog]').forEach((btn) => {
    btn.addEventListener('click', () => dialog.close());
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close();
    }
  });
});

/* ==========================================
   LOGOUT
   ========================================== */
function fazerLogout() {
  if (!confirm('Deseja sair de sua conta?')) return;
  limparSessaoLocal();
  window.location.href = '../index.html';
}

document.getElementById('logOut').addEventListener('click', fazerLogout);
document.getElementById('logOutConfig').addEventListener('click', fazerLogout);

/* ==========================================
   INICIALIZAÇÃO
   ========================================== */
atualizarContadoresFavoritos();
atualizarContadoresAvaliacoes();
carregarPerfil();
carregarPontosGuia();
carregarFavoritosDoBanco();
carregarMinhasAvaliacoes();
