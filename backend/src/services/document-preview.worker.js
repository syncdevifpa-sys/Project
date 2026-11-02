const { parentPort, workerData } = require('node:worker_threads');
const path = require('node:path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { readDocx } = require('./document-docx.service');
async function renderPreview(buffer, filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'docx') {
        const text = await readDocx(buffer);
        GlobalFonts.registerFromPath(
            require.resolve('../../../front/fonts/Onest-Variable-latin.woff2'),
            'ArcadiaPreview'
        );
        const canvas = createCanvas(420, 594),
            ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 420, 594);
        ctx.fillStyle = '#182020';
        ctx.font = '14px ArcadiaPreview';
        let y = 42,
            line = '';
        for (const paragraph of (text.trim() || 'Sem texto disponível para a prévia.')
            .split('\f')[0]
            .slice(0, 12000)
            .split('\n')) {
            for (const word of paragraph.split(/\s+/)) {
                if (ctx.measureText(line + word).width > 344) {
                    ctx.fillText(line, 38, y, 344);
                    y += 20;
                    line = '';
                }
                if (y > 536) break;
                // fillText com maxWidth mantém palavras muito longas dentro da folha.
                line += word + ' ';
            }
            if (y > 536) break;
            ctx.fillText(line, 38, y, 344);
            line = '';
            y += 20;
        }
        ctx.fillStyle = '#626262';
        ctx.font = '11px ArcadiaPreview';
        ctx.fillText('DOCX · prévia de texto aproximada', 38, 572);
        return canvas.toBuffer('image/png');
    }
    if (ext !== 'pdf') {
        const image = await loadImage(buffer);
        if (image.width * image.height > 16000000) throw Error('Imagem grande demais.');
        const scale = Math.min(420 / image.width, 594 / image.height, 1);
        const canvas = createCanvas(
            Math.max(1, Math.round(image.width * scale)),
            Math.max(1, Math.round(image.height * scale))
        );
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toBuffer('image/png');
    }
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    globalThis.pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    const fonts =
        path
            .join(
                path.dirname(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')),
                '../../standard_fonts'
            )
            .replace(/\\/g, '/') + '/';
    const task = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        isEvalSupported: false,
        disableFontFace: true,
        useSystemFonts: false,
        standardFontDataUrl: fonts,
        maxImageSize: 16000000,
        canvasMaxAreaInBytes: 4000000,
        verbosity: 0
    });
    try {
        const pdf = await task.promise,
            page = await pdf.getPage(1);
        const original = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({
            scale: Math.min(420 / original.width, 594 / original.height)
        });
        const canvas = createCanvas(
            Math.max(1, Math.ceil(viewport.width)),
            Math.max(1, Math.ceil(viewport.height))
        );
        await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport,
            annotationMode: pdfjs.AnnotationMode.DISABLE
        }).promise;
        return canvas.toBuffer('image/png');
    } finally {
        await task.destroy();
    }
}
if (parentPort)
    renderPreview(Buffer.from(workerData.buffer), workerData.filename).then(
        (image) => parentPort.postMessage(image),
        () => parentPort.postMessage(null)
    );
module.exports = { renderPreview };
