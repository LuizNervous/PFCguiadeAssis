require('dotenv').config({ path: './back/.env' });

const app = require('./src/app');

const PORT = process.env.DB_PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});