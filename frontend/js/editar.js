const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const form = document.getElementById("formEditar");
const msg = document.getElementById("msg");
let ocorrenciaAtual = null;
let mapaEdicao = null;
let marcadorEdicao = null;

const PORTUGAL_CENTER = [39.5, -8.0];

function canManageOccurrence(ocorrencia) {
  const user = getCurrentUser();

  if (!user || !ocorrencia) return false;

  return user.tipo === "admin" || ocorrencia.utilizadorId === user.id;
}

function normalizeSelectValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
    return data.display_name || cidade || `Latitude: ${lat.toFixed(5)}, Longitude: ${lng.toFixed(5)}`;
  } catch (error) {
    return `Latitude: ${lat.toFixed(5)}, Longitude: ${lng.toFixed(5)}`;
  }
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

  mapaEdicao = L.map("mapaEdicao").setView(center, zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(mapaEdicao);
  mapaEdicao.on("click", (event) => {
    selecionarLocalizacaoEdicao(event.latlng.lat, event.latlng.lng);
  });

  if (coordinates) {
    marcadorEdicao = L.marker(center).addTo(mapaEdicao);
  }

  setTimeout(() => mapaEdicao.invalidateSize(), 0);
}

function preencherFormulario(ocorrencia) {
  document.getElementById("tipo").value = ocorrencia.tipo || "";
  document.getElementById("descricao").value = ocorrencia.descricao || "";
  document.getElementById("prioridade").value = normalizeSelectValue(ocorrencia.prioridade) || "media";
  document.getElementById("estado").value = normalizeSelectValue(ocorrencia.estado) || "pendente";

  const coordinates = getCoordinates(ocorrencia);
  document.getElementById("latitude").value = coordinates ? coordinates.lat : "";
  document.getElementById("longitude").value = coordinates ? coordinates.lng : "";
  document.getElementById("localizacaoTexto").value = formatLocalizacao(ocorrencia.localizacao);
  document.getElementById("localizacaoEdicaoTexto").innerText = coordinates
    ? formatLocalizacao(ocorrencia.localizacao)
    : "Clique no mapa para alterar a localização.";

  document.getElementById("btnCancelar").href = `detalhe.html?id=${encodeURIComponent(ocorrencia.id)}`;
  form.style.display = "";
  renderMapaEdicao(ocorrencia);
}

async function carregar() {
  if (!id) {
    msg.className = "text-danger";
    msg.innerText = "ID da ocorrencia em falta.";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/ocorrencias/${id}`);
    const ocorrencia = await parseJsonResponse(res);
    ocorrenciaAtual = ocorrencia;

    if (!canManageOccurrence(ocorrencia)) {
      msg.className = "text-danger";
      msg.innerText = "Não tem permissões para editar esta ocorrência.";
      return;
    }

    preencherFormulario(ocorrencia);
  } catch (error) {
    msg.className = "text-danger";
    msg.innerText = error.message || "Erro ao carregar ocorrencia";
  }
}

async function guardar(e) {
  e.preventDefault();
  msg.innerText = "";

  if (!canManageOccurrence(ocorrenciaAtual)) {
    msg.className = "text-danger";
    msg.innerText = "Não tem permissões para editar esta ocorrência.";
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
      body.append("localizacaoTexto", localizacaoTexto || `Latitude: ${latitude}, Longitude: ${longitude}`);
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

    await parseJsonResponse(res);
    window.location.href = `detalhe.html?id=${encodeURIComponent(id)}`;
  } catch (error) {
    msg.className = "text-danger";
    msg.innerText = error.message || "Erro ao atualizar ocorrencia";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  form.addEventListener("submit", guardar);
  carregar();
});
