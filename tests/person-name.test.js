const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const window = { Arcadia: {} };
vm.runInNewContext(fs.readFileSync('front/js/person-name.js','utf8'), { window });
const format = window.Arcadia.formatPersonName;
test('apresentação natural de nomes integralmente maiúsculos preserva partículas, Unicode e pontuação', () => {
    for (const [raw,expected] of [['LUCIENE','Luciene'],['  JOÃO   DA SILVA E SOUZA ','João da Silva e Souza'],['ANA-MARIA D’ÁVILA','Ana-Maria D’Ávila'],["MARIA D'ALMEIDA","Maria D'Almeida"],['ÉRICA DOS SANTOS','Érica dos Santos'],['de Souza','de Souza'],['McDonald','McDonald']]) assert.equal(format(raw),expected);
    assert.equal(format(null),''); assert.equal(format({nome:'ANA'}),'');
});
test('helper atua somente na apresentação, sem alterar identidade técnica ou valor original', () => {
    const profile = { nome:'LUCIENE', email:'LUCIENE@example.com', nome_usuario:'LUCIENE_IFPA', senha:'SecretABC' };
    assert.equal(format(profile.nome),'Luciene');
    assert.equal(profile.nome,'LUCIENE'); assert.equal(profile.email,'LUCIENE@example.com');
    assert.equal(profile.nome_usuario,'LUCIENE_IFPA'); assert.equal(profile.senha,'SecretABC');
    const source = fs.readFileSync('front/typed/person-name.ts','utf8');
    assert.doesNotMatch(source,/innerHTML|localStorage|fetch\(/);
});
