const { test } = require('node:test'),
    assert = require('node:assert/strict');
const catalog = require('../backend/catalog/belem-courses-2026.json'),
    { plan, sql } = require('../tools/lib/course-catalog.cjs');
test('catálogo distingue modalidades, tem fontes por curso e nomes válidos sem duplicação', () => {
    assert.equal(catalog.campus, 'Belém');
    assert.equal(catalog.courses.length, 48);
    assert.equal(new Set(catalog.courses.map((c) => c.nome)).size, 48);
    for (const course of catalog.courses) {
        assert.ok(course.nome.length <= 120);
        assert.ok(['tecnico', 'graduacao', 'pos_graduacao'].includes(course.nivel));
        assert.ok(course.sources.every((id) => catalog.sources.some((s) => s.id === id)));
    }
    assert.equal(catalog.courses.filter((c) => c.modalidade === 'integrado').length, 15);
    assert.equal(catalog.courses.filter((c) => c.modalidade === 'subsequente').length, 16);
});
test('planejamento preserva IDs, nomes, inativos e níveis já existentes; repetição não duplica', () => {
    const degree = catalog.courses.find(
        (c) => c.nome === 'Tecnologia em Análise e Desenvolvimento de Sistemas'
    );
    const existing = [
        { id_curso: 8, nome: 'Análise e Desenvolvimento de Sistemas', nivel: 'graduacao', ativo: 0 }
    ];
    const changes = plan(existing, catalog);
    assert.equal(
        changes.missing.some((c) => c === degree),
        false
    );
    assert.equal(changes.preserved[0], existing[0]);
    assert.equal(existing[0].ativo, 0);
    const filled = existing.concat(
        changes.missing.map((c, i) => ({ id_curso: 100 + i, ...c, ativo: 1 }))
    );
    assert.equal(plan(filled, catalog).missing.length, 0);
    assert.equal(plan([{ ...existing[0], nivel: 'tecnico' }], catalog).conflicts.length, 1);
});
test('SQL exige confirmação/condição, inclui só ausentes e não modifica os existentes', () => {
    const script = sql(catalog);
    assert.match(script, /@arcadia_course_catalog_confirmed = FALSE/);
    assert.match(script, /@arcadia_course_initial_count = 2/);
    assert.match(script, /NOT EXISTS/);
    assert.match(script, /ROLLBACK;/);
    assert.doesNotMatch(script, /^\s*(?:UPDATE|DELETE|ALTER|TRUNCATE)\b/m);
});
