/**
 * EBA Android TV Evrensel Kumanda & Mekansal Navigasyon Motoru v4.0 (Universal)
 * 
 * Yenilikler:
 * 1. Otomatik Modal / Duyuru Yakalama (Duyuru çıkarsa 'Kapat' veya 'Tamam'a anında odaklanır)
 * 2. iFrame ve Alt Sayfa Taraması (Test soruları ve interaktif modüller)
 * 3. Açılır Menüler (Dropdowns & Navbar Menüleri)
 * 4. Sabit Başlık (Sticky Header) Dengeleme
 * 5. Asla Kaybolmayan Sürekli Odak Koruması (Focus Guard)
 */

(function () {
    console.log("[EBA TV v4.0 Universal] Navigasyon Motoru Devrede.");

    const styleId = "eba-tv-v4-styles";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
            .tv-focused, *:focus {
                outline: 4px solid #ff9800 !important;
                outline-offset: 3px !important;
                box-shadow: 0 0 25px rgba(255, 152, 0, 0.95) !important;
                transform: scale(1.03) !important;
                transition: transform 0.1s ease-out, outline 0.1s ease-out !important;
                z-index: 99999 !important;
            }
            input.tv-focused, textarea.tv-focused {
                outline: 4px solid #00bcd4 !important;
                box-shadow: 0 0 25px rgba(0, 188, 212, 0.95) !important;
                background-color: #fffde7 !important;
            }
            /* Kapat butonları için özel kırmızı odak */
            .modal-close.tv-focused, .btn-close.tv-focused, [data-dismiss="modal"].tv-focused {
                outline: 4px solid #f44336 !important;
                box-shadow: 0 0 25px rgba(244, 67, 54, 0.95) !important;
            }
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
        '[role="tab"]',
        '[onclick]',
        '.btn', '.button',
        '.card', '.course-card', '.unit-item', '.subject-item',
        '.video-item', '.exam-item', '.lesson-box',
        '.dropdown-item', '.nav-link', '.menu-item',
        'video'
    ].join(', ');

    // 1. Tıklanabilir tüm öğeleri hazırla (iFrameler dahil)
    function prepareElements(doc = document) {
        try {
            doc.querySelectorAll(INTERACTIVE_SELECTOR).forEach(el => {
                if (!el.getAttribute("tabindex") && el.tagName !== "INPUT" && el.tagName !== "BUTTON" && el.tagName !== "A") {
                    el.setAttribute("tabindex", "0");
                }
            });

            // Erişilebilir iFrameleri de tara
            doc.querySelectorAll('iframe').forEach(iframe => {
                try {
                    const iDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (iDoc) prepareElements(iDoc);
                } catch (e) {}
            });
        } catch (e) {}
    }

    // 2. Ekrandaki aktif ve görünür öğeleri topla
    function getFocusableElements() {
        // Öncelik 1: Açık bir modal/duyuru var mı?
        const modal = document.querySelector('.modal.show, .dialog, [role="dialog"], .swal2-container, .modal-dialog, .popup-container');
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

    // 3. Odak Yönetimi
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
            if (window.AndroidTV && window.AndroidTV.hideKeyboard) {
                window.AndroidTV.hideKeyboard();
            }
        }

        // Sabit başlıkları hesaba katarak ortala
        currentFocus.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        });
    }

    // 4. Modal / Duyuru Varsa Doğrudan Butonuna Odaklan
    function checkAndFocusModals() {
        const modal = document.querySelector('.modal.show, [role="dialog"], .swal2-container, .announcement-popup');
        if (modal) {
            const btn = modal.querySelector('button.close, .btn-close, .btn-primary, [data-dismiss="modal"], button');
            if (btn && currentFocus !== btn) {
                setFocus(btn, false);
                return true;
            }
        }
        return false;
    }

    // 5. e-Devlet Giriş Formu Otomasyonu
    function handleFormNavigation(direction) {
        if (!currentFocus) return false;
        const isTrid = currentFocus.id === "trid" || currentFocus.name === "trid";
        const isPwd = currentFocus.id === "egp_pwd" || currentFocus.type === "password";

        if (direction === "DOWN") {
            if (isTrid) {
                const pwd = document.querySelector('input[type="password"], #egp_pwd');
                if (pwd) { setFocus(pwd, true); return true; }
            } else if (isPwd) {
                const btn = document.querySelector('input[type="submit"], button[name="submitButton"], .btn-primary, button[type="submit"]');
                if (btn) { setFocus(btn, false); return true; }
            }
        } else if (direction === "UP") {
            if (isPwd) {
                const trid = document.querySelector('#trid, input[name="trid"], input[type="text"]');
                if (trid) { setFocus(trid, true); return true; }
            }
        }
        return false;
    }

    // 6. 2D Mekânsal Navigasyon
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

            if (direction === "UP" && dy < -4) {
                inDirection = true;
                primary = Math.abs(dy); secondary = Math.abs(dx);
            } else if (direction === "DOWN" && dy > 4) {
                inDirection = true;
                primary = Math.abs(dy); secondary = Math.abs(dx);
            } else if (direction === "LEFT" && dx < -4) {
                inDirection = true;
                primary = Math.abs(dx); secondary = Math.abs(dy);
            } else if (direction === "RIGHT" && dx > 4) {
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
            // Görünür sınırda öğe yoksa sayfayı kaydır
            if (direction === "DOWN") window.scrollBy({ top: 300, behavior: "smooth" });
            else if (direction === "UP") window.scrollBy({ top: -300, behavior: "smooth" });
            else if (direction === "RIGHT") window.scrollBy({ left: 350, behavior: "smooth" });
            else if (direction === "LEFT") window.scrollBy({ left: -350, behavior: "smooth" });
        }
    }

    // 7. Eksiksiz Tıklama
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

    // 8. Tuş Dinleyici
    window.addEventListener("keydown", function (e) {
        const isCurrentlyTyping = currentFocus && 
            (currentFocus.tagName === "INPUT" && currentFocus.type !== "submit") && 
            document.activeElement === currentFocus;

        if (e.keyCode === 38 || e.keyCode === 19) { // UP
            navigate("UP"); e.preventDefault();
        } else if (e.keyCode === 40 || e.keyCode === 20) { // DOWN
            navigate("DOWN"); e.preventDefault();
        } else if (e.keyCode === 37 || e.keyCode === 21) { // LEFT
            if (isCurrentlyTyping && currentFocus.value && currentFocus.selectionStart > 0) return;
            navigate("LEFT"); e.preventDefault();
        } else if (e.keyCode === 39 || e.keyCode === 22) { // RIGHT
            if (isCurrentlyTyping && currentFocus.value && currentFocus.selectionStart < currentFocus.value.length) return;
            navigate("RIGHT"); e.preventDefault();
        } else if (e.keyCode === 13 || e.keyCode === 23) { // OK / ENTER
            if (currentFocus) {
                simulateFullClick(currentFocus);
                if (currentFocus.type !== "submit") e.preventDefault();
            }
        }
    }, true);

    // 9. Dinamik Sayfa Güncelleme ve Sürekli Odak Koruması
    function updatePage() {
        prepareElements();
        if (checkAndFocusModals()) return;

        // e-Devlet girişindeyse T.C. kutucuğuna odaklan
        if (window.location.hostname.includes("edevlet")) {
            const trid = document.querySelector('#trid, input[name="trid"]');
            if (trid && currentFocus !== trid && !document.activeElement.tagName.includes("INPUT")) {
                setTimeout(() => setFocus(trid, true), 300);
                return;
            }
        }

        if (!currentFocus || !document.body.contains(currentFocus)) {
            const elements = getFocusableElements();
            if (elements.length > 0) setFocus(elements[0]);
        }
    }

    const origPush = history.pushState;
    history.pushState = function () {
        origPush.apply(this, arguments);
        setTimeout(updatePage, 350);
    };

    window.addEventListener("popstate", () => setTimeout(updatePage, 350));
    window.addEventListener("DOMContentLoaded", updatePage);
    window.addEventListener("load", updatePage);

    // Sürekli Odak Koruyucu (Sayfa değiştiğinde veya odak düştüğünde 1 saniyede bir kurtarır)
    setInterval(() => {
        if (!currentFocus || !document.body.contains(currentFocus) || window.getComputedStyle(currentFocus).display === 'none') {
            updatePage();
        }
    }, 1200);

    const observer = new MutationObserver(() => prepareElements());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    updatePage();
})();
