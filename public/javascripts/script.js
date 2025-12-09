
function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

async function fetchJSON(url) {
  try {
    const response = await fetch(url);
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

function configurarFormulario() {
  const form = document.getElementById("formFilme");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("Enviando filme...");

    const titulo = document.getElementById("titulo").value;
    const ano = document.getElementById("ano").value;
    const direcao = document.getElementById("direcao").value;
    const generos = document.getElementById("generos").value;
    const nota = document.getElementById("nota").value;
    const sinopse = document.getElementById("sinopse").value;

    const payload = {
      titulo: titulo,
      ano: parseInt(ano),
      direcao: direcao,
      generos: generos.split('|').map(s => s.trim()).filter(Boolean),
      nota: nota ? parseFloat(nota) : null,
      sinopse: sinopse
    };

    try {
      const response = await fetch('/api/filmes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Erro ao salvar");
      }

      setStatus("Filme enviado. Aguardando atualização...");
      form.reset();
    } catch (e) {
      setStatus("Erro: " + e.message);
    }
  });
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

    document.getElementById("formFilme").reset();

    setStatus(`Filme "${dados.titulo}" encontrado e salvo no catálogo!`);

  } catch (error) {
    setStatus("Erro na busca: " + error.message);
    const div = document.getElementById("detalhesFilme");
    clearNode(div);
    div.innerHTML = `<p style="color: #ff5555; padding: 10px;">${error.message}</p>`;
  }
}


window.addEventListener("DOMContentLoaded", () => {
  carregarLista("/api/filmes");

  configurarFormulario();
  conectarWebSocket();

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
});
