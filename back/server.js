require('dotenv').config({ path: './back/.env' });

const app = require('./src/app');

const PORT = process.env.DB_PORT;
app.listen(PORT, () => console.log(`servidor rodando na porta ${PORT}`));