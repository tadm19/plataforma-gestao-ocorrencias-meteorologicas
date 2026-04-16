(async () => {
  const res = await fetch(API_URL + "/ocorrencias");
  const data = await res.json();

  const tabela = document.getElementById("tabela");

  data.forEach(o => {
    tabela.innerHTML += `
      <tr>
        <td>${o.descricao}</td>
        <td>${o.localizacao}</td>
        <td>${o.estado}</td>
        <td><a href="detalhe.html?id=${o.id}">Ver</a></td>
      </tr>
    `;
  });
})();