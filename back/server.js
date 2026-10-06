require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const app = require('./src/app');

const PORT = Number(process.env.PORT) || 3000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET precisa existir e ter pelo menos 32 caracteres.');
}

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  throw new Error('DB_HOST, DB_USER e DB_NAME precisam estar configurados.');
}

app.listen(PORT, () => console.log(`servidor rodando na porta ${PORT}`));