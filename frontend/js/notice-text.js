(function (A) {
    'use strict';
    function renderLinks(target, value) {
            const text = String(value ?? '');
            target.style.whiteSpace = 'pre-wrap';
            target.style.overflowWrap = 'anywhere';
            let offset = 0;
            const appendText = (value) => {
                if (value) {
                    const span = document.createElement('span');
                    span.textContent = value;
                    target.append(span);
                }
            };
            for (const match of text.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) {
                let token = match[0].replace(/[.,;:!?]+$/g, '');
                while (
                    token.endsWith(')') &&
                    (token.match(/\)/g) || []).length > (token.match(/\(/g) || []).length
                )
                    token = token.slice(0, -1);
                appendText(text.slice(offset, match.index));
                let url;
                try {
                    url = new URL(token);
                } catch {}
                if (url && ['http:', 'https:'].includes(url.protocol) && url.hostname) {
                    const anchor = document.createElement('a');
                    anchor.href = url.href;
                    anchor.textContent = token;
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                    target.append(anchor);
                    appendText(match[0].slice(token.length));
                } else appendText(match[0]);
                offset = match.index + match[0].length;
            }
            appendText(text.slice(offset));
    }
    /* Formatação restrita, criada por DOM: nenhum HTML da publicação é executado. */
    function inline(target, text, depth = 0) {
        if (depth > 6) return renderLinks(target, text);
        const pattern = /\*\*([^\n]+?)\*\*|__([^\n]+?)__|(?<![\w/])_([^_\n]+?)_(?!\w)|\[cor=(#[0-9a-f]{6})\]([^\n]+?)\[\/cor\]/gi;
        let offset = 0;
        for (const match of text.matchAll(pattern)) {
            renderLinks(target, text.slice(offset, match.index));
            const node = document.createElement(match[1] ? 'strong' : match[2] ? 'u' : match[3] ? 'em' : 'span');
            if (match[4]) node.style.color = match[4];
            inline(node, match[1] || match[2] || match[3] || match[5], depth + 1);
            target.append(node);
            offset = match.index + match[0].length;
        }
        renderLinks(target, text.slice(offset));
    }
    function render(target, value, depth = 0) {
        const text = String(value ?? '');
        target.replaceChildren();
        target.style.whiteSpace = 'pre-wrap';
        target.style.overflowWrap = 'anywhere';
        /* Apenas quatro alinhamentos conhecidos; estilos e HTML arbitrários não são aceitos. */
        if (depth < 6 && /\[alinhar=(left|center|right|justify)\]/.test(text)) {
            const pattern = /\[alinhar=(left|center|right|justify)\]([\s\S]*?)\[\/alinhar\]/g;
            let offset = 0, found = false;
            for (const match of text.matchAll(pattern)) {
                found = true;
                if (match.index > offset) {
                    const before = document.createElement('span');
                    render(before, text.slice(offset, match.index), depth + 1);
                    target.append(before);
                }
                const paragraph = document.createElement('span');
                paragraph.className = 'ar-text-aligned';
                paragraph.style.display = 'block';
                paragraph.style.textAlign = match[1];
                render(paragraph, match[2], depth + 1);
                target.append(paragraph);
                offset = match.index + match[0].length;
            }
            if (found) {
                if (offset < text.length) {
                    const after = document.createElement('span');
                    render(after, text.slice(offset), depth + 1);
                    target.append(after);
                }
                return;
            }
        }
        if (!/^\s*[-•] /m.test(text)) return inline(target, text);
        let list;
        for (const [index, line] of text.split('\n').entries()) {
            const item = line.match(/^\s*[-•] (.*)$/);
            if (item) {
                if (!list) {
                    list = document.createElement('span');
                    list.className = 'ar-text-list';
                    list.setAttribute('role', 'list');
                    target.append(list);
                }
                const row = document.createElement('span');
                row.className = 'ar-text-list-item';
                row.setAttribute('role', 'listitem');
                inline(row, item[1]);
                list.append(row);
            } else {
                list = null;
                if (index) renderLinks(target, '\n');
                inline(target, line);
            }
        }
    }
    /* Edição visual: o campo original mantém apenas a representação restrita para salvar. */
    function editor(input) {
        const required = input.required;
        const caption = input.parentElement.firstChild?.textContent || 'Texto';
        const area = document.createElement('div');
        area.className = 'ar-visual-text-editor';
        area.contentEditable = 'true';
        area.setAttribute('role', 'textbox');
        area.setAttribute('aria-label', caption.trim());
        area.setAttribute('aria-multiline', 'true');
        area.setAttribute('aria-required', String(required));
        render(area, input.value);
        input.hidden = true;
        input.required = false;
        input.before(area);
        const panel = document.createElement('div');
        panel.className = 'ar-basic-text-editor ar-span-2';
        const toolbar = document.createElement('div');
        toolbar.className = 'ar-text-toolbar';
        toolbar.setAttribute('role', 'group');
        toolbar.setAttribute('aria-label', 'Formatação de ' + (input.name === 'resumo' ? 'resumo' : 'texto'));
        let savedRange;
        function remember() {
            const selection = window.getSelection();
            if (selection?.rangeCount && area.contains(selection.anchorNode) && area.contains(selection.focusNode))
                savedRange = selection.getRangeAt(0).cloneRange();
        }
        function serialize(node) {
            if (node.nodeType === 3) return node.textContent;
            if (node.nodeType !== 1) return '';
            const tag = node.tagName.toLowerCase();
            if (['script','style','iframe','object'].includes(tag)) return '';
            if (tag === 'br') return '\n';
            let text = Array.from(node.childNodes).map(serialize).join('');
            if (['strong','b'].includes(tag)) text = '**' + text + '**';
            if (['em','i'].includes(tag)) text = '_' + text + '_';
            if (tag === 'u') text = '__' + text + '__';
            let color = node.getAttribute('color') || node.style.color;
            const rgb = color?.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
            if (rgb) color = '#' + rgb.slice(1).map(n=>Number(n).toString(16).padStart(2,'0')).join('');
            if (/^#[0-9a-f]{6}$/i.test(color || '')) text = '[cor=' + color + ']' + text + '[/cor]';
            if (tag === 'li' || node.getAttribute('role') === 'listitem') text = '- ' + text + '\n';
            const align = node.style.textAlign;
            if (['left','center','right','justify'].includes(align)) text = '[alinhar=' + align + ']' + text + '[/alinhar]';
            if (['div','p','ul','ol'].includes(tag) && node !== area && !text.endsWith('\n')) text += '\n';
            return text;
        }
        function sync() {
            input.value = Array.from(area.childNodes).map(serialize).join('').replace(/\n$/, '');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        function command(name, value) {
            area.focus({ preventScroll:true });
            const selection = window.getSelection();
            if (savedRange && area.contains(savedRange.commonAncestorContainer)) {
                selection.removeAllRanges();
                selection.addRange(savedRange);
            }
            document.execCommand(name, false, value);
            remember();
            sync();
        }
        ['keyup','mouseup','touchend','input','blur'].forEach(event=>area.addEventListener(event, remember));
        area.addEventListener('input', sync);
        toolbar.addEventListener('mousedown', event=>{ if (event.target.closest('button')) event.preventDefault(); });
        /* Colagens e arquivos não inserem HTML executável nem conteúdo externo no editor. */
        area.addEventListener('paste', event=>{
            event.preventDefault();
            command('insertText', event.clipboardData.getData('text/plain'));
        });
        area.addEventListener('drop', event=>event.preventDefault());
        input.form?.addEventListener('submit', event=>{
            sync();
            if (required && !area.textContent.trim()) {
                event.preventDefault();
                event.stopImmediatePropagation();
                area.focus();
                area.setAttribute('aria-invalid','true');
            } else area.removeAttribute('aria-invalid');
        }, true);
        for (const [label, glyph, before, after] of [
            ['Negrito', 'N', 'bold', ''], ['Itálico', 'I', 'italic', ''],
            ['Sublinhado', 'S', 'underline', ''], ['Lista de tópicos', '•', 'insertUnorderedList', '']
        ]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = glyph;
            button.title = label;
            button.setAttribute('aria-label', label);
            button.addEventListener('click', () => command(before));
            toolbar.append(button);
        }
        const color = document.createElement('input');
        color.type = 'color';
        color.value = '#174c66';
        color.title = 'Cor do texto selecionado';
        color.setAttribute('aria-label', 'Cor do texto selecionado');
        color.addEventListener('change', () => command('foreColor', color.value));
        toolbar.append(color);
        const divider = document.createElement('span');
        divider.className = 'ar-text-toolbar-divider';
        divider.setAttribute('aria-hidden', 'true');
        toolbar.append(divider);
        const alignments = [
            ['left', 'Alinhar à esquerda', 'M4 5h16M4 10h10M4 15h16M4 20h10'],
            ['center', 'Centralizar', 'M4 5h16M7 10h10M4 15h16M7 20h10'],
            ['right', 'Alinhar à direita', 'M4 5h16M10 10h10M4 15h16M10 20h10'],
            ['justify', 'Justificar', 'M4 5h16M4 10h16M4 15h16M4 20h16']
        ];
        for (const [value, label, path] of alignments) {
            const button = document.createElement('button');
            button.type = 'button';
            button.title = label;
            button.setAttribute('aria-label', label);
            button.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="' + path + '"/></svg>';
            button.addEventListener('click', () => command({left:'justifyLeft', center:'justifyCenter', right:'justifyRight', justify:'justifyFull'}[value]));
            toolbar.append(button);
        }
        const hint = document.createElement('small');
        hint.textContent = 'Selecione o texto para formatar. O alinhamento se aplica ao parágrafo.';
        panel.append(toolbar, hint);
        input.parentElement.after(panel);
    }
    A.noticeText = { render, editor };
})((window.Arcadia = window.Arcadia || {}));
