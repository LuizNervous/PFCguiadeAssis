const API = 'https://guia-assis.onrender.com/api';

const parametrosURL = new URLSearchParams(window.location.search);
const idPonto = parametrosURL.get('id');

async function CarregarPontos() {
  if (!idPonto) {
    alert("Nenhum local foi selecionado ! ");
    window.location.href = "../servicos/index.html";
    return;
  }
  try {
    const resposta = await fetch(`${API}/pontos/${idPonto}`);
    if (!resposta.ok) throw new Error("Erro ao buscar informações do local");

    const ponto = await resposta.json();
    renderizarPontos(ponto);
    renderizarFormularioAvaliacao();
     carregarListaDeAvaliacoes();
  }
  catch (erro) {
    console.error(erro);
    document.getElementById("pontoSelecionado").innerHTML = "<h2>Erro ao carregar os dados deste local.</h2>"
  }
}
function renderizarPontos(ponto) {
  const container = document.getElementById("pontoSelecionado");

  const imagemSrc = `../imagens/pontos/${ponto.imagem}`;
  const mediaNota = ponto.media_nota ? Number(ponto.media_nota).toFixed(1) : "0.0";

  container.innerHTML = `
  <div class="detalhes-card">
      <img src="${imagemSrc}" alt="${ponto.nome}" class="imagem-ponto">
      <div class="detalhes-info">
          <span class="categoria-tag">${ponto.categoria_nome || 'Geral'}</span>
          <h2>${ponto.nome}</h2>
          <p class="nota-media">⭐ <strong>${mediaNota}</strong> (${ponto.total_avaliacoes || 0} avaliações)</p>
          <p class="endereco">📍 ${ponto.endereco}</p>
          <p class="descricao">${ponto.descricao}</p>
        </div>
    </div>
  `
}

function renderizarFormularioAvaliacao() {
  const container = document.getElementById("avaliacoes");

  container.innerHTML = `
        <div class="box-avaliacao">
            <h3>Sua Avaliação</h3>
            
            <p>Selecione uma nota de 1 a 5 estrelas:</p>
            <div class="rating-input">
                <input type="radio" name="rating" value="5" id="star5"><label for="star5">★</label>
                <input type="radio" name="rating" value="4" id="star4"><label for="star4">★</label>
                <input type="radio" name="rating" value="3" id="star3"><label for="star3">★</label>
                <input type="radio" name="rating" value="2" id="star2"><label for="star2">★</label>
                <input type="radio" name="rating" value="1" id="star1"><label for="star1">★</label>
            </div>

            <p style="margin-top: 15px;">O que você achou deste local? (Opcional)</p>
            <div class="container-tags">
                <button type="button" class="btn-tag">Atendimento ruim</button>
                <button type="button" class="btn-tag">Lugar confortável</button>
                <button type="button" class="btn-tag">Preço elevado</button>
                <button type="button" class="btn-tag">Custo benefício</button>
                <button type="button" class="btn-tag">Bom atendimento </button>
            </div>

            <button id="btnEnviar" class="btn-enviar">Enviar Avaliação</button>
        </div>`;

  const botoesTag = container.querySelectorAll(".btn-tag");
  botoesTag.forEach(botao => {
    botao.addEventListener('click', () => {
      botao.classList.toggle("selecionada");
    });
  });
  document.getElementById("btnEnviar").addEventListener("click", enviarAvaliacao)
}

function criarAvaliacao(item) {
  const card = document.createElement("div");
  card.className = "card-usuario-avaliacao";

  const header = document.createElement("div");
  header.className = "header-avaliacao-usuario";

  const usuario = document.createElement("strong");

  const icone = document.createElement("i");
  icone.className = "fa-solid fa-user";

  usuario.appendChild(icone);
  usuario.appendChild(
    document.createTextNode(" " + (item.usuario_nome || "Usuário"))
  );

  const estrelas = document.createElement("span");
  estrelas.className = "estrelas-usuario";

  const nota = Number(item.nota) || 0;

  estrelas.textContent =
    "★".repeat(nota) + "☆".repeat(5 - nota);

  header.appendChild(usuario);
  header.appendChild(estrelas);

  const tagsContainer = document.createElement("div");
  tagsContainer.className = "tags-usuario";

  if (item.tags) {
    const tags = item.tags.split(", ");

    tags.forEach(tag => {
      const tagElement = document.createElement("span");
      tagElement.className = "tag-badge";
      tagElement.textContent = tag;

      tagsContainer.appendChild(tagElement);
    });
  } else {
    const vazio = document.createElement("span");
    vazio.className = "tag-badge-vazio";
    vazio.textContent = "Sem observações";

    tagsContainer.appendChild(vazio);
  }

  card.appendChild(header);
  card.appendChild(tagsContainer);

  return card;
}

async function carregarListaDeAvaliacoes() {
  const container = document.querySelector(".todasAvaliacoes");
  container.innerHTML= "<p>Carregando avaliações...</p>";

  try {
    const resposta = await fetch(`${API}/pontos/${idPonto}/avaliacoes`);

    if (!resposta.ok) {
      throw new Error("Erro ao buscar avaliações");
    }

    const listaAvaliacoes = await resposta.json();

    container.innerHTML = "";

    const titulo = document.createElement("h2");
    titulo.textContent = `Avaliações da Comunidade (${listaAvaliacoes.length})`;

    container.appendChild(titulo);

    if (listaAvaliacoes.length === 0) {
      const mensagem = document.createElement("p");
      mensagem.className = "sem-avaliacoes";
      mensagem.textContent =
        "Este local ainda não possui avaliações. Seja o primeiro a avaliar!";

      container.appendChild(mensagem);
      return;
    }

    const lista = document.createElement("div");
    lista.className = "lista-cards-avaliacoes";

    listaAvaliacoes.forEach(item => {
      lista.appendChild(criarAvaliacao(item));
    });

    container.appendChild(lista);

  }catch (erro) {
  console.error(erro);
  container.innerHTML = `
    <h2>Erro ao carregar os dados deste local.</h2>
    <p>Tente novamente mais tarde.</p>
    <a href="../servicos/index.html">Voltar ao Guia de Serviços</a>
  `;
}
}


async function enviarAvaliacao() {
  const token=localStorage.getItem('token');
  if (!token) {
    alert("Sua sessão expirou ou você não está logado. Faça login para continuar.");
    window.location.href = "../login/login.html";
    return;
  }
  const inputEstrela = document.querySelector("input[name='rating']:checked");
  if (!inputEstrela) {
    alert("Por favor, selecione quantas estrelas você dá para este local.");
    return;
  }
  const nota = parseInt(inputEstrela.value);
  const tagsElementos = document.querySelectorAll('.btn-tag.selecionada');
  const tagsArray = Array.from(tagsElementos).map(tag => tag.innerText);

  try {
    const resposta = await fetch(`${API}/avaliar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`},
      body: JSON.stringify({
        id_ponto: parseInt(idPonto),
        nota: nota,
        tags: tagsArray.join(', ')
      })
    });
    const dados = await resposta.json();
    if (resposta.ok) {
      alert("Avaliação registrada!");
      location.reload();
    } else {
      alert(dados.mensagem || "Erro ao registrar avaliação.");
    }

  } catch (erro) {
    console.error("Erro no envio:", erro);
    alert("Erro na conexão com o servidor.");
  }
}

document.addEventListener("DOMContentLoaded", CarregarPontos);