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
        const pattern = /\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|(?<![\w/])_([^_]+?)_(?!\w)/gi;
        let offset = 0;
        for (const match of text.matchAll(pattern)) {
            renderLinks(target, text.slice(offset, match.index));
            const node = document.createElement(match[1] ? 'strong' : match[2] ? 'u' : 'em');
            inline(node, match[1] || match[2] || match[3], depth + 1);
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
        /* Marcações antigas podem estar aninhadas: um regex simples fechava o bloco errado. */
        const tokens = /\[(alinhar|cor)=([^\]]+)\]|\[\/(alinhar|cor)\]/g;
        const stack = [], blocks = [];
        if (depth < 24) for (const token of text.matchAll(tokens)) {
            if (token[1]) {
                const valid = token[1] === 'alinhar'
                    ? ['left','center','right','justify'].includes(token[2])
                    : /^#[0-9a-f]{6}$/i.test(token[2]);
                stack.push({ start:token.index,body:token.index + token[0].length,type:token[1],value:token[2],valid });
            } else if (stack.length && stack.at(-1).type === token[3]) {
                const open = stack.pop();
                if (!stack.length && open.valid) blocks.push({ ...open,end:token.index + token[0].length,close:token.index });
            }
        }
        if (blocks.length) {
            let offset = 0;
            const append = (value) => {
                const previous = target.lastElementChild || target.children?.[target.children.length - 1];
                /* A quebra depois de um bloco já é visual: não a desenha uma segunda vez. */
                if (previous?.className === 'ar-text-aligned' && value.startsWith('\n')) value = value.slice(1);
                if (!value) return;
                if (/^\n+$/.test(value)) {
                    for (let i = 0; i < value.length; i++) target.append(document.createElement('br'));
                    return;
                }
                const part = document.createElement('span');
                render(part, value, depth + 1);
                target.append(part);
            };
            for (const block of blocks) {
                append(text.slice(offset, block.start));
                const part = document.createElement('span');
                if (block.type === 'alinhar') {
                    part.className = 'ar-text-aligned';part.style.display = 'block';part.style.textAlign = block.value;
                } else part.style.color = block.value;
                render(part, text.slice(block.body,block.close), depth + 1);
                if (block.type === 'alinhar' && block.body === block.close) part.append(document.createElement('br'));
                target.append(part);
                offset = block.end;
            }
            append(text.slice(offset));
            return;
        }
        /* Restos de comandos incompletos não viram texto público; o conteúdo é preservado. */
        const control = /\[alinhar=(?:left|center|right|justify)\]|\[cor=#[0-9a-f]{6}\]/gi;
        const hasControl = /\[alinhar=(?:left|center|right|justify)\]|\[cor=#[0-9a-f]{6}\]/i.test(text);
        const plain = text.replace(control, '').replace(hasControl ? /\[\/(?:alinhar|cor)\]/g : /$^/g, '');
        if (!/^\s*(?:[-•] |\d+\. |#{2,3} )/m.test(plain)) return inline(target, plain);
        let list;
        for (const [index, line] of plain.split('\n').entries()) {
            const heading = line.match(/^(#{2,3}) (.*)$/);
            if (heading) {
                list = null;
                const title = document.createElement(heading[1].length === 2 ? 'h2' : 'h3');
                inline(title, heading[2]);
                target.append(title);
                continue;
            }
            const item = line.match(/^\s*(?:([-•]) |(\d+)\. )(.*)$/);
            if (item) {
                const numbered = Boolean(item[2]);
                if (!list || list.numbered !== numbered) {
                    list = document.createElement('span');
                    list.numbered = numbered;
                    list.className = 'ar-text-list' + (numbered ? ' ar-text-list--numbered' : '');
                    list.setAttribute('role', 'list');
                    target.append(list);
                }
                const row = document.createElement('span');
                row.className = 'ar-text-list-item';
                row.setAttribute('role', 'listitem');
                inline(row, item[3]);
                list.append(row);
            } else {
                list = null;
                if (index) renderLinks(target, '\n');
                inline(target, line);
            }
        }
    }
    /* Converte blocos visuais em texto restrito sem juntar parágrafos nem perder espaços. */
    function serializeEditor(root) {
        const blockTags = ['div','p','h2','h3','ul','ol','li'];
        const children = (parent) => {
            let result = '';
            for (const child of Array.from(parent.childNodes || [])) {
                const tag = child.tagName?.toLowerCase();
                if (blockTags.includes(tag) && result && !result.endsWith('\n')) result += '\n';
                result += walk(child);
            }
            return result;
        };
        const wrap = (text, before, after) => text.split('\n').map(line => line ? before + line + after : '').join('\n');
        function walk(node) {
            if (node.nodeType === 3) return node.textContent.replace(/\u00a0/g, ' ');
            if (node.nodeType !== 1) return '';
            const tag = node.tagName.toLowerCase();
            if (['script','style','iframe','object'].includes(tag)) return '';
            if (tag === 'br') return '\n';
            let text = children(node);
            if (['strong','b'].includes(tag)) text = wrap(text,'**','**');
            if (['em','i'].includes(tag)) text = wrap(text,'_','_');
            if (tag === 'u') text = wrap(text,'__','__');
            let color = node.getAttribute('color') || node.style.color;
            const rgb = color?.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
            if (rgb) color = '#' + rgb.slice(1).map(n=>Number(n).toString(16).padStart(2,'0')).join('');
            if (/^#[0-9a-f]{6}$/i.test(color || '')) text = wrap(text,'[cor=' + color + ']','[/cor]');
            if (tag === 'li' || node.getAttribute('role') === 'listitem') {
                const numbered = node.parentElement?.tagName?.toLowerCase() === 'ol' || node.parentElement?.classList?.contains('ar-text-list--numbered');
                const prefix = numbered ? (Array.from(node.parentElement.children).indexOf(node) + 1) + '. ' : '- ';
                text = prefix + text.replace(/\n$/, '') + '\n';
            }
            if (['h2','h3'].includes(tag)) text = (tag === 'h2' ? '## ' : '### ') + text.replace(/\n$/, '') + '\n';
            const align = node.style.textAlign;
            if (align && !text.replace(/\n/g, '')) return text || '\n';
            if (['left','center','right','justify'].includes(align)) text = '[alinhar=' + align + ']' + text.replace(/\n$/, '') + '[/alinhar]';
            if ((blockTags.includes(tag) || node.classList?.contains('ar-text-aligned')) && !text.endsWith('\n')) text += '\n';
            return text;
        }
        return children(root).replace(/\n$/, '');
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
        function sync() {
            input.value = serializeEditor(area);
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
        if (input.name !== 'resumo') {
            const style = document.createElement('select');
            style.setAttribute('aria-label', 'Estilo do parágrafo');
            for (const [value,label] of [['p','Texto normal'],['h2','Título de seção'],['h3','Subtítulo']]) {
                const option = document.createElement('option');
                option.value = value; option.textContent = label; style.append(option);
            }
            style.addEventListener('change', () => command('formatBlock', style.value));
            toolbar.append(style);
        }
        for (const [label, glyph, before, after] of [
            ['Negrito', 'N', 'bold', ''], ['Itálico', 'I', 'italic', ''],
            ['Sublinhado', 'S', 'underline', ''], ['Lista de tópicos', '•', 'insertUnorderedList', ''],
            ['Lista numerada', '1.', 'insertOrderedList', ''], ['Desfazer', '↶', 'undo', ''],
            ['Refazer', '↷', 'redo', ''], ['Limpar formatação', 'Tx', 'removeFormat', '']
        ]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = glyph;
            button.className = 'ar-editor-action';
            button.dataset.formatCommand = before;
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
    A.noticeText = { render, editor, serializeEditor };
})((window.Arcadia = window.Arcadia || {}));
