const { test } = require('node:test');
const assert = require('node:assert/strict'),
    vm = require('node:vm'),
    fs = require('node:fs');
const code = fs.readFileSync('front/js/avatar-editor.js', 'utf8');
const { validateProfilePhoto } = require('../backend/src/services/profile-photo.service');
function editor(width = 1200, height = 800) {
    let dialog,
        revoked = 0;
    const context = {
        window: { Arcadia: {} },
        URL: { createObjectURL: () => 'blob:teste', revokeObjectURL: () => revoked++ },
        Image: class {
            naturalWidth = width;
            naturalHeight = height;
            async decode() {}
        },
        document: {
            body: { append() {} },
            createElement() {
                const fields = {};
                for (const key of [
                    'h2',
                    '#avatarEditorHelp',
                    '[data-zoom-status]',
                    '[data-cover-format]',
                    '[name=cover-format]',
                    'canvas',
                    '[name=zoom]',
                    '[name=horizontal]',
                    '[name=vertical]',
                    '[data-avatar-reset]',
                    '[data-avatar-cancel]',
                    '[data-avatar-confirm]'
                ])
                    fields[key] = {
                        value: key.includes('zoom') ? '1' : '50',
                        events: {},
                        addEventListener(type, fn) {
                            this.events[type] = fn;
                        },
                        getContext: () => ({
                            fillRect() {},
                            drawImage(...args) {
                                fields.canvas.lastDraw = args.slice(1);
                            }
                        }),
                        getBoundingClientRect: () => ({ width: 320 }),
                        toDataURL: () => {
                            fields.canvas.exportedDraw = fields.canvas.lastDraw.slice();
                            return 'data:image/jpeg;base64,/9j/AA==';
                        }
                    };
                dialog = {
                    events: {},
                    classList: { add() {} },
                    setAttribute() {},
                    querySelector: (key) => fields[key],
                    addEventListener(type, fn) {
                        this.events[type] = fn;
                    },
                    showModal() {},
                    close() {
                        this.events.close();
                    },
                    remove() {
                        this.removed = true;
                    },
                    fields
                };
                return dialog;
            }
        }
    };
    vm.runInNewContext(code, context);
    return { A: context.window.Arcadia, getDialog: () => dialog, revoked: () => revoked };
}
test('enquadramento fica dentro da imagem em formatos e limites de zoom/posição', () => {
    const { A } = editor();
    for (const [w, h] of [
        [1200, 800],
        [800, 1200],
        [800, 800]
    ])
        for (const zoom of [1, 2, 3])
            for (const x of [0, 50, 100])
                for (const y of [0, 50, 100]) {
                    const crop = A.avatarCrop(w, h, zoom, x, y);
                    assert.ok(
                        crop.x >= 0 &&
                            crop.y >= 0 &&
                            crop.x + crop.size <= w + 0.001 &&
                            crop.y + crop.size <= h + 0.001
                    );
                }
});
test('cancelar devolve nenhuma foto; confirmar entrega apenas o recorte e libera a prévia', async () => {
    for (const confirm of [false, true]) {
        const { A, getDialog, revoked } = editor();
        const result = A.editAvatar({ type: 'image/png', size: 1234 });
        await new Promise((resolve) => setImmediate(resolve));
        const dialog = getDialog();
        dialog.fields[confirm ? '[data-avatar-confirm]' : '[data-avatar-cancel]'].events.click();
        assert.equal(await result, confirm ? 'data:image/jpeg;base64,/9j/AA==' : null);
        assert.equal(dialog.removed, true);
        assert.equal(revoked(), 1);
    }
});
test('editor recusa formato não suportado e tamanho excessivo antes de abrir', async () => {
    const { A, getDialog } = editor();
    await assert.rejects(A.editAvatar({ type: 'image/svg+xml', size: 100 }));
    await assert.rejects(A.editAvatar({ type: 'image/png', size: 6 * 1024 * 1024 }));
    assert.equal(getDialog(), undefined);
});
test('API aceita foto raster pequena/remoção e recusa URL, assinatura inválida ou excesso', () => {
    validateProfilePhoto({ foto: '' });
    validateProfilePhoto({ foto: 'data:image/jpeg;base64,/9j/AA==' });
    for (const foto of [
        'https://example.test/photo.png',
        'data:image/svg+xml;base64,AAAA',
        'data:image/jpeg;base64,AAAA',
        'data:image/jpeg;base64,' + 'A'.repeat(750000)
    ])
        assert.throws(
            () => validateProfilePhoto({ foto }),
            (e) => e.status === 400
        );
});

test('zoom amplia a prévia e exporta exatamente o último enquadramento em perfil e capa', async () => {
    for (const [width, height] of [
        [1200, 800],
        [800, 1200]
    ])
        for (const cover of [false, true]) {
            const { A, getDialog } = editor(width, height);
            const pending = A.editAvatar({ type: 'image/png', size: 1000 }, { cover });
            await new Promise((resolve) => setImmediate(resolve));
            const dialog = getDialog(),
                canvas = dialog.fields.canvas;
            const initial = canvas.lastDraw.slice();
            const zoom = dialog.fields['[name=zoom]'];
            zoom.value = '3';
            zoom.events.input();
            const enlarged = canvas.lastDraw.slice();
            assert.ok(Math.abs(enlarged[2] * 3 - initial[2]) < 0.001);
            assert.ok(Math.abs(enlarged[3] * 3 - initial[3]) < 0.001);
            assert.equal(dialog.fields['[data-zoom-status]'].textContent, '300%');
            if (cover) assert.ok(Math.abs(canvas.width / canvas.height - width / height) < 0.002);
            dialog.fields['[name=horizontal]'].value = '100';
            dialog.fields['[name=horizontal]'].events.input();
            assert.ok(canvas.lastDraw[0] + canvas.lastDraw[2] <= width + 0.001);
            assert.ok(canvas.lastDraw[1] + canvas.lastDraw[3] <= height + 0.001);
            dialog.fields['[data-avatar-confirm]'].events.click();
            await pending;
            assert.deepEqual(canvas.exportedDraw, canvas.lastDraw);
        }
});

test('formato paisagem e retrato alteram a prévia e mantêm o recorte exportado em imagens verticais e horizontais', async () => {
    for (const [width, height] of [
        [1200, 800],
        [800, 1200]
    ]) {
        const { A, getDialog } = editor(width, height);
        const pending = A.editAvatar({ type: 'image/png', size: 1000 }, { cover: true });
        await new Promise((resolve) => setImmediate(resolve));
        const dialog = getDialog(),
            canvas = dialog.fields.canvas,
            format = dialog.fields['[name=cover-format]'];
        for (const [value, ratio] of [
            ['landscape', 16 / 9],
            ['portrait', 4 / 5]
        ]) {
            format.value = value;
            format.events.change();
            assert.ok(Math.abs(canvas.width / canvas.height - ratio) < 0.003);
            const zoom = dialog.fields['[name=zoom]'];
            zoom.value = '3';
            zoom.events.input();
            assert.ok(canvas.lastDraw[0] + canvas.lastDraw[2] <= width + 0.001);
            assert.ok(canvas.lastDraw[1] + canvas.lastDraw[3] <= height + 0.001);
            assert.ok(
                Math.abs(canvas.lastDraw[2] / canvas.lastDraw[3] - canvas.width / canvas.height) <
                    0.001
            );
        }
        dialog.fields['[data-avatar-confirm]'].events.click();
        await pending;
        assert.deepEqual(canvas.exportedDraw, canvas.lastDraw);
    }
});
