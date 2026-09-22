/**
 * EBA Android TV Evrensel Donanım Kumanda Motoru v6.0 (React & Modern EBA Full Support)
 */

(function () {
    console.log("[EBA TV v6.0] React & Modern Portal Motoru Aktif.");

    const styleId = "eba-tv-v6-styles";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
            .tv-focused, *:focus {
                outline: 5px solid #ff9800 !important;
                outline-offset: 4px !important;
                box-shadow: 0 0 30px rgba(255, 152, 0, 1) !important;
                transform: scale(1.03) !important;
                transition: transform 0.1s ease-out, outline 0.1s ease-out !important;
                z-index: 999999 !important;
            }
            input.tv-focused, textarea.tv-focused {
                outline: 5px solid #00e5ff !important;
                box-shadow: 0 0 30px rgba(0, 229, 255, 1) !important;
                background-color: #fffde7 !important;
            }
            * {
                cursor: none !important;
                -webkit-tap-highlight-color: transparent !important;
            }
        `;
        document.head.appendChild(style);
    }

    let currentFocus = null;

    // React ve dinamik DOM'daki tüm tıklanabilirleri tara
    function prepareElements() {
        try {
            const all = document.querySelectorAll('input, button, a, textarea, select, [role="button"], [onclick], div, span');
            all.forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'TEXTAREA') return;
                
                // Cursor pointer veya buton/kart benzeri her seyi secilebilir yap
                const cls = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
                const isClickable = el.getAttribute('role') === 'button' || 
                                    el.hasAttribute('onclick') || 
                                    cls.includes('btn') || 
                                    cls.includes('card') || 
                                    cls.includes('item') ||
                                    cls.includes('box') ||
                                    cls.includes('hero');

                if (isClickable && !el.getAttribute('tabindex')) {
                    el.setAttribute('tabindex', '0');
                }
            });
        } catch (e) {}
    }

    function getFocusableElements() {
        prepareElements();

        const modal = document.querySelector('.modal.show, [role="dialog"], .swal2-container, .modal-dialog');
        const root = modal || document;

        const selector = 'input:not([type="hidden"]):not([disabled]), button:not([disabled]), a[href], textarea, select, [tabindex="0"], [role="button"], video';
        const all = Array.from(root.querySelectorAll(selector));

        return all.filter(el => {
            if (el.disabled || el.getAttribute("aria-hidden") === "true") return false;
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return false;

            const style = window.getComputedStyle(el);
            if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") return false;

            return true;
        });
    }

    function setFocus(el, shouldOpenKeyboard = false) {
        if (!el) return;
        if (currentFocus && currentFocus !== el) {
            currentFocus.classList.remove("tv-focused");
        }
        currentFocus = el;
        currentFocus.classList.add("tv-focused");
        try { currentFocus.focus(); } catch (e) {}

        const isInput = (el.tagName === "INPUT" && el.type !== "submit" && el.type !== "button") || el.tagName === "TEXTAREA";

        if (isInput) {
            if (shouldOpenKeyboard && window.AndroidTV && window.AndroidTV.showKeyboard) {
                window.AndroidTV.showKeyboard();
            }
        } else {
            if (window.AndroidTV && window.AndroidTV.hideKeyboard) {
                window.AndroidTV.hideKeyboard();
            }
        }

        currentFocus.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        });
    }

    function handleFormNavigation(direction) {
        if (!currentFocus) return false;
        
        // 1. e-Devlet Ekranı Form Sıralaması
        const isTrid = currentFocus.id === "trid" || currentFocus.name === "trid";
        const isEgpPwd = currentFocus.id === "egp_pwd" || currentFocus.name === "egp_pwd";

        if (direction === "DOWN") {
            if (isTrid) {
                const pwd = document.querySelector('input[type="password"], #egp_pwd');
                if (pwd) { setFocus(pwd, true); return true; }
            } else if (isEgpPwd) {
                const btn = document.querySelector('input[type="submit"], button[name="submitButton"], .btn-primary, button[type="submit"]');
                if (btn) { setFocus(btn, false); return true; }
            }
        } else if (direction === "UP") {
            if (isEgpPwd) {
                const trid = document.querySelector('#trid, input[name="trid"], input[type="text"]');
                if (trid) { setFocus(trid, true); return true; }
            }
        }

        // 2. Modern EBA Login Ekranı Form Sıralaması (/login)
        if (window.location.pathname.includes("login")) {
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
            const currentIndex = inputs.indexOf(currentFocus);

            if (direction === "DOWN") {
                if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                    setFocus(inputs[currentIndex + 1], true);
                    return true;
                } else if (currentIndex === inputs.length - 1) {
                    // Son inputtan sonra "Giriş Yap" butonuna veya e-Devlet butonuna geç
                    const submitBtn = document.querySelector('button[type="submit"], button, .btn');
                    if (submitBtn) { setFocus(submitBtn, false); return true; }
                }
            } else if (direction === "UP") {
                if (currentIndex > 0) {
                    setFocus(inputs[currentIndex - 1], true);
                    return true;
                }
            }
        }

        return false;
    }

    function navigate(direction) {
        if (handleFormNavigation(direction)) return;

        const elements = getFocusableElements();
        if (elements.length === 0) return;

        if (!currentFocus || !document.body.contains(currentFocus)) {
            setFocus(elements[0]);
            return;
        }

        const curRect = currentFocus.getBoundingClientRect();
        const curCenter = {
            x: curRect.left + curRect.width / 2,
            y: curRect.top + curRect.height / 2
        };

        let bestCandidate = null;
        let minDistance = Infinity;

        for (const el of elements) {
            if (el === currentFocus) continue;
            const r = el.getBoundingClientRect();
            const center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };

            const dx = center.x - curCenter.x;
            const dy = center.y - curCenter.y;

            let inDirection = false;
            let primary = 0, secondary = 0;

            if (direction === "UP" && dy < -5) {
                inDirection = true;
                primary = Math.abs(dy); secondary = Math.abs(dx);
            } else if (direction === "DOWN" && dy > 5) {
                inDirection = true;
                primary = Math.abs(dy); secondary = Math.abs(dx);
            } else if (direction === "LEFT" && dx < -5) {
                inDirection = true;
                primary = Math.abs(dx); secondary = Math.abs(dy);
            } else if (direction === "RIGHT" && dx > 5) {
                inDirection = true;
                primary = Math.abs(dx); secondary = Math.abs(dy);
            }

            if (inDirection) {
                const distance = Math.hypot(primary, secondary * 1.8);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestCandidate = el;
                }
            }
        }

        if (bestCandidate) {
            const isInput = bestCandidate.tagName === "INPUT" && bestCandidate.type !== "submit";
            setFocus(bestCandidate, isInput);
        } else {
            if (direction === "DOWN") window.scrollBy({ top: 300, behavior: "smooth" });
            else if (direction === "UP") window.scrollBy({ top: -300, behavior: "smooth" });
            else if (direction === "RIGHT") window.scrollBy({ left: 350, behavior: "smooth" });
            else if (direction === "LEFT") window.scrollBy({ left: -350, behavior: "smooth" });
        }
    }

    function simulateFullClick(el) {
        if (!el) return;
        const isInput = el.tagName === "INPUT" && el.type !== "submit";

        if (isInput) {
            el.focus();
            if (window.AndroidTV && window.AndroidTV.showKeyboard) {
                window.AndroidTV.showKeyboard();
            }
            return;
        }

        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
            const evt = new MouseEvent(type, {
                bubbles: true, cancelable: true, view: window,
                clientX: el.getBoundingClientRect().left + 5,
                clientY: el.getBoundingClientRect().top + 5
            });
            el.dispatchEvent(evt);
        });
    }

    // Android MainActivity'den doğrudan çağrılan donanım köprüsü
    window.onTvRemoteKey = function (key) {
        console.log("[EBA TV] Kumanda Tuşu Geldi:", key);

        // Eğer odak yoksa önce sayfayı tara
        if (!currentFocus || !document.body.contains(currentFocus)) {
            updatePage();
        }

        if (key === "UP") navigate("UP");
        else if (key === "DOWN") navigate("DOWN");
        else if (key === "LEFT") navigate("LEFT");
        else if (key === "RIGHT") navigate("RIGHT");
        else if (key === "ENTER") {
            if (currentFocus) {
                simulateFullClick(currentFocus);
            } else {
                updatePage();
                if (currentFocus) simulateFullClick(currentFocus);
            }
        }
    };

    function updatePage() {
        prepareElements();

        // 1. EBA Ana Sayfası Önceliği: Büyük Kırmızı "Giriş Yap" Butonu
        if (window.location.pathname === "/" || window.location.pathname === "") {
            const heroLoginBtn = document.querySelector('.hero-button-primary, a[href*="/login"], a.btn-primary');
            if (heroLoginBtn && (!currentFocus || currentFocus === document.body)) {
                setFocus(heroLoginBtn, false);
                return;
            }
        }

        // 2. Modern EBA Login Ekranı Önceliği: T.C. Kimlik Kutusu
        if (window.location.pathname.includes("login")) {
            const firstInput = document.querySelector('input:not([type="hidden"])');
            if (firstInput && (!currentFocus || currentFocus === document.body)) {
                setFocus(firstInput, true);
                return;
            }
        }

        // 3. e-Devlet Giriş Sayfası Önceliği: T.C. Kimlik Kutusu
        if (window.location.hostname.includes("edevlet")) {
            const trid = document.querySelector('#trid, input[name="trid"]');
            if (trid && (!currentFocus || currentFocus === document.body)) {
                setFocus(trid, true);
                return;
            }
        }

        // 4. Genel İlk Öğe
        if (!currentFocus || !document.body.contains(currentFocus)) {
            const elements = getFocusableElements();
            if (elements.length > 0) setFocus(elements[0]);
        }
    }

    const origPush = history.pushState;
    history.pushState = function () {
        origPush.apply(this, arguments);
        setTimeout(updatePage, 400);
    };

    window.addEventListener("popstate", () => setTimeout(updatePage, 400));
    window.addEventListener("DOMContentLoaded", updatePage);
    window.addEventListener("load", updatePage);

    setInterval(() => {
        if (!currentFocus || !document.body.contains(currentFocus) || window.getComputedStyle(currentFocus).display === 'none') {
            updatePage();
        }
    }, 600);

    const observer = new MutationObserver(() => updatePage());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    updatePage();
    setTimeout(updatePage, 600);
    setTimeout(updatePage, 1500);
})();
