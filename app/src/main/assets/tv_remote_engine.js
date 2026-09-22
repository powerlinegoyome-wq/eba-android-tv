/**
 * EBA Android TV Evrensel Donanım Kumanda Motoru v7.0 (Precision Navigation)
 * 
 * 1. EBA Ana Sayfası: "Giriş Yap" butonuna otomatik odaklanma
 * 2. EBA Login Sayfası (/login):
 *    - T.C. Kimlik No
 *    - Şifre
 *    - Giriş Yap
 *    - e-Devlet Butonu (Mavi Ay-Yıldız)
 *    - MEBBİS / Öğretmen
 *    - EBA Kod / Karekod
 *    (Yukarı/Aşağı/Sağ/Sol ile tam sıralı geçiş)
 * 3. e-Devlet Sayfası (giris.edevlet.gov.tr):
 *    - T.C. Kimlik (#trid) -> Şifre (#egp_pwd) -> Giriş Yap (submit)
 * 4. Klavyenin otomatik açılması ve yazı yazarken engellenmeme
 */

(function () {
    console.log("[EBA TV v7.0] Hassas Kumanda Motoru Başlatıldı.");

    const styleId = "eba-tv-v7-styles";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
            .tv-focused, *:focus {
                outline: 5px solid #ff9800 !important;
                outline-offset: 4px !important;
                box-shadow: 0 0 35px rgba(255, 152, 0, 1) !important;
                transform: scale(1.03) !important;
                transition: transform 0.1s ease-out, outline 0.1s ease-out !important;
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

    // 1. Modern EBA Login (/login) İçin Özel Sıralı Navigasyon
    function handleEbaLoginNavigation(direction) {
        if (!window.location.pathname.includes("login")) return false;

        // Sayfadaki ana bileşenleri tespit et
        const tridInput = document.querySelector('input[type="text"], input:not([type="password"]):not([type="hidden"])');
        const pwdInput = document.querySelector('input[type="password"]');
        const loginBtn = document.querySelector('button[type="submit"], button.btn-primary') || 
                         Array.from(document.querySelectorAll('button, .btn')).find(b => b.textContent.includes('Giriş Yap'));
        
        // "veya şununla devam et" altındaki 3 kart (e-Devlet, MEBBİS, vb.)
        const iconCards = Array.from(document.querySelectorAll('div, button, a')).filter(el => {
            if (!el || el.children.length > 3) return false;
            const r = el.getBoundingClientRect();
            // Genişlik ve yükseklik yaklaşık kare (80-150px) ve ekranın alt yarısında
            return r.width >= 60 && r.width <= 200 && r.height >= 50 && r.height <= 150 && r.top > 400;
        });

        // e-Devlet (mavi ay-yıldız) ilk karttır
        const edevletBtn = iconCards[0] || null;
        const mebbisBtn = iconCards[1] || null;
        const ogretmenBtn = iconCards[2] || null;

        const otherLogins = Array.from(document.querySelectorAll('button, div, a')).filter(el => {
            const t = el.textContent || '';
            return t.includes('EBA Kod') || t.includes('Karekod');
        });
        const ebaKodBtn = otherLogins.find(el => el.textContent.includes('EBA Kod')) || null;
        const karekodBtn = otherLogins.find(el => el.textContent.includes('Karekod')) || null;

        if (direction === "DOWN") {
            if (currentFocus === tridInput && pwdInput) {
                setFocus(pwdInput, true); return true;
            } else if ((currentFocus === pwdInput || currentFocus?.tagName === 'SVG' || currentFocus?.className?.includes('eye')) && loginBtn) {
                setFocus(loginBtn, false); return true;
            } else if (currentFocus === loginBtn && edevletBtn) {
                setFocus(edevletBtn, false); return true;
            } else if ((currentFocus === edevletBtn || currentFocus === mebbisBtn || currentFocus === ogretmenBtn) && ebaKodBtn) {
                setFocus(ebaKodBtn, false); return true;
            } else if (currentFocus === ebaKodBtn && karekodBtn) {
                setFocus(karekodBtn, false); return true;
            }
        } else if (direction === "UP") {
            if (currentFocus === karekodBtn && ebaKodBtn) {
                setFocus(ebaKodBtn, false); return true;
            } else if (currentFocus === ebaKodBtn && edevletBtn) {
                setFocus(edevletBtn, false); return true;
            } else if ((currentFocus === edevletBtn || currentFocus === mebbisBtn || currentFocus === ogretmenBtn) && loginBtn) {
                setFocus(loginBtn, false); return true;
            } else if (currentFocus === loginBtn && pwdInput) {
                setFocus(pwdInput, true); return true;
            } else if (currentFocus === pwdInput && tridInput) {
                setFocus(tridInput, true); return true;
            }
        } else if (direction === "RIGHT") {
            if (currentFocus === edevletBtn && mebbisBtn) {
                setFocus(mebbisBtn, false); return true;
            } else if (currentFocus === mebbisBtn && ogretmenBtn) {
                setFocus(ogretmenBtn, false); return true;
            }
        } else if (direction === "LEFT") {
            if (currentFocus === ogretmenBtn && mebbisBtn) {
                setFocus(mebbisBtn, false); return true;
            } else if (currentFocus === mebbisBtn && edevletBtn) {
                setFocus(edevletBtn, false); return true;
            }
        }

        return false;
    }

    // 2. e-Devlet Giriş Ekranı (giris.edevlet.gov.tr) Navigasyonu
    function handleEdevletNavigation(direction) {
        if (!window.location.hostname.includes("edevlet")) return false;

        const isTrid = currentFocus && (currentFocus.id === "trid" || currentFocus.name === "trid");
        const isPwd = currentFocus && (currentFocus.id === "egp_pwd" || currentFocus.name === "egp_pwd" || currentFocus.type === "password");

        if (direction === "DOWN") {
            if (isTrid) {
                const pwd = document.querySelector('#egp_pwd, input[type="password"]');
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

    // 3. Genel 2D Geometrik Navigasyon
    function getFocusableElements() {
        const selector = 'input:not([type="hidden"]):not([disabled]), button:not([disabled]), a[href], textarea, select, [tabindex="0"], [role="button"], video';
        const all = Array.from(document.querySelectorAll(selector));

        return all.filter(el => {
            if (el.disabled || el.getAttribute("aria-hidden") === "true") return false;
            // Şifre gizle/göster göz ikonunu atla (navigasyonu bozmasın)
            if (el.tagName === 'BUTTON' && el.querySelector('svg') && !el.textContent.trim()) return false;
            
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return false;

            const style = window.getComputedStyle(el);
            if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") return false;

            return true;
        });
    }

    function navigate(direction) {
        // Özel form kurallarını kontrol et
        if (handleEbaLoginNavigation(direction)) return;
        if (handleEdevletNavigation(direction)) return;

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

    // Android MainActivity tarafından çağrılan köprü
    window.onTvRemoteKey = function (key) {
        console.log("[EBA TV v7] Kumanda Tuşu:", key);

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

        // 2. Modern EBA Login Sayfası (/login) Önceliği: T.C. Kimlik No Kutusu
        if (window.location.pathname.includes("login")) {
            const trid = document.querySelector('input[type="text"], input:not([type="password"]):not([type="hidden"])');
            if (trid) {
                setFocus(trid, true);
                return;
            }
        }

        // 3. e-Devlet Giriş Sayfası Önceliği: T.C. Kimlik Kutusu
        if (window.location.hostname.includes("edevlet")) {
            const trid = document.querySelector('#trid, input[name="trid"]');
            if (trid) {
                setFocus(trid, true);
                return;
            }
        }

        // 4. Genel İlk Öğe
        const elements = getFocusableElements();
        if (elements.length > 0) setFocus(elements[0]);
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
        if (isInvalidFocus(currentFocus)) {
            updatePage();
        }
    }, 600);

    const observer = new MutationObserver(() => {
        if (isInvalidFocus(currentFocus)) updatePage();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    updatePage();
    setTimeout(updatePage, 600);
    setTimeout(updatePage, 1500);
})();
