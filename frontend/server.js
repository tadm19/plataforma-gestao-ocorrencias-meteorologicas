const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const rootDir = __dirname;

const pages = {
  "/": "index.html",
  "/index": "index.html",
  "/lista": "lista.html",
  "/nova": "nova.html",
  "/detalhe": "detalhe.html",
  "/editar": "editar.html",
  "/login": "login.html",
  "/registo": "registo.html",
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(rootDir, file));
  });
});

app.use(
  express.static(rootDir, {
    extensions: false,
    index: "index.html",
    redirect: false,
  })
);

app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, () => {
  console.log(`Frontend a correr na porta ${PORT}`);
});