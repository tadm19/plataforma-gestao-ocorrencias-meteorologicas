function formatLocalizacao(localizacao) {
  if (!localizacao) return "Desconhecida";
  if (typeof localizacao === "string") return localizacao;
  return localizacao.cidade || JSON.stringify(localizacao);
}

function escapeHtml(value) {
  return String(value ?? "-").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

(async () => {
  const tabela = document.getElementById("tabela");
  const msg = document.getElementById("msg");

  try {
    const res = await fetch(`${API_URL}/ocorrencias`);
    const data = await parseJsonResponse(res);

    tabela.innerHTML = "";

    if (data.length === 0) {
      msg.innerText = "Ainda nao existem ocorrencias registadas.";
      return;
    }

    data.forEach((o) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(o.tipo)}</td>
        <td>${escapeHtml(o.descricao)}</td>
        <td>${escapeHtml(formatLocalizacao(o.localizacao))}</td>
        <td>${escapeHtml(o.prioridade)}</td>
        <td>${escapeHtml(o.estado)}</td>
        <td><a class="btn btn-sm btn-outline-primary" href="detalhe.html?id=${encodeURIComponent(o.id)}">Ver</a></td>
      `;
      tabela.appendChild(row);
    });
  } catch (error) {
    msg.className = "text-danger";
    msg.innerText = error.message || "Erro ao carregar ocorrencias";
  }
})();
