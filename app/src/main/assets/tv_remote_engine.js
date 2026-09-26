/**
 * EBA Android TV Evrensel Donanım Kumanda Motoru v9.0 (Full IME & Dynamic Form Support)
 */

(function () {
    console.log("[EBA TV v9.0] Kumanda ve Form Motoru Aktif.");

    const styleId = "eba-tv-v9-styles";
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

    function triggerNativeTap(el) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const x = (rect.left + rect.width / 2) * dpr;
        const y = (rect.top + rect.height / 2) * dpr;
        if (window.AndroidTV && window.AndroidTV.triggerTap) {
            window.AndroidTV.triggerTap(x, y);
        } else if (window.AndroidTV && window.AndroidTV.showKeyboard) {
            window.AndroidTV.showKeyboard();
        }
    }

    function setFocus(el, shouldTriggerTap = false) {
        if (!el) return;
        if (currentFocus && currentFocus !== el) {
            currentFocus.classList.remove("tv-focused");
        }
        currentFocus = el;
        currentFocus.classList.add("tv-focused");
        try { currentFocus.focus(); } catch (e) {}

        const isInput = (el.tagName === "INPUT" && el.type !== "submit" && el.type !== "button") || el.tagName === "TEXTAREA";

        if (isInput) {
            if (shouldTriggerTap) {
                triggerNativeTap(el);
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

    // Form Alanlarını Bulucu (EBA Giriş, e-Devlet SSO, MEBBİS, giris.turkiye.gov.tr)
    function findFormFields() {
        const trid = document.querySelector('#tridField, #trid, input[name="tridField"], input[name="trid"], input[placeholder*="Kimlik"], input[placeholder*="Öğrenci"], input[placeholder*="Kullanıcı"], input[name*="tckn"], input[name*="username"], input[name="tckn"]');
        const pwd = document.querySelector('#egpField, #egp_pwd, input[name="egpField"], input[name="egp_pwd"], input[type="password"]');
        
        let submitBtn = document.querySelector('button[name="submitButton"], input[name="submitButton"], .btn-send, input[type="submit"], button[type="submit"]');
        if (!submitBtn) {
            submitBtn = Array.from(document.querySelectorAll('button, .btn, input[type="button"]')).find(b => {
                const txt = (b.textContent || b.value || '').trim();
                return txt.includes('Giriş') && !txt.includes('e-Devlet') && !txt.includes('MEBBİS');
            });
        }

        let cancelBtn = document.querySelector('button[name="cancelButton"], input[name="cancelButton"], .btn-cancel, a.btn-cancel');
        if (!cancelBtn) {
            cancelBtn = Array.from(document.querySelectorAll('button, a, .btn, input')).find(b => {
                const txt = (b.textContent || b.value || '').trim();
                return txt.includes('İptal');
            });
        }

        let edevletBtn = document.querySelector('a[href*="edevlet"], a[href*="e-devlet"], button[name*="edevlet"], .btn-edevlet');
        if (!edevletBtn) {
            edevletBtn = Array.from(document.querySelectorAll('a, button, .btn')).find(b => {
                const txt = (b.textContent || b.getAttribute('title') || b.getAttribute('aria-label') || '').trim();
                return txt.toLowerCase().includes('e-devlet');
            });
        }

        return { trid, pwd, submitBtn, cancelBtn, edevletBtn };
    }

    // Form Navigasyonu (D-Pad ile alanlar arası kusursuz geçiş)
    function handleFormNavigation(direction) {
        if (!currentFocus) return false;

        const { trid, pwd, submitBtn, cancelBtn, edevletBtn } = findFormFields();
        if (!trid && !pwd && !submitBtn) return false;

        const isAtTrid = currentFocus === trid || (trid && trid.contains(currentFocus)) || currentFocus.id === "tridField" || currentFocus.id === "trid";
        const isAtPwd = currentFocus === pwd || (pwd && pwd.contains(currentFocus)) || currentFocus.id === "egpField" || currentFocus.id === "egp_pwd" || currentFocus.type === "password";
        const isAtSubmit = currentFocus === submitBtn || (submitBtn && submitBtn.contains(currentFocus));
        const isAtCancel = currentFocus === cancelBtn || (cancelBtn && cancelBtn.contains(currentFocus));
        const isAtEdevlet = currentFocus === edevletBtn || (edevletBtn && edevletBtn.contains(currentFocus));

        if (direction === "DOWN") {
            if (isAtTrid && pwd) {
                setFocus(pwd, false);
                return true;
            } else if (isAtPwd && submitBtn) {
                setFocus(submitBtn, false);
                return true;
            } else if (isAtSubmit && edevletBtn) {
                setFocus(edevletBtn, false);
                return true;
            }
        } else if (direction === "UP") {
            if (isAtEdevlet && submitBtn) {
                setFocus(submitBtn, false);
                return true;
            } else if ((isAtSubmit || isAtCancel) && pwd) {
                setFocus(pwd, false);
                return true;
            } else if (isAtPwd && trid) {
                setFocus(trid, false);
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

    // Geometrik Navigasyon Öğe Listesi (Sanal klavye ve şifre göz ikonlarını filtreler)
    function getFocusableElements() {
        const selector = 'input:not([type="hidden"]):not([disabled]), button:not([disabled]), a[href], textarea, select, [tabindex="0"], [role="button"], video';
        const all = Array.from(document.querySelectorAll(selector));

        return all.filter(el => {
            if (el.disabled || el.getAttribute("aria-hidden") === "true") return false;

            // Şifre gösterme/gizleme ikon butonlarını atla
            if (el.tagName === 'BUTTON' && el.querySelector('svg') && !el.textContent.trim()) return false;

            // Sayfadaki yerleşik sanal klavye butonlarını atla (TV'nin kendi klavyesi kullanılır)
            if (el.classList.contains('vk-btn') || el.classList.contains('keypad-key') || 
                el.classList.contains('keyboard-key') || el.classList.contains('virtualKeypad') || 
                el.classList.contains('virtualKeyboard') || el.classList.contains('btn-action') || 
                el.classList.contains('hide-tck')) {
                return false;
            }

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
            setFocus(elements[0], false);
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
            setFocus(bestCandidate, false);
        } else {
            if (direction === "DOWN") window.scrollBy({ top: 300, behavior: "smooth" });
            else if (direction === "UP") window.scrollBy({ top: -300, behavior: "smooth" });
            else if (direction === "RIGHT") window.scrollBy({ left: 350, behavior: "smooth" });
            else if (direction === "LEFT") window.scrollBy({ left: -350, behavior: "smooth" });
        }
    }

    function simulateFullClick(el) {
        if (!el) return;
        const isInput = (el.tagName === "INPUT" && el.type !== "submit" && el.type !== "button") || el.tagName === "TEXTAREA";

        if (isInput) {
            try { el.focus(); } catch (e) {}
            triggerNativeTap(el);
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

        if (typeof el.click === "function") {
            try { el.click(); } catch (e) {}
        }
    }

    // Donanım Kumanda Tuş Köprüsü
    window.onTvRemoteKey = function (key) {
        console.log("[EBA TV v9] Kumanda:", key);

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

        // 1. Form Sayfası Önceliği (e-Devlet / SSO / EBA Giriş)
        const { trid, pwd } = findFormFields();
        if (trid) {
            setFocus(trid, false);
            return;
        } else if (pwd) {
            setFocus(pwd, false);
            return;
        }

        // 2. EBA Ana Sayfası Önceliği: Büyük Kırmızı "Giriş Yap" Butonu
        if (window.location.pathname === "/" || window.location.pathname === "") {
            const heroLoginBtn = document.querySelector('.hero-button-primary, a[href*="/login"], a.btn-primary');
            if (heroLoginBtn) {
                setFocus(heroLoginBtn, false);
                return;
            }
        }

        // 3. Genel İlk Öğe
        const elements = getFocusableElements();
        if (elements.length > 0) setFocus(elements[0], false);
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
