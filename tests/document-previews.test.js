const { test } = require('node:test');
const assert = require('node:assert/strict');
const { deflateRawSync } = require('node:zlib');
const { readDocx } = require('../backend/src/services/document-docx.service');
const { preview } = require('../backend/src/services/document-preview.service');
// ZIP mínimo para testar os limites do leitor sem depender de arquivos pessoais.
function zip(entries) {
    let offset = 0;
    const chunks = [],
        central = [];
    for (const [name, value, declaredSize] of entries) {
        const text = Buffer.from(value),
            filename = Buffer.from(name),
            compressed = deflateRawSync(text);
        const crc = require('node:zlib').crc32(text);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(8, 8);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(declaredSize ?? text.length, 22);
        local.writeUInt16LE(filename.length, 26);
        chunks.push(local, filename, compressed);
        const dir = Buffer.alloc(46);
        dir.writeUInt32LE(0x02014b50);
        dir.writeUInt16LE(20, 4);
        dir.writeUInt16LE(20, 6);
        dir.writeUInt16LE(8, 10);
        dir.writeUInt32LE(crc, 16);
        dir.writeUInt32LE(compressed.length, 20);
        dir.writeUInt32LE(declaredSize ?? text.length, 24);
        dir.writeUInt16LE(filename.length, 28);
        dir.writeUInt32LE(offset, 42);
        central.push(dir, filename);
        offset += local.length + filename.length + compressed.length;
    }
    const directory = Buffer.concat(central),
        end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(directory.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...chunks, directory, end]);
}
const types =
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
const xml =
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Ação &amp; educação 😀</w:t><w:br w:type="page"/><w:t>Outra página</w:t></w:r></w:p></w:body></w:document>';
const make = (body = xml, extra = []) =>
    zip([['[Content_Types].xml', types], ['word/document.xml', body], ...extra]);
test('DOCX lê somente texto e respeita quebra explícita, sem abrir recursos externos', async () => {
    const text = await readDocx(
        make(xml, [
            [
                'word/_rels/document.xml.rels',
                '<Relationships><Relationship Target="https://example.com/privado" TargetMode="External"/></Relationships>'
            ]
        ])
    );
    assert.match(text, /Ação & educação 😀\fOutra página/);
    const png = await preview({ tipo: 'arquivo', nome_arquivo: 'texto.docx', conteudo: make() });
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
});
test('DOCX recusa ZIP arbitrário, entidades, macros, duplicatas e tamanho expandido excessivo', async () => {
    for (const data of [
        Buffer.from('PK fake'),
        zip([['arquivo.txt', 'não é Word']]),
        make('<!DOCTYPE x [<!ENTITY xx SYSTEM "file:///segredo">]>' + xml),
        make(xml, [['word/vbaProject.bin', 'macro']]),
        make(xml, [['word/document.xml', xml]]),
        zip([
            ['[Content_Types].xml', types],
            ['word/document.xml', xml, 3 * 1024 * 1024]
        ])
    ]) {
        await assert.rejects(readDocx(data), { status: 400 });
    }
});
test('prévia de imagem gera PNG pequeno sem persistir o original ou alterar a assinatura de download', async () => {
    const { createCanvas, loadImage } = require('@napi-rs/canvas');
    const source = createCanvas(1000, 800);
    source.getContext('2d').fillRect(0, 0, 1000, 800);
    const result = await preview({
        tipo: 'arquivo',
        nome_arquivo: 'foto.png',
        conteudo: source.toBuffer('image/png')
    });
    const image = await loadImage(result);
    assert.ok(image.width <= 420 && image.height <= 594);
    await assert.rejects(preview({ tipo: 'link' }), { status: 415 });
});
test('PDF renderiza somente a primeira página em vez de usar ícone ou página posterior', async () => {
    const blue = '0 0 1 rg 0 0 200 300 re f',
        red = '1 0 0 rg 0 0 200 300 re f';
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 300] /Resources << >> /Contents 5 0 R >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 300] /Resources << >> /Contents 6 0 R >>',
        `<< /Length ${blue.length} >>\nstream\n${blue}\nendstream`,
        `<< /Length ${red.length} >>\nstream\n${red}\nendstream`
    ];
    let data = '%PDF-1.7\n';
    const offsets = [0];
    objects.forEach((text, i) => {
        offsets.push(Buffer.byteLength(data));
        data += `${i + 1} 0 obj\n${text}\nendobj\n`;
    });
    const xref = Buffer.byteLength(data);
    data +=
        'xref\n0 7\n0000000000 65535 f \n' +
        offsets
            .slice(1)
            .map((n) => String(n).padStart(10, '0') + ' 00000 n \n')
            .join('') +
        `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const result = await preview({
        tipo: 'arquivo',
        nome_arquivo: 'duas-paginas.pdf',
        conteudo: Buffer.from(data)
    });
    const { createCanvas, loadImage } = require('@napi-rs/canvas');
    const image = await loadImage(result);
    const canvas = createCanvas(image.width, image.height),
        ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const pixel = ctx.getImageData(10, 10, 1, 1).data;
    assert.ok(
        pixel[2] > 200 && pixel[0] < 30,
        'capa deve ser a primeira página azul, não a segunda vermelha'
    );
});
