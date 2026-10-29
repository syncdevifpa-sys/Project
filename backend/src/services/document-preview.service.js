const { Worker } = require('node:worker_threads');
let active = 0;
async function preview(item) {
    if (item.tipo !== 'arquivo' || !Buffer.isBuffer(item.conteudo))
        throw Object.assign(Error('Prévia indisponível para este documento.'), { status: 415 });
    if (active >= 2)
        throw Object.assign(Error('Aguarde um instante para carregar a prévia.'), { status: 429 });
    active++;
    try {
        return await new Promise((resolve, reject) => {
            const worker = new Worker(require.resolve('./document-preview.worker.js'), {
                workerData: { buffer: item.conteudo, filename: item.nome_arquivo },
                resourceLimits: { maxOldGenerationSizeMb: 192 }
            });
            let done = false;
            const finish = (error, image) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                worker.terminate();
                if (error)
                    reject(
                        Object.assign(
                            Error(
                                'Não foi possível gerar a prévia. O arquivo continua disponível para download.'
                            ),
                            { status: 422 }
                        )
                    );
                else resolve(Buffer.from(image));
            };
            const timer = setTimeout(() => finish(true), 8000);
            worker.once('message', (image) => finish(!image, image));
            worker.once('error', () => finish(true));
            worker.once('exit', () => {
                if (!done) finish(true);
            });
        });
    } finally {
        active--;
    }
}
module.exports = { preview };
