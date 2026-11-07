/* Transfere a cor visível do banner para os controles relacionados, sem salvar dados. */
(function () {
    let observer;
    function mount() {
        observer?.disconnect();
        const banner = document.querySelector('.ar-hero');
        if (!banner) return;
        function sync() {
            const computed = getComputedStyle(banner);
            const color = computed.backgroundImage.match(/rgba?\([^)]+\)|#[\da-f]{6}/i)?.[0]
                || computed.backgroundColor;
            if (document.documentElement.style.getPropertyValue('--page-banner-tint') !== color)
                document.documentElement.style.setProperty('--page-banner-tint', color);
        }
        sync();
        observer = new MutationObserver(sync);
        observer.observe(banner, { attributes: true, attributeFilter: ['style', 'class'] });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] });
    }
    window.addEventListener('load', mount);
    document.addEventListener('arcadia:page-loaded', mount);
})();
