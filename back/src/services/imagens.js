const crypto = require('crypto');

const URL_UPLOAD = 'https://upload.imagekit.io/api/v1/files/upload';
const URL_API = 'https://api.imagekit.io/v1';

const PASTAS = {
    perfis: '/guia-assis/perfis',
    pontos: '/guia-assis/pontos'
};

const PRESETS = {
    avatar: { largura: 256, altura: 256, fit: 'cover', naoAmpliar: false, qualidade: 80 },
    fotoPonto: { largura: 1600, altura: 1600, fit: 'inside', naoAmpliar: true, qualidade: 85 }
};

const LIMITE_PIXELS = 25_000_000;
const TIMEOUT_MS = 15_000;

class ImagemInvalidaError extends Error { }

function detectarFormato(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
    return null;
}

async function prepararImagem(buffer, preset) {
    if (!detectarFormato(buffer)) {
        throw new ImagemInvalidaError('Envie uma imagem JPEG, PNG ou WebP.');
    }
    const sharp = require('sharp');
    try {
        return await sharp(buffer, { limitInputPixels: LIMITE_PIXELS })
            .rotate()
            .resize({
                width: preset.largura,
                height: preset.altura,
                fit: preset.fit,
                withoutEnlargement: preset.naoAmpliar
            })
            .webp({ quality: preset.qualidade })
            .toBuffer();
    } catch (erro) {
        console.warn('Imagem rejeitada pelo sharp:', erro.message);
        throw new ImagemInvalidaError('O arquivo não é uma imagem válida ou é grande demais.');
    }
}

function configuracao() {
    const chave = process.env.IMAGEKIT_PRIVATE_KEY;
    const endpoint = (process.env.IMAGEKIT_URL_ENDPOINT || '').replace(/\/+$/, '');
    if (!chave || !endpoint) {
        throw new Error('IMAGEKIT_PRIVATE_KEY e IMAGEKIT_URL_ENDPOINT precisam estar configuradas.');
    }
    return { cabecalho: 'Basic ' + Buffer.from(chave + ':').toString('base64'), endpoint };
}

async function enviarImagem(buffer, pasta) {
    const { cabecalho, endpoint } = configuracao();
    const nome = `${crypto.randomUUID()}.webp`;

    const formulario = new FormData();
    formulario.append('file', new Blob([buffer], { type: 'image/webp' }), nome);
    formulario.append('fileName', nome);
    formulario.append('folder', pasta);

    const resposta = await fetch(URL_UPLOAD, {
        method: 'POST',
        headers: { Authorization: cabecalho },
        body: formulario,
        signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!resposta.ok) {
        throw new Error(`ImageKit respondeu ${resposta.status} no upload.`);
    }

    const dados = await resposta.json();
    const urlValida = typeof dados.url === 'string' && dados.url.startsWith(endpoint + '/');
    if (!urlValida || typeof dados.fileId !== 'string') {
        throw new Error('Resposta inesperada do ImageKit no upload.');
    }
    return { url: dados.url, fileId: dados.fileId };
}

async function apagarImagem(fileId) {
    const { cabecalho } = configuracao();
    const resposta = await fetch(`${URL_API}/files/${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
        headers: { Authorization: cabecalho },
        signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!resposta.ok && resposta.status !== 404) {
        throw new Error(`ImageKit respondeu ${resposta.status} ao apagar.`);
    }
}

module.exports = { PASTAS, PRESETS, ImagemInvalidaError, detectarFormato, prepararImagem, enviarImagem, apagarImagem };
