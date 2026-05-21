const express = require("express");

const app = express();
const PORT = process.env.PORT || 8080;
const rootDir = __dirname;

app.get("/", (req, res) => {
  res.redirect(302, "/index.html");
});

app.use(
  express.static(rootDir, {
    extensions: false,
    index: false,
    redirect: false,
  })
);

app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, () => {
  console.log(`Frontend a correr na porta ${PORT}`);
});
