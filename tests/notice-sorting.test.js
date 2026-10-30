const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('ordenação de Notícias cobre a coleção inteira, desempata e preserva os registros', () => {
    const A = {};
    vm.runInNewContext(fs.readFileSync('front/js/notice-filters.js', 'utf8'), {
        window: { Arcadia: A }
    });
    const rows = [
        { id_aviso: 3, titulo: 'Beta', data_publicacao: '2026-01-02' },
        { id_aviso: 2, titulo: 'Ana', data_publicacao: '2026-01-01', data_prazo: '2026-05-01' },
        { id_aviso: 1, titulo: 'Ana', data_publicacao: '2026-01-01', data_prazo: '2026-04-01' }
    ];
    const ids = (mode) => Array.from(A.noticeFilters.sort(rows, mode), (r) => r.id_aviso);
    assert.deepEqual(ids('recent'), [3, 1, 2]);
    assert.deepEqual(ids('oldest'), [1, 2, 3]);
    assert.deepEqual(ids('title'), [1, 2, 3]);
    assert.deepEqual(ids('title-desc'), [3, 1, 2]);
    assert.deepEqual(ids('deadline'), [1, 2, 3]);
    assert.deepEqual(
        rows.map((r) => r.id_aviso),
        [3, 2, 1]
    );
    rows[2].fixado = true;
    assert.equal(ids('recent')[0], 1, 'publicações fixadas continuam no início');
});
