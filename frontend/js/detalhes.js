const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const token = getToken();

function formatLocalizacao(localizacao) {
  if (!localizacao) return "Desconhecida";
  if (typeof localizacao === "string") return localizacao;
  return localizacao.cidade || JSON.stringify(localizacao);
}

function renderDetalhe(o) {
  const imagens = Array.isArray(o.fotos) ? o.fotos : o.imagemUrl ? [o.imagemUrl] : [];
  const imageHtml = imagens.length
    ? `<img class="img-fluid rounded border mt-3" src="${imagens[0]}" alt="Imagem da ocorrencia">`
    : `<p class="text-muted">Sem imagem associada.</p>`;

  document.getElementById("detalhe").innerHTML = `
    <dl class="row">
      <dt class="col-sm-3">Tipo</dt><dd class="col-sm-9">${o.tipo || "-"}</dd>
      <dt class="col-sm-3">Descricao</dt><dd class="col-sm-9">${o.descricao || "-"}</dd>
      <dt class="col-sm-3">Localizacao</dt><dd class="col-sm-9">${formatLocalizacao(o.localizacao)}</dd>
      <dt class="col-sm-3">Prioridade</dt><dd class="col-sm-9">${o.prioridade || "-"}</dd>
      <dt class="col-sm-3">Estado</dt><dd class="col-sm-9">${o.estado || "-"}</dd>
    </dl>
    ${imageHtml}
  `;

  document.getElementById("tipo").value = o.tipo || "";
  document.getElementById("descricao").value = o.descricao || "";
  document.getElementById("localizacao").value = formatLocalizacao(o.localizacao);
  document.getElementById("prioridade").value = o.prioridade || "media";
  document.getElementById("estado").value = o.estado || "pendente";
}

async function carregar() {
  const msg = document.getElementById("msg");

  if (!id) {
    msg.className = "text-danger";
    msg.innerText = "ID da ocorrencia em falta.";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/ocorrencias/${id}`);
    const ocorrencia = await parseJsonResponse(res);
    renderDetalhe(ocorrencia);
  } catch (error) {
    msg.className = "text-danger";
    msg.innerText = error.message || "Erro ao carregar detalhe";
  }
}

async function atualizar() {
  const msg = document.getElementById("msg");
  msg.innerText = "";

  try {
    const body = {
      tipo: document.getElementById("tipo").value,
      descricao: document.getElementById("descricao").value,
      localizacao: document.getElementById("localizacao").value,
      prioridade: document.getElementById("prioridade").value,
      estado: document.getElementById("estado").value,
    };

    const res = await fetch(`${API_URL}/ocorrencias/${id}`, {
      method: "PUT",
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const ocorrencia = await parseJsonResponse(res);
    renderDetalhe(ocorrencia);
    msg.className = "text-success";
    msg.innerText = "Ocorrencia atualizada.";
  } catch (error) {
    msg.className = "text-danger";
    msg.innerText = error.message || "Erro ao atualizar ocorrencia";
  }
}

async function apagar() {
  const msg = document.getElementById("msg");
  msg.innerText = "";

  try {
    const res = await fetch(`${API_URL}/ocorrencias/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    await parseJsonResponse(res);
    window.location.href = "lista.html";
  } catch (error) {
    msg.className = "text-danger";
    msg.innerText = error.message || "Erro ao apagar ocorrencia";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const areaEdicao = document.getElementById("areaEdicao");

  if (!token) {
    areaEdicao.style.display = "none";
  }

  document.getElementById("btnAtualizar").addEventListener("click", atualizar);
  document.getElementById("btnApagar").addEventListener("click", apagar);
  carregar();
});
