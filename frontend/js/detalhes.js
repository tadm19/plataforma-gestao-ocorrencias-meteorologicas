const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const token = getToken();

function formatLocalizacao(localizacao) {
  if (!localizacao) return "Desconhecida";
  if (typeof localizacao === "string") return localizacao;
  return localizacao.cidade || JSON.stringify(localizacao);
}

function normalizeSelectValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

function renderDetalhe(o) {
  const imagens = Array.isArray(o.fotos) ? o.fotos : o.imagemUrl ? [o.imagemUrl] : [];
  const imageHtml = imagens.length
    ? `<img class="img-fluid rounded border mt-3" src="${escapeHtml(imagens[0])}" alt="Imagem da ocorrencia">`
    : `<p class="text-muted">Sem imagem associada.</p>`;

  document.getElementById("detalhe").innerHTML = `
    <dl class="row">
      <dt class="col-sm-3">Tipo</dt><dd class="col-sm-9">${escapeHtml(o.tipo)}</dd>
      <dt class="col-sm-3">Descricao</dt><dd class="col-sm-9">${escapeHtml(o.descricao)}</dd>
      <dt class="col-sm-3">Localizacao</dt><dd class="col-sm-9">${escapeHtml(formatLocalizacao(o.localizacao))}</dd>
      <dt class="col-sm-3">Prioridade</dt><dd class="col-sm-9">${escapeHtml(o.prioridade)}</dd>
      <dt class="col-sm-3">Estado</dt><dd class="col-sm-9">${escapeHtml(o.estado)}</dd>
    </dl>
    ${imageHtml}
  `;

  document.getElementById("tipo").value = o.tipo || "";
  document.getElementById("descricao").value = o.descricao || "";
  document.getElementById("localizacao").value = formatLocalizacao(o.localizacao);
  document.getElementById("prioridade").value = normalizeSelectValue(o.prioridade) || "media";
  document.getElementById("estado").value = normalizeSelectValue(o.estado) || "pendente";
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
    const body = new FormData();
    body.append("tipo", document.getElementById("tipo").value);
    body.append("descricao", document.getElementById("descricao").value);
    body.append("localizacao", document.getElementById("localizacao").value);
    body.append("prioridade", document.getElementById("prioridade").value);
    body.append("estado", document.getElementById("estado").value);

    const imagem = document.getElementById("imagem");
    if (imagem.files.length > 0) {
      body.append("imagem", imagem.files[0]);
    }

    const res = await fetch(`${API_URL}/ocorrencias/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body,
    });

    const ocorrencia = await parseJsonResponse(res);
    renderDetalhe(ocorrencia);
    document.getElementById("imagem").value = "";
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
