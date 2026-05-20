const token = getToken();
const form = document.getElementById("form");
const msg = document.getElementById("msg");
let mapaCriacao = null;
let marcadorCriacao = null;

const PORTUGAL_CENTER = [39.5, -8.0];

function setMessage(text, className = "text-danger mt-3") {
  msg.className = className;
  msg.innerText = text;
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

async function selecionarLocalizacao(lat, lng) {
  document.getElementById("latitude").value = lat;
  document.getElementById("longitude").value = lng;
  document.getElementById("localizacaoTextoVisivel").innerText = "A obter localização...";

  if (!marcadorCriacao) {
    marcadorCriacao = L.marker([lat, lng]).addTo(mapaCriacao);
  } else {
    marcadorCriacao.setLatLng([lat, lng]);
  }

  const texto = await reverseGeocode(lat, lng);
  document.getElementById("localizacaoTexto").value = texto;
  document.getElementById("localizacaoTextoVisivel").innerText = texto;
}

function initMapaCriacao() {
  if (typeof L === "undefined" || mapaCriacao) return;

  mapaCriacao = L.map("mapaCriacao").setView(PORTUGAL_CENTER, 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(mapaCriacao);

  mapaCriacao.on("click", (event) => {
    selecionarLocalizacao(event.latlng.lat, event.latlng.lng);
  });
}

if (!token) {
  form.innerHTML = `
    <p class="alert alert-warning">Faz login para criar ocorrencias.</p>
    <a class="btn btn-primary" href="login.html">Login</a>
  `;
} else {
  document.addEventListener("DOMContentLoaded", initMapaCriacao);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "mt-3";
    msg.innerText = "";

    const tipo = document.getElementById("tipo").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const prioridade = document.getElementById("prioridade").value;
    const latitude = document.getElementById("latitude").value;
    const longitude = document.getElementById("longitude").value;
    const localizacaoTexto = document.getElementById("localizacaoTexto").value;

    if (!latitude || !longitude) {
      setMessage("Selecione a localização da ocorrência no mapa.");
      return;
    }

    if (!tipo || !descricao || !prioridade) {
      setMessage("Preenche tipo, descrição e prioridade.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("tipo", tipo);
      formData.append("descricao", descricao);
      formData.append("prioridade", prioridade);
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);
      formData.append("localizacaoTexto", localizacaoTexto || `Latitude: ${latitude}, Longitude: ${longitude}`);

      const imagem = document.getElementById("imagem");
      if (imagem.files.length > 0) {
        formData.append("imagem", imagem.files[0]);
      }

      const res = await fetch(`${API_URL}/ocorrencias`, {
        method: "POST",
        headers: getHeaders(),
        body: formData,
      });

      const ocorrencia = await parseJsonResponse(res);
      setMessage("Ocorrencia criada.", "text-success mt-3");
      form.reset();
      document.getElementById("localizacaoTextoVisivel").innerText = "Clique no mapa para selecionar a localização.";
      document.getElementById("localizacaoTexto").value = "";
      if (marcadorCriacao) {
        mapaCriacao.removeLayer(marcadorCriacao);
        marcadorCriacao = null;
      }

      setTimeout(() => {
        window.location.href = `detalhe.html?id=${ocorrencia.id}`;
      }, 700);
    } catch (error) {
      setMessage(error.message || "Erro ao criar ocorrencia");
    }
  });
}
