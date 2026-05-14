const token = getToken();
const form = document.getElementById("form");
const msg = document.getElementById("msg");

if (!token) {
  form.innerHTML = `
    <p class="alert alert-warning">Faz login para criar ocorrencias.</p>
    <a class="btn btn-primary" href="login.html">Login</a>
  `;
} else {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.innerText = "";

    try {
      const formData = new FormData();
      formData.append("tipo", document.getElementById("tipo").value);
      formData.append("descricao", document.getElementById("descricao").value);
      formData.append("localizacao", document.getElementById("localizacao").value);
      formData.append("prioridade", document.getElementById("prioridade").value);

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
      msg.className = "text-success";
      msg.innerText = "Ocorrencia criada.";
      form.reset();

      setTimeout(() => {
        window.location.href = `detalhe.html?id=${ocorrencia.id}`;
      }, 700);
    } catch (error) {
      msg.className = "text-danger";
      msg.innerText = error.message || "Erro ao criar ocorrencia";
    }
  });
}
