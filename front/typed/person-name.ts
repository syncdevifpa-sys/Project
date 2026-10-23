// Somente apresentação de nomes de pessoas; não altera o cadastro original.
(function () {
    function formatPersonName(value: unknown): string {
        if (typeof value !== 'string') return '';
        const name = value.trim().replace(/\s+/gu, ' ');
        if (!name || name !== name.toLocaleUpperCase('pt-BR') || name === name.toLocaleLowerCase('pt-BR')) return name;
        const particles = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
        return name.toLocaleLowerCase('pt-BR').split(' ').map((word, index) => {
            if (index > 0 && particles.has(word)) return word;
            return word.replace(/(^|[-'’])(\p{L})/gu, (_match: string, separator: string, letter: string) => separator + letter.toLocaleUpperCase('pt-BR'));
        }).join(' ');
    }
    const target = window as Window & { Arcadia?: { [key: string]: unknown; formatPersonName?: typeof formatPersonName } };
    target.Arcadia = target.Arcadia || {};
    target.Arcadia.formatPersonName = formatPersonName;
})();
