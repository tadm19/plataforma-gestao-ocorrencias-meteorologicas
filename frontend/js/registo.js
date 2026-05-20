function getFieldValue(id) {
  return document.getElementById(id).value.trim();
}

function normalizeTelefone(telefone) {
  return telefone.replace(/\s+/g, "");
}

function validarRegisto({ nome, email, password, confirmarPassword, idade, telefone, cidade }) {
  if (!nome || !email || !password || !confirmarPassword || !idade || !telefone || !cidade) {
    return "Preenche todos os campos.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Introduz um email valido.";
  }

  if (password.length < 6) {
    return "A password deve ter pelo menos 6 caracteres.";
  }

  if (password !== confirmarPassword) {
    return "As passwords nao coincidem.";
  }

  const idadeNumero = Number(idade);
  if (!Number.isInteger(idadeNumero) || idadeNumero < 1 || idadeNumero > 120) {
    return "Introduz uma idade valida.";
  }

  if (!/^[29]\d{8}$/.test(normalizeTelefone(telefone))) {
    return "Introduz um telefone valido com 9 digitos.";
  }

  return null;
}

document.getElementById("registoForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("msg");
  msg.className = "mt-3";
  msg.innerText = "";

  const form = {
    nome: getFieldValue("nome"),
    email: getFieldValue("email").toLowerCase(),
    password: document.getElementById("password").value,
    confirmarPassword: document.getElementById("confirmarPassword").value,
    idade: getFieldValue("idade"),
    telefone: normalizeTelefone(getFieldValue("telefone")),
    cidade: getFieldValue("cidade"),
  };

  const validationError = validarRegisto(form);
  if (validationError) {
    msg.className = "text-danger mt-3";
    msg.innerText = validationError;
    return;
  }

  try {
    const payload = {
      nome: form.nome,
      email: form.email,
      password: form.password,
      idade: Number(form.idade),
      telefone: form.telefone,
      cidade: form.cidade,
    };

    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    await parseJsonResponse(res);

    msg.className = "text-success mt-3";
    msg.innerText = "Conta criada. A redirecionar para login...";
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  } catch (error) {
    msg.className = "text-danger mt-3";
    msg.innerText = error.message || "Erro ao registar.";
  }
});
