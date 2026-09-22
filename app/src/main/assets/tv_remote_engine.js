/**
 * EBA Android TV Kumanda, Klavye & Mekansal Navigasyon Motoru v3.0
 * 
 * Özel İyileştirmeler:
 * 1. e-Devlet ve Giriş Ekranları Özel Form Yönetimi (T.C. -> Şifre -> Giriş Yap)
 * 2. Sanal Klavye Otomatik Tetikleme (AndroidTV.showKeyboard)
 * 3. Yazı yazma alanından (Input) çıkamama hatası düzeltildi (Yukarı/Aşağı ile alanlar arası geçiş)
 * 4. Klavyede yazı yazarken tuşların engellenmesi engellendi (Yazma serbestisi)
 * 5. Modern EBA (www.eba.gov.tr) dinamik bileşen ve menü uyumu
 */

(function () {
    console.log("[EBA TV v3] Akıllı Navigasyon ve Klavye Motoru Devrede.");

    // 1. TV Odak Stilleri
    const styleId = "eba-tv-v3-styles";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
            .tv-focused, *:focus {
                outline: 4px solid #ff9800 !important;
                outline-offset: 3px !important;
                box-shadow: 0 0 25px rgba(255, 152, 0, 0.95) !important;
                transform: scale(1.03) !important;
                transition: transform 0.12s ease-out, outline 0.12s ease-out !important;
                z-index: 99999 !important;
            }
            /* Input alanlarında mavi odak */
            input.tv-focused, textarea.tv-focused {
                outline: 4px solid #00bcd4 !important;
                box-shadow: 0 0 25px rgba(0, 188, 212, 0.95) !important;
                background-color: #fffde7 !important;
            }
            /* Fare imlecini gizle */
            * {
                cursor: none !important;
                -webkit-tap-highlight-color: transparent !important;
            }
        `;
        document.head.appendChild(style);
    }

    let currentFocus = null;

    const INTERACTIVE_SELECTOR = [
        'input:not([type="hidden"]):not([disabled])',
        'button:not([disabled])',
        'a[href]',
        'textarea',
        'select',
        '[tabindex="0"]',
        '[role="button"]',
        '[role="link"]',
        '[onclick]',
        '.btn',
        '.button',
        '.card',
        '.course-card',
        '.unit-item',
        '.video-item',
        'video'
    ].join(', ');

    // 2. Tıklanabilir öğeleri bul
    function prepareElements() {
        try {
            document.querySelectorAll(INTERACTIVE_SELECTOR).forEach(el => {
                if (!el.getAttribute("tabindex") && el.tagName !== "INPUT" && el.tagName !== "BUTTON" && el.tagName !== "A") {
                    el.setAttribute("tabindex", "0");
                }
            });
        } catch (e) {}
    }

    // 3. Görünür Öğeleri Listele
    function getFocusableElements() {
        const modal = document.querySelector('.modal.show, .dialog, [role="dialog"], .swal2-container');
        const container = modal || document;

        const all = Array.from(container.querySelectorAll(INTERACTIVE_SELECTOR));
        return all.filter(el => {
            if (el.disabled || el.getAttribute("aria-hidden") === "true") return false;
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return false;

            const style = window.getComputedStyle(el);
            if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") return false;

            return rect.bottom >= -50 && rect.top <= (window.innerHeight + 50) &&
                   rect.right >= -50 && rect.left <= (window.innerWidth + 50);
        });
    }

    // 4. Odak Verme ve Klavye Yönetimi
    function setFocus(el, shouldOpenKeyboard = false) {
        if (!el) return;
        if (currentFocus && currentFocus !== el) {
            currentFocus.classList.remove("tv-focused");
        }
        currentFocus = el;
        currentFocus.classList.add("tv-focused");
        try { currentFocus.focus(); } catch (e) {}

        const isInput = (el.tagName === "INPUT" && el.type !== "submit" && el.type !== "button" && el.type !== "checkbox") || el.tagName === "TEXTAREA";

        if (isInput) {
            if (shouldOpenKeyboard && window.AndroidTV && window.AndroidTV.showKeyboard) {
                window.AndroidTV.showKeyboard();
            }
        } else {
            // Input dışı bir yere geçildiyse klavyeyi gizle
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

    // 5. e-Devlet ve Form Odak Sıralayıcısı (Özel Kural)
    function handleFormNavigation(direction) {
        if (!currentFocus) return false;
        
        // e-Devlet veya standart form alanları
        const isTrid = currentFocus.id === "trid" || currentFocus.name === "trid";
        const isPwd = currentFocus.id === "egp_pwd" || currentFocus.type === "password";

        if (direction === "DOWN") {
            if (isTrid) {
                const pwdInput = document.querySelector('input[type="password"], #egp_pwd');
                if (pwdInput) {
                    setFocus(pwdInput, true);
                    return true;
                }
            } else if (isPwd) {
                const submitBtn = document.querySelector('input[type="submit"], button[name="submitButton"], .btn-primary, button[type="submit"]');
                if (submitBtn) {
                    setFocus(submitBtn, false);
                    return true;
                }
            }
        } else if (direction === "UP") {
            if (isPwd) {
                const tridInput = document.querySelector('#trid, input[name="trid"], input[type="text"]');
                if (tridInput) {
                    setFocus(tridInput, true);
                    return true;
                }
            }
        }
        return false;
    }

    // 6. 2D Mekânsal Navigasyon
    function navigate(direction) {
        // Önce form/e-Devlet özel kuralını dene
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
            let primaryDist = 0;
            let secondaryDist = 0;

            if (direction === "UP" && dy < -4) {
                inDirection = true;
                primaryDist = Math.abs(dy);
                secondaryDist = Math.abs(dx);
            } else if (direction === "DOWN" && dy > 4) {
                inDirection = true;
                primaryDist = Math.abs(dy);
                secondaryDist = Math.abs(dx);
            } else if (direction === "LEFT" && dx < -4) {
                inDirection = true;
                primaryDist = Math.abs(dx);
                secondaryDist = Math.abs(dy);
            } else if (direction === "RIGHT" && dx > 4) {
                inDirection = true;
                primaryDist = Math.abs(dx);
                secondaryDist = Math.abs(dy);
            }

            if (inDirection) {
                // Ana eksene göre ağırlıklı mesafe
                const distance = Math.hypot(primaryDist, secondaryDist * 1.8);
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
            // Aday bulunamazsa sayfayı kaydır
            if (direction === "DOWN") window.scrollBy({ top: 250, behavior: "smooth" });
            else if (direction === "UP") window.scrollBy({ top: -250, behavior: "smooth" });
            else if (direction === "RIGHT") window.scrollBy({ left: 300, behavior: "smooth" });
            else if (direction === "LEFT") window.scrollBy({ left: -300, behavior: "smooth" });
        }
    }

    // 7. Tıklama
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
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: el.getBoundingClientRect().left + 5,
                clientY: el.getBoundingClientRect().top + 5
            });
            el.dispatchEvent(evt);
        });
    }

    // 8. Tuş Dinleyicisi
    window.addEventListener("keydown", function (e) {
        const isCurrentlyTyping = currentFocus && 
            (currentFocus.tagName === "INPUT" && currentFocus.type !== "submit") && 
            document.activeElement === currentFocus;

        // D-Pad Yön Tuşları
        if (e.keyCode === 38 || e.keyCode === 19) { // UP
            navigate("UP");
            e.preventDefault();
        } else if (e.keyCode === 40 || e.keyCode === 20) { // DOWN
            navigate("DOWN");
            e.preventDefault();
        } else if (e.keyCode === 37 || e.keyCode === 21) { // LEFT
            // Eğer bir input içinde yazı yazılıyorsa metin içinde imleç hareketine izin ver
            if (isCurrentlyTyping && currentFocus.value && currentFocus.selectionStart > 0) {
                return; // Normal imleç hareket etsin
            }
            navigate("LEFT");
            e.preventDefault();
        } else if (e.keyCode === 39 || e.keyCode === 22) { // RIGHT
            if (isCurrentlyTyping && currentFocus.value && currentFocus.selectionStart < currentFocus.value.length) {
                return;
            }
            navigate("RIGHT");
            e.preventDefault();
        } else if (e.keyCode === 13 || e.keyCode === 23) { // OK / ENTER
            if (currentFocus) {
                simulateFullClick(currentFocus);
                // Submit butonu değilse default davranışı engelle
                if (currentFocus.type !== "submit") {
                    e.preventDefault();
                }
            }
        }
        // Diğer tuşlar (harfler, rakamlar, Backspace vb.) engellenmez; doğrudan inputa yazılır.
    }, true);

    // 9. Sayfa Değişikliklerini Dinleme (SPA ve DOM)
    function onPageUpdate() {
        prepareElements();
        // Eğer e-Devlet giriş sayfasındaysak doğrudan T.C. kutucuğuna odaklan
        if (window.location.hostname.includes("edevlet")) {
            const trid = document.querySelector('#trid, input[name="trid"]');
            if (trid) {
                setTimeout(() => setFocus(trid, true), 300);
                return;
            }
        }
        // Sayfada ilk odak yoksa ilk öğeye odaklan
        if (!currentFocus || !document.body.contains(currentFocus)) {
            const elements = getFocusableElements();
            if (elements.length > 0) setFocus(elements[0]);
        }
    }

    const origPush = history.pushState;
    history.pushState = function () {
        origPush.apply(this, arguments);
        setTimeout(onPageUpdate, 300);
    };

    window.addEventListener("popstate", () => setTimeout(onPageUpdate, 300));
    window.addEventListener("DOMContentLoaded", onPageUpdate);
    window.addEventListener("load", onPageUpdate);

    const observer = new MutationObserver(() => prepareElements());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    onPageUpdate();
})();
