document.getElementById("registoForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(API_URL + "/register", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const msg = document.getElementById("msg");

  if (!res.ok) {
    msg.innerText = "Erro ao registar";
    return;
  }

  msg.innerText = "Conta criada!";
  setTimeout(() => window.location.href = "login.html", 1500);
});