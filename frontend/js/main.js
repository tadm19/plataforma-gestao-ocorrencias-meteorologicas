const token = localStorage.getItem("token");

if (!token) {
  document.getElementById("form").innerHTML =
    "<p>Faz login para criar ocorrências</p>";
} else {

  document.getElementById("form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("descricao", descricao.value);
    formData.append("localizacao", localizacao.value);

    if (imagem.files.length > 0) {
      formData.append("imagem", imagem.files[0]);
    }

    await fetch(API_URL + "/ocorrencias", {
      method: "POST",
      headers: getHeaders(),
      body: formData
    });

    alert("Criado!");
  });

}