document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(API_URL + "/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    document.getElementById("erro").innerText = "Login inválido";
    return;
  }

  const data = await res.json();
  localStorage.setItem("token", data.token);

  window.location.href = "index.html";
});