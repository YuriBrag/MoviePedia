

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

async function fetchJSON(url) {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    setStatus("Erro ao buscar dados: " + error.message);
    throw error;
  }
}

function setStatus(msg) {
  document.getElementById("status").textContent = "Status: " + msg;
}

function renderLista(filmes) {
  const ul = document.getElementById("listaFilmes");
  clearNode(ul);

  if (!filmes || filmes.length === 0) {
    ul.style.display = 'block';
    const p = document.createElement("p");
    p.textContent = "Nenhum filme no catálogo ainda.";
    p.style.textAlign = "center";
    p.style.padding = "20px";
    ul.appendChild(p);
    return;
  }

  ul.style.display = 'grid';

  filmes.forEach((f) => {
    const li = document.createElement("li");
    li.className = "movie-card";
    li.onclick = () => carregarDetalhes(f.id);

    if (f.capa && f.capa !== "N/A" && f.capa.startsWith("http")) {
      const img = document.createElement("img");
      img.src = f.capa;
      img.alt = f.titulo;
      img.onerror = () => {
        img.style.display = 'none';
        const div = document.createElement("div");
        div.className = "no-poster";
        div.textContent = f.titulo;
        li.appendChild(div);
      };
      li.appendChild(img);
    } else {
      const div = document.createElement("div");
      div.className = "no-poster";
      div.textContent = f.titulo;
      li.appendChild(div);
    }

    ul.appendChild(li);
  });
}

function renderDetalhes(filme) {
  const div = document.getElementById("detalhesFilme");
  clearNode(div);
  if (filme.capa && filme.capa !== "N/A") {
    const img = document.createElement("img");
    img.src = filme.capa;
    img.style.maxWidth = "200px";
    img.style.borderRadius = "8px";
    img.style.marginBottom = "15px";
    div.appendChild(img);
  }

  const h2 = document.createElement("h2");
  h2.textContent = filme.titulo;
  div.appendChild(h2);

  const pInfo = document.createElement("p");
  const generosStr = Array.isArray(filme.generos) ? filme.generos.join(", ") : filme.generos;
  pInfo.textContent = `Ano: ${filme.ano} | Direção: ${filme.direcao} | Gêneros: ${generosStr}`;
  div.appendChild(pInfo);

  const pNota = document.createElement("p");
  pNota.textContent = `Nota: ${filme.nota !== null ? filme.nota : "N/A"}`;
  div.appendChild(pNota);

  const pSinopse = document.createElement("p");
  pSinopse.textContent = filme.sinopse || "Sem sinopse.";
  div.appendChild(pSinopse);
}


async function carregarLista(url) {
  try {
    setStatus("Carregando lista...");
    const filmes = await fetchJSON(url);
    renderLista(filmes);
    setStatus("OK");
  } catch {
  }
}

async function carregarDetalhes(id) {
  try {
    setStatus("Carregando detalhes...");
    const filme = await fetchJSON(`/api/filmes/${id}`);
    renderDetalhes(filme);
    setStatus("OK");
  } catch {
  }
}

function montarURLFilmes() {
  const t = document.getElementById("filtroTexto").value.trim();
  const a = document.getElementById("filtroAno").value.trim();
  const g = document.getElementById("filtroGenero").value.trim();

  const params = [];
  if (t) params.push(`q=${encodeURIComponent(t)}`);
  if (a) params.push(`ano=${encodeURIComponent(a)}`);
  if (g) params.push(`genero=${encodeURIComponent(g)}`);

  return "/api/filmes" + (params.length > 0 ? "?" + params.join("&") : "");
}


function conectarWebSocket() {
  const protocolo = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocolo}//${window.location.host}`;

  const socket = new WebSocket(wsUrl);

  socket.addEventListener('open', () => {
    setStatus("WebSocket conectado.");
  });

  socket.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      tratarMensagemWS(msg);
    } catch (e) {
      console.error("Erro ao processar mensagem WS:", e);
    }
  });

  socket.addEventListener('close', () => {
    setStatus("WebSocket desconectado. Tentando reconectar...");
    setTimeout(conectarWebSocket, 5000);
  });
}

function tratarMensagemWS(msg) {
  if (msg.tipo === 'novo-filme') {
    carregarLista(montarURLFilmes());
    setStatus(`Novo filme adicionado: ${msg.dados.titulo}`);
  }
}

async function buscarFilmeOnline() {
  const tituloInput = document.getElementById("titulo");

  const termo = tituloInput.value;

  if (!termo) {
    setStatus("Digite um título para buscar.");
    return;
  }

  try {
    setStatus("Buscando filme...");

    const dados = await fetchJSON(`/api/buscar-omdb?titulo=${encodeURIComponent(termo)}`);

    renderDetalhes(dados);
    tituloInput.value = "";

    setStatus(`Filme "${dados.titulo}" encontrado e salvo no catálogo!`);

  } catch (error) {
    setStatus("Erro na busca: " + error.message);
    const div = document.getElementById("detalhesFilme");
    clearNode(div);
    div.innerHTML = `<p style="color: #ff5555; padding: 10px;">${error.message}</p>`;
  }
}


async function abrirFormReview(filme) {
  try {
    const response = await fetch('/api/auth/me', { 
      credentials: 'include' 
      });
      const authData = await response.json();
      if (!authData.loggedIn) {
        window.location.href = "/login.html";
        return;
      }
    } catch (e) {
      console.error(e);
      return;
    }
    const container = document.getElementById("detalhesFilme");
    clearNode(container);
    
    container.appendChild(criarCabecalhoComVoltar(`Avaliar: ${filme.titulo}`, filme));
    const formDiv = document.createElement("div");
    formDiv.innerHTML = `
      <div class="campo" style="margin-bottom: 25px;"> <label>Sua Nota (0 a 10):</label>
        <input type="number" id="reviewNota" min="0" max="10" step="0.1" placeholder="Ex: 10" style="padding: 10px;">
      </div>
      
      <div class="campo" style="margin-bottom: 25px;"> <label>Seu Comentário:</label>
        <textarea id="reviewTexto" rows="5" placeholder="Escreva o que achou..." style="padding: 10px;"></textarea>
      </div>
      
      <button id="btnEnviarReview" class="btn-action btn-avaliar" style="width: 100%;">ENVIAR AVALIAÇÃO</button>
      <div id="msgReview" style="margin-top: 15px; text-align: center; font-weight: bold;"></div>
    `;
    
    container.appendChild(formDiv);
    
    document.getElementById("btnEnviarReview").onclick = async () => {
      const btn = document.getElementById("btnEnviarReview");
      const nota = document.getElementById("reviewNota").value;
      const comentario = document.getElementById("reviewTexto").value;
      
      if (isNaN(nota) || nota < 0 || nota > 10) {
        document.getElementById("msgReview").innerHTML = `<span style="color: #ff5555;">A nota deve ser entre 0 e 10!</span>`;
        notaInput.style.border = "1px solid #ff5555"; 
        return;
      }
      
      btn.textContent = "Enviando...";
      btn.disabled = true;
      
      try {
        const resp = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filmeId: filme.id, nota, comentario }),
          credentials: 'include' // cookie de sessao
        });
        
        if (resp.ok) {
          document.getElementById("msgReview").innerHTML = '<span style="color: #00e054;">Sucesso! Voltando...</span>';
          setTimeout(() => renderDetalhes(filme), 1500);
        } else {
          const err = await resp.json();
          document.getElementById("msgReview").innerHTML = `<span style="color: #ff5555;">${err.error}</span>`;
          btn.textContent = "ENVIAR AVALIAÇÃO";
          btn.disabled = false;
        }
      } catch (e) {
        document.getElementById("msgReview").innerHTML = `<span style="color: #ff5555;">Erro de conexão.</span>`;
        btn.textContent = "ENVIAR AVALIAÇÃO";
        btn.disabled = false;
      }
    };
}
/* 
async function abrirFormReview(filme) {
  try {
    const response = await fetch('/api/auth/me');
    const authData = await response.json();
    if (!authData.loggedIn) {
      window.location.href = "/login.html";
      return;
    }
  } catch (e) {
    console.error(e);
    return;
  }

  const container = document.getElementById("detalhesFilme");
  clearNode(container);

  container.appendChild(criarCabecalhoComVoltar(`Avaliar: ${filme.titulo}`, filme));

  const formDiv = document.createElement("div");
  formDiv.innerHTML = `
      <div class="campo" style="margin-bottom: 25px;"> <label>Sua Nota (0 a 10):</label>
        <input type="number" id="reviewNota" min="0" max="10" step="0.1" placeholder="Ex: 10" style="padding: 10px;">
      </div>
      
      <div class="campo" style="margin-bottom: 25px;"> <label>Seu Comentário:</label>
        <textarea id="reviewTexto" rows="5" placeholder="Escreva o que achou..." style="padding: 10px;"></textarea>
      </div>
      
      <button id="btnEnviarReview" class="btn-action btn-avaliar" style="width: 100%;">ENVIAR AVALIAÇÃO</button>
      <div id="msgReview" style="margin-top: 15px; text-align: center; font-weight: bold;"></div>
  `;
  container.appendChild(formDiv);

  document.getElementById("btnEnviarReview").onclick = async () => {
    const btn = document.getElementById("btnEnviarReview");
    const nota = document.getElementById("reviewNota").value;
    const comentario = document.getElementById("reviewTexto").value;

    if (isNaN(nota) || nota < 0 || nota > 10) {
      document.getElementById("msgReview").innerHTML = `<span style="color: #ff5555;">A nota deve ser entre 0 e 10!</span>`;
      notaInput.style.border = "1px solid #ff5555"; // Destaca o erro visualmente
      return; // Para a execução aqui
    }

    btn.textContent = "Enviando...";
    btn.disabled = true;

    try {
      const resp = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filmeId: filme.id, nota, comentario })
      });

      if (resp.ok) {
        document.getElementById("msgReview").innerHTML = '<span style="color: #00e054;">Sucesso! Voltando...</span>';
        setTimeout(() => renderDetalhes(filme), 1500);
      } else {
        const err = await resp.json();
        document.getElementById("msgReview").innerHTML = `<span style="color: #ff5555;">${err.error}</span>`;
        btn.textContent = "ENVIAR AVALIAÇÃO";
        btn.disabled = false;
      }
    } catch (e) {
      document.getElementById("msgReview").innerHTML = `<span style="color: #ff5555;">Erro de conexão.</span>`;
      btn.textContent = "ENVIAR AVALIAÇÃO";
      btn.disabled = false;
    }
  };
}
*/

async function carregarReviews(filme) {
  const container = document.getElementById("detalhesFilme");

  clearNode(container);

  container.appendChild(criarCabecalhoComVoltar(`Reviews: ${filme.titulo}`, filme));

  const contentDiv = document.createElement("div");
  contentDiv.innerHTML = "<p style='color: #99aabb;'>Carregando opiniões...</p>";
  container.appendChild(contentDiv);

  try {
    const dados = await fetchJSON(`/api/reviews/${filme.id}`);
    clearNode(contentDiv);

    if (dados.length === 0) {
      contentDiv.innerHTML = `
        <div style="text-align: center; padding: 40px; opacity: 0.6;">
          <p>Ninguém avaliou este filme/série ainda.</p>
          <p>Seja o primeiro(a)!</p>
        </div>
      `;
      return;
    }

    const lista = document.createElement("ul");
    lista.style.listStyle = "none";
    lista.style.padding = "0";

    dados.forEach(r => {
      const li = document.createElement("li");
      li.style.background = "#1b222a";
      li.style.border = "1px solid #2c3440";
      li.style.padding = "15px";
      li.style.marginBottom = "15px";
      li.style.borderRadius = "6px";


      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #fff; font-size: 0.95rem;">${r.nome_usuario}</strong>
          <span style="color: #00e054; font-weight: bold;">★ ${r.nota}</span>
        </div>
        <p style="font-size: 0.9rem; color: #bcccd6; line-height: 1.5;">${r.comentario || "<i>(Sem comentário)</i>"}</p>
      `;
      lista.appendChild(li);
    });

    contentDiv.appendChild(lista);

  } catch (error) {
    contentDiv.innerHTML = "<p style='color: #ff5555;'>Erro ao carregar reviews.</p>";
  }
}

function renderDetalhes(filme) {
  const div = document.getElementById("detalhesFilme");
  clearNode(div);

  const h2 = document.createElement("h2");
  h2.textContent = filme.titulo;
  h2.style.marginBottom = "15px";
  div.appendChild(h2);

  if (filme.capa && filme.capa !== "N/A") {
    const img = document.createElement("img");
    img.src = filme.capa;
    img.style.maxWidth = "150px";
    img.style.borderRadius = "8px";
    img.style.marginBottom = "15px";
    div.appendChild(img);
  }

  const pInfo = document.createElement("p");
  pInfo.innerHTML = `
    <strong>Ano:</strong> ${filme.ano} <br>
    <strong>Direção:</strong> ${filme.direcao} <br>
    <strong>Gêneros:</strong> ${Array.isArray(filme.generos) ? filme.generos.join(", ") : filme.generos}
  `;
  pInfo.style.lineHeight = "1.8";
  div.appendChild(pInfo);

  const pNota = document.createElement("div");
  pNota.style.margin = "15px 0";
  pNota.innerHTML = `<strong style="color: #00e054; font-size: 1.4rem;">★ ${filme.nota || "N/A"}</strong> <span style="font-size: 0.8rem; color: #99aabb;">(Média Geral)</span>`;
  div.appendChild(pNota);

  const pSinopse = document.createElement("p");
  pSinopse.textContent = filme.sinopse;
  pSinopse.style.fontStyle = "italic";
  pSinopse.style.color = "#bcccd6";
  pSinopse.style.marginBottom = "20px";
  div.appendChild(pSinopse);

  const actionArea = document.createElement("div");
  actionArea.className = "action-area";

  const btnReview = document.createElement("button");
  btnReview.textContent = "Avaliar";
  btnReview.className = "btn-action btn-avaliar";
  btnReview.onclick = () => abrirFormReview(filme);

  const btnVerReviews = document.createElement("button");
  btnVerReviews.textContent = "Ver Reviews";
  btnVerReviews.className = "btn-action btn-ver-reviews";
  btnVerReviews.onclick = () => carregarReviews(filme);

  actionArea.appendChild(btnReview);
  actionArea.appendChild(btnVerReviews);

  div.appendChild(actionArea);
}

async function verificarLogin() {
  const userArea = document.getElementById('userArea');
  if (!userArea) return;

  try {
    const response = await fetch('/api/auth/me');
    const data = await response.json();

    // adicionar hamburguer menu
    if (data.loggedIn) {
      userArea.innerHTML = `
        <div style="display: flex; align-items: center;">
          <button id="btnMenuPerfil" class="btn-menu-perfil" title="Meu Perfil">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <span style="color: #99aabb; font-size: 0.8rem; margin-right: 5px; margin-left: 10px;">
              Olá, <strong style="color: #fff;">${data.user.nome}</strong>
          </span>
          <button id="btnSair" class="btn-sair">Sair</button>
        </div>
            `;

            
      document.getElementById('btnMenuPerfil').onclick = () => {
        window.location.href = '/users';
      };
      
      document.getElementById('btnSair').onclick = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
            window.location.reload();
      };

    } else {
        userArea.innerHTML = `
          <a href="/login.html" class="btn-login">Sign In</a>
          <a href="/cadastro.html" class="btn-create">Create Account</a>
        `;
    }

    } catch (error) {
        console.error("Erro ao verificar sessão:", error);
    }



    /*
    if (data.loggedIn) {
      userArea.innerHTML = `
        <span style="color: #99aabb; font-size: 0.8rem; margin-right: 5px;">
          Olá, <strong style="color: #fff;">${data.user.nome}</strong>
        </span>
        <button id="btnSair" class="btn-sair">Sair</button>
      `;

      
      document.getElementById('btnSair').onclick = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.reload();
      };


    } else {
      userArea.innerHTML = `
        <a href="/login.html" class="btn-login">Sign In</a>
        <a href="/cadastro.html" class="btn-create">Create Account</a>
      `;
    }

  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
  }
    */
}

function renderSobre() {
  const div = document.getElementById("detalhesFilme");
  clearNode(div);

  const h3 = document.createElement("h3");
  h3.textContent = "Sobre o MoviePedia";
  h3.style.marginBottom = "20px";
  h3.style.color = "#00e054";
  h3.style.textTransform = "uppercase";
  h3.style.letterSpacing = "0.05em";
  div.appendChild(h3);

  const p = document.createElement("p");
  p.style.lineHeight = "1.8";
  p.style.fontSize = "0.95rem";
  p.style.color = "#bcccd6";

  p.innerHTML = `
    Este site é uma <strong>wiki de filmes</strong> inspirada visualmente no Letterboxd, projetada para catalogar e explorar obras cinematográficas.
    <br><br>
    O projeto foi desenvolvido pelos alunos <strong>Yuri Bragine</strong> e <strong>Ana Clara Guerra</strong> como parte do Trabalho Final da disciplina de <strong>Desenvolvimento Web</strong>.
    <br><br>
    A disciplina foi ministrada pelo professor <strong>Marcos Ribeiro</strong> na <strong>Universidade Federal de Viçosa (UFV)</strong>, com o objetivo de consolidar conceitos propostos pelo conteúdo didático.
  `;

  div.appendChild(p);

  const footerNote = document.createElement("div");
  footerNote.style.marginTop = "30px";
  footerNote.style.borderTop = "1px solid #445566";
  footerNote.style.paddingTop = "15px";
  footerNote.style.fontSize = "0.8rem";
  footerNote.style.fontStyle = "italic";
  footerNote.textContent = "© 2025 - DPI-CCP/UFV";
  div.appendChild(footerNote);
}

function criarCabecalhoComVoltar(titulo, filme) {
  const headerDiv = document.createElement("div");
  headerDiv.className = "header-detalhes";

  const h3 = document.createElement("h3");
  h3.textContent = titulo;
  h3.style.fontSize = "1.1rem";
  h3.style.margin = "0";

  const btnVoltar = document.createElement("button");
  btnVoltar.className = "btn-back";
  btnVoltar.title = "Voltar aos detalhes";

  btnVoltar.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  `;

  btnVoltar.onclick = () => renderDetalhes(filme);

  headerDiv.appendChild(h3);
  headerDiv.appendChild(btnVoltar);

  return headerDiv;
}

window.addEventListener("DOMContentLoaded", () => {
  carregarLista("/api/filmes");
  conectarWebSocket();
  verificarLogin();
  renderSobre();
  document.getElementById("btnTexto").onclick = () => carregarLista(montarURLFilmes());
  document.getElementById("btnAno").onclick = () => carregarLista(montarURLFilmes());
  document.getElementById("btnGenero").onclick = () => carregarLista(montarURLFilmes());
  document.getElementById("btnBuscarOnline").onclick = buscarFilmeOnline;
  document.getElementById("btnLimpar").onclick = () => {
    document.getElementById("filtroTexto").value = "";
    document.getElementById("filtroAno").value = "";
    document.getElementById("filtroGenero").value = "";
    carregarLista("/api/filmes");
  };
  document.getElementById("btnBuscarOnline").onclick = buscarFilmeOnline;
});
