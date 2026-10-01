const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('filtros em português preservam os valores enviados à API e exibem os rótulos locais', async () => {
    const chip = (key, text) => ({ dataset: { filterKey: key }, textContent: text, count: {},
        querySelector() { return this.count; }, setAttribute() {}, addEventListener(event, fn) { this.click = fn; } });
    const chips = [chip('All', 'Todos'), chip('Research', 'Pesquisa'), chip('Extension', 'Extensão')];
    const grid = { innerHTML: '', addEventListener() {} };
    const hero = { textContent: '' };
    let load;
    const document = {
        addEventListener(event, fn) { load = fn; },
        querySelector(selector) { return selector === '#gridProjetos' ? grid : selector === '.ar-hero-count' ? hero : null; },
        querySelectorAll(selector) { return selector === '#chipbarProjetos .ar-chip' ? chips : []; },
        getElementById() { return null; }
    };
    const context = vm.createContext({ document, location: { pathname: '/projetos.html' }, window: { Arcadia: {
        auth: { getSessao: () => ({ tipo_usuario: 'docente' }) },
        showToast: message => assert.fail(message),
        api: { expect: promise => promise, get: async () => [
            { id_projeto: 1, titulo: 'Projeto de pesquisa', descricao: '', eixo: 'pesquisa', vagas: 2 },
            { id_projeto: 2, titulo: 'Projeto de extensão', descricao: '', eixo: 'extensao', vagas: 3 }
        ] }
    } } });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../front/js/pages.js'), 'utf8'), context);
    load();
    await new Promise(resolve => setImmediate(resolve));
    assert.match(grid.innerHTML, /Pesquisa/);
    assert.match(grid.innerHTML, /Extensão/);
    assert.equal(chips[0].count.textContent, '(2)');
    chips[1].click();
    assert.match(grid.innerHTML, /Projeto de pesquisa/);
    assert.doesNotMatch(grid.innerHTML, /Projeto de extensão/);
    chips[0].click();
    assert.match(grid.innerHTML, /Projeto de extensão/);
});
