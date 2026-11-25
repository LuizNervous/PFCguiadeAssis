require("dotenv").config({ path: "./back/.env" });

const app = require("./src/app");

const PORT = process.env.PORT || 10448;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
