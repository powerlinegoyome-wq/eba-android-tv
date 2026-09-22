/**
 * EBA Android TV Ultra Optimize Kumanda & Mekansal Navigasyon Motoru v2.0
 * 
 * Özellikler:
 * 1. SPA (Single Page App) Sayfa Geçişlerini Dinleme (pushState, popstate, hashchange)
 * 2. MutationObserver ile dinamik yüklenen ders kartlarını ve butonları anında yakalama
 * 3. Kaybolan odak kurtarma (Akıllı Auto-Recovery)
 * 4. Gelişmiş 2D Geometrik Mesafe Hesaplama (Spatial Navigation)
 * 5. Yatay Kayan Listeler / Karuseller için otomatik kaydırma (Horizontal Carousel Scroll)
 * 6. Video Oynatıcı Kontrolleri (OK = Duraklat/Oynat, Sol = -10sn, Sağ = +10sn)
 * 7. Çoklu Event Tetikleme (pointerdown, mousedown, mouseup, click - Vue/Angular/React uyumu)
 * 8. Açılır Pencereler / Modallar (Modal Focus Trapping)
 */

(function () {
    console.log("[EBA TV] Navigasyon Motoru Başlatılıyor...");

    // 1. Yüksek Kontrastlı TV Odak Stillerini Enjekte Et
    const styleId = "eba-tv-advanced-styles";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
            /* Seçili öğe için parlak TV çerçevesi */
            .tv-focused, *:focus {
                outline: 4px solid #ff9800 !important;
                outline-offset: 3px !important;
                box-shadow: 0 0 20px rgba(255, 152, 0, 0.9) !important;
                transform: scale(1.04) !important;
                transition: transform 0.12s ease-out, outline 0.12s ease-out !important;
                z-index: 99999 !important;
            }
            /* Fare imlecini tamamen kaldır */
            * {
                cursor: none !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            /* Video oynatıcıda odak çerçevesi */
            video.tv-focused {
                outline: 4px solid #2196f3 !important;
            }
        `;
        document.head.appendChild(style);
    }

    let currentFocus = null;

    // Etkileşimli öğe seçicisi (EBA'ya özel sınıflar dahil)
    const INTERACTIVE_SELECTOR = [
        'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select', 'textarea',
        '[tabindex="0"]', '[role="button"]', '[role="link"]', '[role="tab"]',
        '[onclick]', '.btn', '.button', '.card', '.course-card', '.unit-item',
        '.subject-item', '.lesson-box', '.video-item', '.exam-item', '.play-btn',
        'video', '.vjs-control', '.vjs-play-control'
    ].join(', ');

    // 2. Sayfadaki tıklanabilir öğeleri bulup odaklanabilir yapma
    function prepareElements(root = document) {
        try {
            const elements = root.querySelectorAll(INTERACTIVE_SELECTOR);
            elements.forEach(el => {
                if (!el.getAttribute("tabindex") && el.tagName !== "A" && el.tagName !== "BUTTON" && el.tagName !== "INPUT") {
                    el.setAttribute("tabindex", "0");
                }
            });
        } catch (e) {}
    }

    // 3. Görünür ve Odaklanabilir Öğeleri Filtreleme
    function getFocusableElements() {
        // Aktif bir modal/diyalog var mı kontrol et
        const modal = document.querySelector('.modal.show, .dialog, [role="dialog"], .swal2-container, .modal-dialog');
        const container = modal || document;

        const all = Array.from(container.querySelectorAll(INTERACTIVE_SELECTOR));
        return all.filter(el => {
            if (el.disabled || el.getAttribute("aria-hidden") === "true") return false;
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return false;

            const style = window.getComputedStyle(el);
            if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") return false;

            // Ekran sınırlarında veya yakınında mı?
            return rect.bottom >= -50 && rect.top <= (window.innerHeight + 50) &&
                   rect.right >= -50 && rect.left <= (window.innerWidth + 50);
        });
    }

    // 4. Akıllı Odak Verme ve Kurtarma
    function setFocus(el) {
        if (!el) return;
        if (currentFocus && currentFocus !== el) {
            currentFocus.classList.remove("tv-focused");
            try { currentFocus.blur(); } catch (e) {}
        }
        currentFocus = el;
        currentFocus.classList.add("tv-focused");
        try { currentFocus.focus(); } catch (e) {}

        // TV ekranında odağı merkeze kaydır (Yatay karuseller için de çalışır)
        currentFocus.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        });
    }

    function recoverFocusIfNeeded() {
        if (!currentFocus || !document.body.contains(currentFocus) || window.getComputedStyle(currentFocus).display === 'none') {
            const elements = getFocusableElements();
            if (elements.length > 0) {
                // Ekranın en sol-üstünde en belirgin öğeye odaklan
                setFocus(elements[0]);
            }
        }
    }

    // 5. Gelişmiş 2D Mekânsal Navigasyon (Açı ve Mesafe Ağırlıklı)
    function navigate(direction) {
        const elements = getFocusableElements();
        if (elements.length === 0) return;

        // Odak kaybolmuşsa hemen toparla
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

            if (direction === "UP" && dy < -5) {
                inDirection = true;
                primaryDist = Math.abs(dy);
                secondaryDist = Math.abs(dx);
            } else if (direction === "DOWN" && dy > 5) {
                inDirection = true;
                primaryDist = Math.abs(dy);
                secondaryDist = Math.abs(dx);
            } else if (direction === "LEFT" && dx < -5) {
                inDirection = true;
                primaryDist = Math.abs(dx);
                secondaryDist = Math.abs(dy);
            } else if (direction === "RIGHT" && dx > 5) {
                inDirection = true;
                primaryDist = Math.abs(dx);
                secondaryDist = Math.abs(dy);
            }

            if (inDirection) {
                // Ana eksendeki mesafe ile sapmayı oranla (dikey harekette yatay sapmaya ceza ver)
                const distance = Math.hypot(primaryDist, secondaryDist * 2.2);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestCandidate = el;
                }
            }
        }

        if (bestCandidate) {
            setFocus(bestCandidate);
        } else {
            // Eğer o yönde görünür aday yoksa ve eleman kaydırılabilir bir kap içindeyse sayfayı kaydır
            if (direction === "DOWN") window.scrollBy({ top: 250, behavior: "smooth" });
            else if (direction === "UP") window.scrollBy({ top: -250, behavior: "smooth" });
            else if (direction === "RIGHT") window.scrollBy({ left: 300, behavior: "smooth" });
            else if (direction === "LEFT") window.scrollBy({ left: -300, behavior: "smooth" });
            setTimeout(recoverFocusIfNeeded, 200);
        }
    }

    // 6. Eksiksiz Tıklama (Tüm event zincirini tetikle)
    function simulateFullClick(el) {
        if (!el) return;
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
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.focus();
        }
    }

    // 7. Video Oynatıcı Entegrasyonu
    function handleVideoKey(video, key) {
        if (key === "ENTER") {
            if (video.paused) video.play();
            else video.pause();
            return true;
        } else if (key === "LEFT") {
            video.currentTime = Math.max(0, video.currentTime - 10);
            return true;
        } else if (key === "RIGHT") {
            video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
            return true;
        }
        return false;
    }

    // 8. Tuş Dinleyici (Android D-Pad)
    window.addEventListener("keydown", function (e) {
        // Video oynatıcı üzerindeyse özel medya kontrolleri
        const activeVideo = currentFocus && (currentFocus.tagName === "VIDEO" ? currentFocus : currentFocus.querySelector("video"));
        
        switch (e.keyCode) {
            case 38: // UP
            case 19: // KEYCODE_DPAD_UP
                navigate("UP");
                e.preventDefault();
                break;
            case 40: // DOWN
            case 20: // KEYCODE_DPAD_DOWN
                navigate("DOWN");
                e.preventDefault();
                break;
            case 37: // LEFT
            case 21: // KEYCODE_DPAD_LEFT
                if (activeVideo && handleVideoKey(activeVideo, "LEFT")) {
                    e.preventDefault();
                } else {
                    navigate("LEFT");
                    e.preventDefault();
                }
                break;
            case 39: // RIGHT
            case 22: // KEYCODE_DPAD_RIGHT
                if (activeVideo && handleVideoKey(activeVideo, "RIGHT")) {
                    e.preventDefault();
                } else {
                    navigate("RIGHT");
                    e.preventDefault();
                }
                break;
            case 13: // ENTER
            case 23: // KEYCODE_DPAD_CENTER
                if (activeVideo && handleVideoKey(activeVideo, "ENTER")) {
                    e.preventDefault();
                } else if (currentFocus) {
                    simulateFullClick(currentFocus);
                    e.preventDefault();
                    setTimeout(recoverFocusIfNeeded, 400);
                }
                break;
        }
    }, true);

    // 9. SPA ve Dinamik Sayfa Geçişlerini İzleme (EBA SPA Uyumluluğu)
    function onRouteOrDOMChange() {
        prepareElements();
        setTimeout(recoverFocusIfNeeded, 300);
    }

    // pushState ve replaceState'i sar
    const origPush = history.pushState;
    history.pushState = function () {
        origPush.apply(this, arguments);
        onRouteOrDOMChange();
    };

    const origReplace = history.replaceState;
    history.replaceState = function () {
        origReplace.apply(this, arguments);
        onRouteOrDOMChange();
    };

    window.addEventListener("popstate", onRouteOrDOMChange);
    window.addEventListener("hashchange", onRouteOrDOMChange);

    // DOM değişikliklerini izle
    const observer = new MutationObserver((mutations) => {
        let shouldRefresh = false;
        for (const m of mutations) {
            if (m.addedNodes.length > 0) {
                shouldRefresh = true;
                break;
            }
        }
        if (shouldRefresh) {
            prepareElements();
            if (!currentFocus || !document.body.contains(currentFocus)) {
                recoverFocusIfNeeded();
            }
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    // İlk çalıştırma
    window.addEventListener("DOMContentLoaded", onRouteOrDOMChange);
    window.addEventListener("load", onRouteOrDOMChange);
    onRouteOrDOMChange();

    console.log("[EBA TV] Ultra Optimize Navigasyon Motoru Devrede.");
})();
