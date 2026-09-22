/**
 * EBA Android TV Evrensel Donanım Kumanda Motoru v8.0 (Bulletproof SSO & Login)
 */

(function () {
    console.log("[EBA TV v8.0] SSO & Giriş Motoru Aktif.");

    const styleId = "eba-tv-v8-styles";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
            .tv-focused, *:focus {
                outline: 5px solid #ff9800 !important;
                outline-offset: 4px !important;
                box-shadow: 0 0 35px rgba(255, 152, 0, 1) !important;
                transform: scale(1.03) !important;
                transition: transform 0.08s ease-out, outline 0.08s ease-out !important;
                z-index: 999999 !important;
            }
            input.tv-focused, textarea.tv-focused {
                outline: 5px solid #00e5ff !important;
                box-shadow: 0 0 35px rgba(0, 229, 255, 1) !important;
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

    function isInvalidFocus(el) {
        return !el || !document.body.contains(el) || el === document.body || window.getComputedStyle(el).display === 'none';
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

    // Evrensel Form Navigasyonu (e-Devlet, SSO, MEBBİS, EBA Login için etki alanı bağımsız)
    function handleFormNavigation(direction) {
        if (!currentFocus) return false;

        const trid = document.querySelector('#trid, input[name="trid"], input[placeholder*="Kimlik"], input[type="text"], input[type="number"]');
        const pwd = document.querySelector('#egp_pwd, input[name="egp_pwd"], input[type="password"]');
        
        // Giriş Yap ve İptal Butonları
        let submitBtn = document.querySelector('input[type="submit"], button[type="submit"], button[name="submitButton"], .btn-primary');
        if (!submitBtn) {
            submitBtn = Array.from(document.querySelectorAll('button, .btn, input[type="button"]')).find(b => (b.textContent || b.value || '').includes('Giriş'));
        }

        let cancelBtn = document.querySelector('input[value*="İptal"], a.btn-cancel, .btn-default');
        if (!cancelBtn) {
            cancelBtn = Array.from(document.querySelectorAll('button, a, .btn, input')).find(b => (b.textContent || b.value || '').includes('İptal'));
        }

        const isAtTrid = currentFocus === trid || currentFocus.id === "trid" || currentFocus.name === "trid";
        const isAtPwd = currentFocus === pwd || currentFocus.id === "egp_pwd" || currentFocus.type === "password";
        const isAtSubmit = currentFocus === submitBtn || (submitBtn && submitBtn.contains(currentFocus));
        const isAtCancel = currentFocus === cancelBtn || (cancelBtn && cancelBtn.contains(currentFocus));

        if (direction === "DOWN") {
            if (isAtTrid && pwd) {
                setFocus(pwd, true);
                return true;
            } else if (isAtPwd && submitBtn) {
                setFocus(submitBtn, false);
                return true;
            }
        } else if (direction === "UP") {
            if ((isAtSubmit || isAtCancel) && pwd) {
                setFocus(pwd, true);
                return true;
            } else if (isAtPwd && trid) {
                setFocus(trid, true);
                return true;
            }
        } else if (direction === "LEFT") {
            if (isAtSubmit && cancelBtn) {
                setFocus(cancelBtn, false);
                return true;
            }
        } else if (direction === "RIGHT") {
            if (isAtCancel && submitBtn) {
                setFocus(submitBtn, false);
                return true;
            }
        }

        return false;
    }

    // Genel Geometrik Navigasyon
    function getFocusableElements() {
        const selector = 'input:not([type="hidden"]):not([disabled]), button:not([disabled]), a[href], textarea, select, [tabindex="0"], [role="button"], video';
        const all = Array.from(document.querySelectorAll(selector));

        return all.filter(el => {
            if (el.disabled || el.getAttribute("aria-hidden") === "true") return false;
            // Şifre gösterme ikonunu atla
            if (el.tagName === 'BUTTON' && el.querySelector('svg') && !el.textContent.trim()) return false;

            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return false;

            const style = window.getComputedStyle(el);
            if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") return false;

            return true;
        });
    }

    function navigate(direction) {
        if (handleFormNavigation(direction)) return;

        const elements = getFocusableElements();
        if (elements.length === 0) return;

        if (isInvalidFocus(currentFocus)) {
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

    // Donanım Kumanda Tuş Köprüsü
    window.onTvRemoteKey = function (key) {
        console.log("[EBA TV v8] Kumanda:", key);

        if (isInvalidFocus(currentFocus)) {
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
        if (!isInvalidFocus(currentFocus)) return;

        // 1. EBA Ana Sayfası Önceliği: Büyük Kırmızı "Giriş Yap" Butonu
        if (window.location.pathname === "/" || window.location.pathname === "") {
            const heroLoginBtn = document.querySelector('.hero-button-primary, a[href*="/login"], a.btn-primary');
            if (heroLoginBtn) {
                setFocus(heroLoginBtn, false);
                return;
            }
        }

        // 2. Form Sayfası Önceliği (e-Devlet / SSO / EBA Login): Her zaman T.C. Kimlik kutusuna odaklan
        const trid = document.querySelector('#trid, input[name="trid"], input[placeholder*="Kimlik"], input[type="text"]');
        if (trid) {
            setFocus(trid, true);
            return;
        }

        // 3. Genel İlk Öğe
        const elements = getFocusableElements();
        if (elements.length > 0) setFocus(elements[0]);
    }

    const origPush = history.pushState;
    history.pushState = function () {
        origPush.apply(this, arguments);
        setTimeout(updatePage, 350);
    };

    window.addEventListener("popstate", () => setTimeout(updatePage, 350));
    window.addEventListener("DOMContentLoaded", updatePage);
    window.addEventListener("load", updatePage);

    setInterval(() => {
        if (isInvalidFocus(currentFocus)) {
            updatePage();
        }
    }, 500);

    const observer = new MutationObserver(() => {
        if (isInvalidFocus(currentFocus)) updatePage();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    updatePage();
    setTimeout(updatePage, 500);
})();
