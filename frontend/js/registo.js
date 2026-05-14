document.getElementById("registoForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("msg");
  msg.innerText = "";

  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    await parseJsonResponse(res);

    msg.className = "text-success";
    msg.innerText = "Conta criada. A redirecionar para login...";
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  } catch (error) {
    msg.className = "text-danger";
    msg.innerText = error.message || "Erro ao registar";
  }
});
