const API_URL = "https://backend.azurewebsites.net";

function getHeaders() {
  return {
    "Authorization": "Bearer " + localStorage.getItem("token")
  };
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

function renderAuth() {
  const token = localStorage.getItem("token");
  const div = document.getElementById("auth");

  if (!div) return;

  if (token) {
    div.innerHTML = `<button onclick="logout()">Logout</button>`;
  } else {
    div.innerHTML = `
      <a href="login.html">Login</a> |
      <a href="registo.html">Registo</a>
    `;
  }
}

renderAuth();