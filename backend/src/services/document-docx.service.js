// Lê somente XML textual: não executa macros, não extrai arquivos e não segue relações externas.
const yauzl = require('yauzl');
const { SaxesParser } = require('saxes');
const invalid = () =>
    Object.assign(
        new Error('DOCX inválido ou incompatível. Envie um arquivo .docx sem macros de até 2 MB.'),
        { status: 400 }
    );
function xmlText(xml, contentTypes = false) {
    const parser = new SaxesParser({ xmlns: true });
    let capture = false,
        document = false,
        validType = false,
        text = '';
    parser.on('doctype', () => {
        throw invalid();
    });
    parser.on('opentag', (node) => {
        if (node.local === 'document' && /wordprocessingml/.test(node.uri)) document = true;
        if (node.local === 't' && /wordprocessingml/.test(node.uri)) capture = true;
        if (node.local === 'tab') text += '\t';
        if (node.local === 'br')
            text += Object.values(node.attributes).some(
                (a) => a.local === 'type' && a.value === 'page'
            )
                ? '\f'
                : '\n';
        if (node.local === 'lastRenderedPageBreak') text += '\f';
        if (contentTypes && node.local === 'Override') {
            const attrs = Object.values(node.attributes);
            validType ||=
                attrs.some((a) => a.local === 'PartName' && a.value === '/word/document.xml') &&
                attrs.some(
                    (a) =>
                        a.local === 'ContentType' &&
                        a.value ===
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
                );
        }
    });
    parser.on('text', (value) => {
        if (capture) text += value;
    });
    parser.on('closetag', (node) => {
        if (node.local === 't') capture = false;
        if (node.local === 'p') text += '\n\n';
    });
    parser.write(xml).close();
    if (contentTypes ? !validType : !document) throw invalid();
    return text;
}
async function readDocx(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length > 2 * 1024 * 1024) throw invalid();
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(
            buffer,
            { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
            (error, zip) => {
                if (error) return reject(invalid());
                let done = false,
                    count = 0,
                    total = 0;
                const files = new Map(),
                    names = new Set();
                let stream;
                const finish = (error) => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    stream?.destroy();
                    zip.close();
                    if (error) return reject(invalid());
                    try {
                        if (!files.has('[Content_Types].xml') || !files.has('word/document.xml'))
                            throw invalid();
                        xmlText(files.get('[Content_Types].xml'), true);
                        resolve(xmlText(files.get('word/document.xml')));
                    } catch {
                        reject(invalid());
                    }
                };
                const timer = setTimeout(() => finish(invalid()), 3000);
                zip.on('error', finish);
                zip.on('end', () => finish());
                zip.on('entry', (entry) => {
                    if (done) return;
                    total += entry.uncompressedSize;
                    if (
                        ++count > 1024 ||
                        total > 32 * 1024 * 1024 ||
                        names.has(entry.fileName) ||
                        entry.isEncrypted() ||
                        /vbaProject\.bin$/i.test(entry.fileName)
                    )
                        return finish(invalid());
                    names.add(entry.fileName);
                    if (!['[Content_Types].xml', 'word/document.xml'].includes(entry.fileName))
                        return zip.readEntry();
                    if (entry.uncompressedSize > 2 * 1024 * 1024) return finish(invalid());
                    zip.openReadStream(entry, (error, input) => {
                        if (done) {
                            input?.destroy();
                            return;
                        }
                        if (error) return finish(error);
                        stream = input;
                        const chunks = [];
                        let bytes = 0;
                        input.on('error', finish);
                        input.on('data', (chunk) => {
                            bytes += chunk.length;
                            if (bytes > 2 * 1024 * 1024) return finish(invalid());
                            chunks.push(chunk);
                        });
                        input.on('end', () => {
                            if (done) return;
                            files.set(entry.fileName, Buffer.concat(chunks).toString('utf8'));
                            zip.readEntry();
                        });
                    });
                });
                zip.readEntry();
            }
        );
    });
}
module.exports = { readDocx };
