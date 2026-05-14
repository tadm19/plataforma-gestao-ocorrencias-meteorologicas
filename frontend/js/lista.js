function formatLocalizacao(localizacao) {
  if (!localizacao) return "Desconhecida";
  if (typeof localizacao === "string") return localizacao;
  return localizacao.cidade || JSON.stringify(localizacao);
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
        <td>${o.tipo || "-"}</td>
        <td>${o.descricao || "-"}</td>
        <td>${formatLocalizacao(o.localizacao)}</td>
        <td>${o.prioridade || "-"}</td>
        <td>${o.estado || "-"}</td>
        <td><a class="btn btn-sm btn-outline-primary" href="detalhe.html?id=${o.id}">Ver</a></td>
      `;
      tabela.appendChild(row);
    });
  } catch (error) {
    msg.className = "text-danger";
    msg.innerText = error.message || "Erro ao carregar ocorrencias";
  }
})();
