function renderHomeActions() {
  const container = document.getElementById("acoesInicio");

  if (!container) return;

  if (getToken()) {
    container.innerHTML = `
      <a class="btn btn-primary" href="nova.html">Criar ocorrencia</a>
      <a class="btn btn-outline-primary" href="lista.html">Ver todas as ocorrencias</a>
    `;
  } else {
    container.innerHTML = `
      <a class="btn btn-primary" href="login.html">Login</a>
      <a class="btn btn-outline-primary" href="registo.html">Registo</a>
      <a class="btn btn-outline-secondary" href="lista.html">Ver ocorrencias</a>
    `;
  }
}

function renderRecentCard(ocorrencia) {
  return `
    <div class="col-12 col-md-6 col-xl-4">
      <article class="border rounded p-3 h-100">
        <div class="d-flex justify-content-between gap-2">
          <h3 class="h5 mb-1">${escapeHtml(ocorrencia.tipo)}</h3>
          <span class="badge text-bg-secondary align-self-start">${escapeHtml(ocorrencia.prioridade)}</span>
        </div>
        <p class="mb-1"><strong>Local:</strong> ${escapeHtml(formatLocalizacao(ocorrencia.localizacao))}</p>
        <p class="mb-1"><strong>Data:</strong> ${escapeHtml(formatDate(getOccurrenceDate(ocorrencia)))}</p>
        <p class="mb-3"><strong>Criada por:</strong> ${escapeHtml(ocorrencia.utilizadorNome || "Utilizador desconhecido")}</p>
        <a class="btn btn-sm btn-outline-primary" href="detalhe.html?id=${encodeURIComponent(ocorrencia.id)}">Ver detalhes</a>
      </article>
    </div>
  `;
}

async function loadRecentes() {
  const container = document.getElementById("recentes");
  const msg = document.getElementById("msg");

  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/ocorrencias/recentes`);
    const ocorrencias = await parseJsonResponse(res);

    container.innerHTML = "";

    if (ocorrencias.length === 0) {
      msg.innerText = "Ainda nao existem ocorrencias recentes.";
      return;
    }

    container.innerHTML = ocorrencias.map(renderRecentCard).join("");
  } catch (error) {
    msg.className = "text-danger";
    msg.innerText = error.message || "Erro ao carregar ocorrencias recentes";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderHomeActions();
  loadRecentes();
});
