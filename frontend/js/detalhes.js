const params = new URLSearchParams(window.location.search);
const id = params.get("id");
let ocorrenciaAtual = null;
let mapa = null;

function canManageOccurrence(ocorrencia) {
  const user = getCurrentUser();

  if (!user || !ocorrencia) return false;

  return user.tipo === "admin" || ocorrencia.utilizadorId === user.id;
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
  setTimeout(() => mapa.invalidateSize(), 0);
}

function renderDetalhe(o) {
  const imagens = Array.isArray(o.fotos) ? o.fotos : o.imagemUrl ? [o.imagemUrl] : [];
  const mediaDetalhe = document.getElementById("mediaDetalhe");
  const fotoDetalhe = document.getElementById("fotoDetalhe");

  if (imagens.length) {
    mediaDetalhe.classList.remove("sem-foto");
    fotoDetalhe.style.display = "";
    fotoDetalhe.innerHTML = `
      <img class="border" src="${escapeHtml(imagens[0])}" alt="Imagem da ocorrencia">
    `;
  } else {
    mediaDetalhe.classList.add("sem-foto");
    fotoDetalhe.style.display = "none";
    fotoDetalhe.innerHTML = "";
  }

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
  `;

  const areaAcoes = document.getElementById("areaAcoes");
  const btnEditar = document.getElementById("btnEditar");

  if (canManageOccurrence(o)) {
    areaAcoes.style.display = "";
    btnEditar.href = `editar.html?id=${encodeURIComponent(o.id)}`;
  } else {
    areaAcoes.style.display = "none";
  }

  renderMapa(o);
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
  document.getElementById("btnApagar").addEventListener("click", apagar);
  carregar();
});
