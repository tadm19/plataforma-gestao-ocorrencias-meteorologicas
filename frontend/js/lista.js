let ocorrenciasCarregadas = [];

function getLocalizacaoTexto(ocorrencia) {
  return formatLocalizacao(ocorrencia.localizacao);
}

function getDateKey(ocorrencia) {
  const value = getOccurrenceDate(ocorrencia);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function getFiltros() {
  return {
    tipo: document.getElementById("filtroTipo").value.trim().toLowerCase(),
    cidade: document.getElementById("filtroCidade").value.trim().toLowerCase(),
    data: document.getElementById("filtroData").value,
  };
}

function filtrarOcorrencias(ocorrencias) {
  const filtros = getFiltros();

  return ocorrencias.filter((ocorrencia) => {
    const tipo = String(ocorrencia.tipo || "").toLowerCase();
    const localizacao = getLocalizacaoTexto(ocorrencia).toLowerCase();
    const data = getDateKey(ocorrencia);

    if (filtros.tipo && !tipo.includes(filtros.tipo)) return false;
    if (filtros.cidade && !localizacao.includes(filtros.cidade)) return false;
    if (filtros.data && data !== filtros.data) return false;

    return true;
  });
}

function ordenarOcorrencias(ocorrencias) {
  return [...ocorrencias].sort((a, b) => {
    const dateA = Date.parse(getOccurrenceDate(a)) || 0;
    const dateB = Date.parse(getOccurrenceDate(b)) || 0;
    return dateB - dateA;
  });
}

function renderTabela(ocorrencias) {
  const tabela = document.getElementById("tabela");
  const msg = document.getElementById("msg");
  const ordenadas = ordenarOcorrencias(ocorrencias);

  tabela.innerHTML = "";
  msg.className = "mt-3";
  msg.innerText = "";

  if (ordenadas.length === 0) {
    msg.innerText = "Nenhuma ocorrencia encontrada.";
    return;
  }

  ordenadas.forEach((o) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(o.tipo)}</td>
      <td>${escapeHtml(o.descricao)}</td>
      <td>${escapeHtml(getLocalizacaoTexto(o))}</td>
      <td>${escapeHtml(o.prioridade)}</td>
      <td>${escapeHtml(o.utilizadorNome || "Utilizador desconhecido")}</td>
      <td>${escapeHtml(formatDate(getOccurrenceDate(o)))}</td>
      <td><a class="btn btn-sm btn-outline-primary" href="detalhe.html?id=${encodeURIComponent(o.id)}">Ver</a></td>
    `;
    tabela.appendChild(row);
  });
}

function aplicarFiltros() {
  renderTabela(filtrarOcorrencias(ocorrenciasCarregadas));
}

function limparFiltros() {
  document.getElementById("filtroTipo").value = "";
  document.getElementById("filtroCidade").value = "";
  document.getElementById("filtroData").value = "";
  renderTabela(ocorrenciasCarregadas);
}

async function carregarOcorrencias() {
  const msg = document.getElementById("msg");

  try {
    const res = await fetch(`${API_URL}/ocorrencias`);
    const data = await parseJsonResponse(res);
    ocorrenciasCarregadas = Array.isArray(data) ? data : [];

    if (ocorrenciasCarregadas.length === 0) {
      msg.innerText = "Ainda nao existem ocorrencias registadas.";
      renderTabela([]);
      return;
    }

    renderTabela(ocorrenciasCarregadas);
  } catch (error) {
    msg.className = "text-danger";
    msg.innerText = error.message || "Erro ao carregar ocorrencias";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnFiltrar").addEventListener("click", aplicarFiltros);
  document.getElementById("btnLimparFiltros").addEventListener("click", limparFiltros);
  carregarOcorrencias();
});
