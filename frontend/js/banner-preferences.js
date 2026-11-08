(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.Arcadia = root.Arcadia || {}).bannerPreferences = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
    'use strict';
    const valid = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
    const legacy = {
        cyan: '#bdeafa',
        pink: '#f4c6dd',
        yellow: '#f7e895',
        green: '#c9edb0',
        orange: '#f4ceaa'
    };
    /* Atalhos de cor salvam o mesmo formato das cores personalizadas existentes. */
    const presets = {
        ...Object.fromEntries(
            Object.entries(legacy).map(([name, background]) => [
                name,
                { background: { cyan: '#8fd8ea', pink: '#f7a6cf', yellow: '#ffd84a', green: '#c6f36b' }[name] || background, text: '#182020' }
            ])
        ),
        white: { background: '#ffffff', text: '#0b1f3a' },
        navy: { background: '#0b1f3a', text: '#ffffff' }
    };
    function luminance(hex) {
        const rgb = hex
            .slice(1)
            .match(/../g)
            .map((value) => parseInt(value, 16) / 255)
            .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    }
    function contrast(a, b) {
        const x = luminance(a),
            y = luminance(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    }
    function readable(background, text) {
        if (!valid(background) || !valid(text)) return null;
        return contrast(background, text) >= 4.5
            ? text
            : contrast(background, '#000000') >= contrast(background, '#ffffff')
              ? '#000000'
              : '#ffffff';
    }
    /* Degradê suave: a segunda cor mantém ou aumenta o contraste do texto. */
    function backgroundCSS(style) {
        if (!style.gradient || !valid(style.background) || !valid(style.text))
            return style.background;
        const darken = luminance(style.text) > luminance(style.background);
        const target = darken ? '#000000' : '#ffffff';
        const channel = (hex, offset) => parseInt(hex.slice(offset, offset + 2), 16);
        let end =
            '#' +
            [1, 3, 5]
                .map((offset) =>
                    Math.round(
                        channel(style.background, offset) * 0.76 + channel(target, offset) * 0.24
                    )
                        .toString(16)
                        .padStart(2, '0')
                )
                .join('');
        if (end === style.background.toLowerCase()) end = darken ? '#132238' : '#e7eefd';
        if (contrast(end, style.text) < 4.5) end = target;
        return 'linear-gradient(135deg, ' + style.background + ', ' + end + ')';
    }
    function usesSiteDefault(page) {
        return ![
            'dashboard.html',
            'tasks.html',
            'documents.html',
            'settings.html',
            'community.html',
            'community-settings.html'
        ].includes(page);
    }
    /* Mesma paleta do tema e mesmas cores próprias das áreas pessoais. */
    function defaultStyle(page, accent = 'lime', key = '') {
        const general = presets[accent === 'lime' ? 'green' : accent] || presets.green;
        if (key === 'dashboard:next-commit') return { background: '#1d45a3', text: '#ffffff' };
        const tone = { 'tasks.html': 'yellow', 'documents.html': 'pink', 'community.html': 'cyan' }[page];
        if (page === 'dashboard.html' && !key.startsWith('dashboard:summary:')) return { ...presets.navy };
        return { ...(tone ? presets[tone] : general) };
    }
    function owner(session) {
        const external = session?.tipo_usuario === 'externo',
            id = external ? session.id_externo || session.id_usuario : session?.id_usuario;
        return /^[1-9]\d*$/.test(String(id || '')) ? (external ? 'externo:' : '') + id : null;
    }
    function resolve(style) {
        if (style === 'neutral' || style?.mode === 'neutral') return { mode: 'neutral' };
        if (typeof style === 'string' && Object.hasOwn(legacy, style))
            return { mode: 'custom', background: legacy[style], text: '#182020' };
        if (style?.mode === 'custom' && valid(style.background) && valid(style.text))
            return {
                mode: 'custom',
                background: style.background,
                text: style.autoContrast === false ? style.text : readable(style.background, style.text),
                ...(style.autoContrast === false ? { autoContrast: false } : {}),
                ...(style.gradient === true ? { gradient: true } : {})
            };
        return { mode: 'default', ...(style?.mode === 'default' && style.gradient === true ? { gradient: true } : {}) };
    }
    function pageKey(page, search = '') {
        const publication =
            page === 'notice.html' ? new URLSearchParams(search).get('id') || '' : '';
        return page === 'classes.html'
            ? 'overview'
            : 'page:' +
                  page +
                  ':' +
                  (page === 'index.html' ? 'home' : '0') +
                  (publication ? ':' + publication : '');
    }
    return {
        valid,
        legacy,
        presets,
        contrast,
        readable,
        backgroundCSS,
        usesSiteDefault,
        defaultStyle,
        owner,
        resolve,
        pageKey
    };
});
