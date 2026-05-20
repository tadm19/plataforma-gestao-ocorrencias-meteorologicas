const API_URL = "https://ocorrencias-backend-eah6dbh0fjh0chh8.francecentral-01.azurewebsites.net";

function getToken() {
  return localStorage.getItem("token");
}

function getHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getCurrentUser() {
  const token = getToken();

  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalizedPayload)
        .split("")
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );

    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.erro || "Pedido falhou");
  }

  return data;
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "lista.html";
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

function formatLocalizacao(localizacao) {
  if (!localizacao) return "Localização não disponível";
  if (typeof localizacao === "string") return localizacao;
  return localizacao.texto || localizacao.cidade || "Localização não disponível";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-PT");
}

function getOccurrenceDate(ocorrencia) {
  return ocorrencia.createdAt || ocorrencia.updatedAt || ocorrencia.dataHora || ocorrencia.dataCriacao || "";
}

function renderAuth() {
  const token = getToken();
  const div = document.getElementById("auth");

  if (!div) return;

  if (token) {
    div.innerHTML = `
      <a class="btn btn-outline-secondary btn-sm" href="index.html">Inicio</a>
      <a class="btn btn-outline-primary btn-sm" href="nova.html">Nova ocorrencia</a>
      <a class="btn btn-outline-secondary btn-sm" href="lista.html">Ocorrencias</a>
      <button class="btn btn-outline-danger btn-sm" type="button" onclick="logout()">Logout</button>
    `;
  } else {
    div.innerHTML = `
      <a class="btn btn-outline-secondary btn-sm" href="index.html">Inicio</a>
      <a class="btn btn-outline-secondary btn-sm" href="lista.html">Ocorrencias</a>
      <a class="btn btn-primary btn-sm" href="login.html">Login</a>
      <a class="btn btn-outline-primary btn-sm" href="registo.html">Registo</a>
    `;
  }
}

document.addEventListener("DOMContentLoaded", renderAuth);
