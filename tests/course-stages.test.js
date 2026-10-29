const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('etapas usam regime e quantidade de cada curso sem inferir semestre de oferta', () => {
    class Select {
        constructor() {
            this.children = [];
            this.events = {};
            this.value = '';
        }
        replaceChildren() {
            this.children = [];
        }
        append(node) {
            this.children.push(node);
        }
        addEventListener(name, fn) {
            this.events[name] = fn;
        }
    }
    const A = {},
        course = new Select(),
        stage = new Select();
    vm.runInNewContext(fs.readFileSync('front/js/course-stages.js', 'utf8'), {
        window: { Arcadia: A },
        document: { createElement: () => ({}) }
    });
    const courses = [
        { id_curso: 3, nome: 'Curso anual', ativo: 1, regime_etapas: 'anual', total_etapas: 3 },
        {
            id_curso: 8,
            nome: 'Curso semestral',
            ativo: true,
            regime_etapas: 'semestral',
            total_etapas: 6
        },
        { id_curso: 9, nome: 'Não configurado', ativo: 1 },
        { id_curso: 10, nome: 'Inativo', ativo: 0 }
    ];
    A.courseStages.attach(course, stage, courses, 3, 2);
    assert.equal(stage.children[2].textContent, '2º ano');
    assert.equal(stage.value, '2');
    assert.equal(stage.children.length, 4);
    assert.equal(course.children.length, 4);
    course.value = '8';
    course.events.change();
    assert.equal(stage.children[6].textContent, '6º semestre');
    assert.equal(stage.value, '');
    course.value = '9';
    course.events.change();
    assert.equal(stage.disabled, true);
    assert.equal(stage.children.length, 1);
    assert.match(stage.children[0].textContent, /não configuradas/);
});
