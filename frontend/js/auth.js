document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const erro = document.getElementById("erro");
  erro.innerText = "";

  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await parseJsonResponse(res);
    localStorage.setItem("token", data.token);

    window.location.href = "lista.html";
  } catch (error) {
    erro.innerText = error.message || "Login invalido";
  }
});
