const params = new URLSearchParams(window.location.search);
const id = params.get("id");

(async () => {
  const res = await fetch(API_URL + "/ocorrencias/" + id);
  const o = await res.json();

  document.getElementById("detalhe").innerHTML = `
    <p>${o.descricao}</p>
    <p>${o.localizacao}</p>
    <img src="${o.imagemUrl}" width="300">
  `;
})();

const token = localStorage.getItem("token");

if (!token) {
  document.getElementById("estado").style.display = "none";
  document.getElementById("btnAtualizar").style.display = "none";
}

async function atualizar() {
  const estado = document.getElementById("estado").value;

  await fetch(API_URL + "/ocorrencias/" + id, {
    method: "PUT",
    headers: {
      ...getHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ estado })
  });

  alert("Atualizado!");
}