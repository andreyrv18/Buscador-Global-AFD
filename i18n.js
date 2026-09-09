// i18n.js — sistema completo com troca dinâmica de idioma
const I18N = (() => {
    const cache = new Map();
    const translations = new Map();
    let currentLang = 'pt_BR';
    let defaultLang = 'pt_BR';

    // Carrega traduções de arquivo JSON
    async function loadLanguage(lang) {
        if (translations.has(lang)) return translations.get(lang);

        try {
            const response = await fetch(`_locales/${lang}/messages.json`);
            const data = await response.json();
            translations.set(lang, data);
            return data;
        } catch (err) {
            console.warn(`Failed to load language: ${lang}`, err);
            return null;
        }
    }

    // Inicializa com idioma padrão
    async function init(lang = 'pt_BR') {
        currentLang = lang;

        // Tenta usar chrome.i18n se disponível
        if (chrome?.i18n) {
            currentLang = chrome.i18n.getUILanguage();
        }

        // Carrega idioma do localStorage se existir
        const savedLang = localStorage.getItem('preferred_language');
        if (savedLang) currentLang = savedLang;

        await loadLanguage(currentLang);
        await loadLanguage(defaultLang); // fallback
    }

    // t(key, ...subs) — substituições posicionais
    function t(key, ...subs) {
        const cacheKey = `${currentLang}:${key}:${subs.join(',')}`;
        let msg = cache.get(cacheKey);

        if (msg === undefined) {
            // Tenta idioma atual
            const currentTranslations = translations.get(currentLang);
            if (currentTranslations && currentTranslations[key]) {
                msg = currentTranslations[key].message;
            } else {
                // Fallback para idioma padrão
                const defaultTranslations = translations.get(defaultLang);
                if (defaultTranslations && defaultTranslations[key]) {
                    msg = defaultTranslations[key].message;
                } else {
                    // Fallback para chrome.i18n
                    msg = chrome?.i18n?.getMessage(key, subs.length ? subs : undefined) ?? key;
                }
            }

            // Aplica substituições ($1, $2, etc)
            if (subs.length > 0) {
                msg = msg.replace(/\$(\d+)/g, (match, index) => {
                    return subs[parseInt(index) - 1] ?? match;
                });
                // Aplica placeholders nomeados ($name$)
                const currentTranslations = translations.get(currentLang);
                if (currentTranslations && currentTranslations[key]?.placeholders) {
                    const placeholders = currentTranslations[key].placeholders;
                    for (const [name, config] of Object.entries(placeholders)) {
                        const value = subs[parseInt(config.content.replace('$', '')) - 1] ?? '';
                        msg = msg.replace(new RegExp(`\\$${name}\\$`, 'g'), value);
                    }
                }
            }

            cache.set(cacheKey, msg);
        }

        return msg;
    }

    // Traduz todos os elementos marcados
    function translate(root = document) {
        const nodes = root.querySelectorAll(
            '[data-i18n],[data-i18n-title],[data-i18n-placeholder],[data-i18n-aria]'
        );
        for (let i = 0, n = nodes.length; i < n; i++) {
            const el = nodes[i];
            const k = el.dataset.i18n;
            if (k) el.textContent = t(k);
            const kT = el.dataset.i18nTitle;
            if (kT) el.title = t(kT);
            const kP = el.dataset.i18nPlaceholder;
            if (kP) el.placeholder = t(kP);
            const kA = el.dataset.i18nAria;
            if (kA) el.setAttribute('aria-label', t(kA));
        }
    }

    // Troca idioma em tempo real
    async function setLanguage(lang) {
        if (lang === currentLang) return;

        await loadLanguage(lang);
        currentLang = lang;
        localStorage.setItem('preferred_language', lang);

        // Limpa cache para forçar recarregamento das traduções
        cache.clear();

        // Retraduz toda a interface
        translate();

        // Dispara evento para componentes re-renderizarem
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    function getCurrentLanguage() {
        return currentLang;
    }

    return { init, t, translate, setLanguage, getCurrentLanguage };
})();

// Atalho global
const t = I18N.t;
