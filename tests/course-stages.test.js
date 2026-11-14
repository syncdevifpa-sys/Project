const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('cadastro oferece quatro anos ou oito semestres conforme o regime do curso', () => {
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
    vm.runInNewContext(fs.readFileSync('frontend/js/course-stages.js', 'utf8'), {
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
    assert.equal(stage.children.length, 5);
    assert.equal(stage.children[4].textContent, '4º ano');
    assert.equal(course.children.length, 4);
    course.value = '8';
    course.events.change();
    assert.equal(stage.children[8].textContent, '8º semestre');
    assert.equal(stage.value, '');
    stage.value = '4';
    A.courseStages.setEnabled(course, false);
    assert.equal(stage.disabled, true);
    assert.equal(stage.required, false);
    A.courseStages.setEnabled(course, true);
    assert.equal(stage.disabled, false);
    assert.equal(stage.value, '4');
    A.courseStages.attach(course, stage, courses);
    assert.equal(course.value, '8');
    assert.equal(stage.value, '4');
    course.value = '9';
    course.events.change();
    assert.equal(stage.disabled, true);
    assert.equal(stage.children.length, 1);
    assert.match(stage.children[0].textContent, /não configuradas/);
});

test('curso precede etapa no cadastro, inclusive na navegação por teclado', () => {
    const html=fs.readFileSync('frontend/signup.html','utf8');
    assert.ok(html.indexOf('id="campoCursoWrapper"') < html.indexOf('id="studentCourseInfo"'));
});
