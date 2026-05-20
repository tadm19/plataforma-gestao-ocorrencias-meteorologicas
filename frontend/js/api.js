const API_URL = "https://ocorrencias-backend-eah6dbh0fjh0chh8.francecentral-01.azurewebsites.net";

function getToken() {
  return localStorage.getItem("token");
}

function getHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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

function renderAuth() {
  const token = getToken();
  const div = document.getElementById("auth");

  if (!div) return;

  if (token) {
    div.innerHTML = `
      <a class="btn btn-outline-primary btn-sm" href="index.html">Nova ocorrencia</a>
      <a class="btn btn-outline-secondary btn-sm" href="lista.html">Ocorrencias</a>
      <button class="btn btn-outline-danger btn-sm" type="button" onclick="logout()">Logout</button>
    `;
  } else {
    div.innerHTML = `
      <a class="btn btn-outline-secondary btn-sm" href="lista.html">Ocorrencias</a>
      <a class="btn btn-primary btn-sm" href="login.html">Login</a>
      <a class="btn btn-outline-primary btn-sm" href="registo.html">Registo</a>
    `;
  }
}

document.addEventListener("DOMContentLoaded", renderAuth);
