/* Transfere a cor visível do banner para os controles relacionados, sem salvar dados. */
(function () {
    let observer;
    function mount() {
        observer?.disconnect();
        const banner = document.querySelector('.ar-hero, .ar-detail, .db-hello, .home-campus-banner');
        if (!banner) return;
        function sync() {
            const computed = getComputedStyle(banner);
            const color = computed.backgroundImage.match(/rgba?\([^)]+\)|#[\da-f]{6}/i)?.[0]
                || computed.backgroundColor;
            if (document.documentElement.style.getPropertyValue('--page-banner-tint') !== color)
                document.documentElement.style.setProperty('--page-banner-tint', color);
            /* O cartão de documentos repete o fundo completo e o contraste do cumprimento. */
            const root = document.documentElement;
            const values = {
                '--page-banner-background': computed.backgroundImage === 'none'
                    ? computed.backgroundColor
                    : computed.backgroundImage,
                '--page-banner-ink': computed.color
            };
            for (const [key, value] of Object.entries(values)) {
                if (root.style.getPropertyValue(key) !== value) root.style.setProperty(key, value);
            }
        }
        sync();
        observer = new MutationObserver(sync);
        observer.observe(banner, { attributes: true, attributeFilter: ['style', 'class'] });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] });
    }
    window.addEventListener('load', mount);
    document.addEventListener('arcadia:page-loaded', mount);
})();
