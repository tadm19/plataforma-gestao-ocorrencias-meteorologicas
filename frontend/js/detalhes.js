const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const token = getToken();
let ocorrenciaAtual = null;
let mapa = null;
let mapaEdicao = null;
let marcadorEdicao = null;

const PORTUGAL_CENTER = [39.5, -8.0];

function canManageOccurrence(ocorrencia) {
  const user = getCurrentUser();

  if (!user || !ocorrencia) return false;

  return user.tipo === "admin" || ocorrencia.utilizadorId === user.id;
}

function formatLocalizacao(localizacao) {
  if (!localizacao) return "Localização não disponível";
  if (typeof localizacao === "string") return localizacao;
  return localizacao.texto || localizacao.cidade || "Localização não disponível";
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

function getCoordinates(ocorrencia) {
  const localizacao = ocorrencia?.localizacao;
  const lat = ocorrencia?.latitude
    ?? localizacao?.latitude
    ?? localizacao?.lat
    ?? localizacao?.coordenadas?.lat;
  const lng = ocorrencia?.longitude
    ?? localizacao?.longitude
    ?? localizacao?.lng
    ?? localizacao?.coordenadas?.lng;
  const latNumber = Number(lat);
  const lngNumber = Number(lng);

  if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) return null;
  if (latNumber < -90 || latNumber > 90 || lngNumber < -180 || lngNumber > 180) return null;

  return { lat: latNumber, lng: lngNumber };
}

function extractCidade(address = {}) {
  return address.city
    || address.town
    || address.village
    || address.municipality
    || address.county
    || "";
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    const cidade = extractCidade(data.address);
    return data.display_name || cidade || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch (error) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

function renderMapa(ocorrencia) {
  const mapaDiv = document.getElementById("mapaOcorrencia");
  const fallback = document.getElementById("mapaFallback");
  const coordinates = getCoordinates(ocorrencia);

  if (!coordinates || typeof L === "undefined") {
    mapaDiv.style.display = "none";
    fallback.innerText = "Localização exata não disponível.";
    if (mapa) {
      mapa.remove();
      mapa = null;
    }
    return;
  }

  mapaDiv.style.display = "";
  fallback.innerText = "";

  if (mapa) {
    mapa.remove();
  }

  mapa = L.map("mapaOcorrencia").setView([coordinates.lat, coordinates.lng], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(mapa);
  L.marker([coordinates.lat, coordinates.lng]).addTo(mapa);
}

async function selecionarLocalizacaoEdicao(lat, lng) {
  document.getElementById("latitude").value = lat;
  document.getElementById("longitude").value = lng;
  document.getElementById("localizacaoEdicaoTexto").innerText = "A obter localização...";

  if (!marcadorEdicao) {
    marcadorEdicao = L.marker([lat, lng]).addTo(mapaEdicao);
  } else {
    marcadorEdicao.setLatLng([lat, lng]);
  }

  const texto = await reverseGeocode(lat, lng);
  document.getElementById("localizacaoTexto").value = texto;
  document.getElementById("localizacaoEdicaoTexto").innerText = texto;
}

function renderMapaEdicao(ocorrencia) {
  if (typeof L === "undefined") return;

  const coordinates = getCoordinates(ocorrencia);
  const center = coordinates ? [coordinates.lat, coordinates.lng] : PORTUGAL_CENTER;
  const zoom = coordinates ? 13 : 6;

  if (!mapaEdicao) {
    mapaEdicao = L.map("mapaEdicao").setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(mapaEdicao);
    mapaEdicao.on("click", (event) => {
      selecionarLocalizacaoEdicao(event.latlng.lat, event.latlng.lng);
    });
  } else {
    mapaEdicao.setView(center, zoom);
  }

  if (marcadorEdicao) {
    mapaEdicao.removeLayer(marcadorEdicao);
    marcadorEdicao = null;
  }

  if (coordinates) {
    marcadorEdicao = L.marker(center).addTo(mapaEdicao);
  }

  setTimeout(() => mapaEdicao.invalidateSize(), 0);
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
      <dt class="col-sm-3">Criada por</dt><dd class="col-sm-9">${escapeHtml(o.utilizadorNome || "Utilizador desconhecido")}</dd>
      <dt class="col-sm-3">Data</dt><dd class="col-sm-9">${escapeHtml(formatDate(getOccurrenceDate(o)))}</dd>
    </dl>
    ${imageHtml}
  `;

  document.getElementById("tipo").value = o.tipo || "";
  document.getElementById("descricao").value = o.descricao || "";
  document.getElementById("prioridade").value = normalizeSelectValue(o.prioridade) || "media";
  document.getElementById("estado").value = normalizeSelectValue(o.estado) || "pendente";
  const coordinates = getCoordinates(o);
  document.getElementById("latitude").value = coordinates ? coordinates.lat : "";
  document.getElementById("longitude").value = coordinates ? coordinates.lng : "";
  document.getElementById("localizacaoTexto").value = formatLocalizacao(o.localizacao);
  document.getElementById("localizacaoEdicaoTexto").innerText = coordinates
    ? formatLocalizacao(o.localizacao)
    : "Clique no mapa para alterar a localização.";
  const canEdit = canManageOccurrence(o);
  document.getElementById("areaEdicao").style.display = canEdit ? "" : "none";
  renderMapa(o);
  if (canEdit) renderMapaEdicao(o);
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
    ocorrenciaAtual = ocorrencia;
    renderDetalhe(ocorrencia);
  } catch (error) {
    msg.className = "text-danger";
    msg.innerText = error.message || "Erro ao carregar detalhe";
  }
}

async function atualizar() {
  const msg = document.getElementById("msg");
  msg.innerText = "";

  if (!canManageOccurrence(ocorrenciaAtual)) {
    msg.className = "text-danger";
    msg.innerText = "Nao tens permissao para atualizar esta ocorrencia.";
    return;
  }

  try {
    const body = new FormData();
    body.append("tipo", document.getElementById("tipo").value);
    body.append("descricao", document.getElementById("descricao").value);
    body.append("prioridade", document.getElementById("prioridade").value);
    body.append("estado", document.getElementById("estado").value);

    const latitude = document.getElementById("latitude").value.trim();
    const longitude = document.getElementById("longitude").value.trim();
    const localizacaoTexto = document.getElementById("localizacaoTexto").value.trim();

    if (latitude && longitude) {
      body.append("latitude", latitude);
      body.append("longitude", longitude);
      body.append("localizacaoTexto", localizacaoTexto || `${latitude}, ${longitude}`);
    }

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
    ocorrenciaAtual = ocorrencia;
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

  if (!canManageOccurrence(ocorrenciaAtual)) {
    msg.className = "text-danger";
    msg.innerText = "Nao tens permissao para apagar esta ocorrencia.";
    return;
  }

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
  areaEdicao.style.display = "none";

  document.getElementById("btnAtualizar").addEventListener("click", atualizar);
  document.getElementById("btnApagar").addEventListener("click", apagar);
  carregar();
});
