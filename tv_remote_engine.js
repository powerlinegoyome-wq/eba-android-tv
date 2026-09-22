/**
 * EBA Android TV Kumanda ve Mekansal Odak Motoru
 * Herhangi bir fare imleci olmadan sayfadaki en yakın butona geometrik olarak atlar.
 */
(function() {
    // 1. TV Odak Stillerini Ekle
    const style = document.createElement('style');
    style.id = 'eba-tv-focus-styles';
    style.innerHTML = `
        /* Kumanda ile secili olan ogeyi parlat */
        *:focus, .tv-focused {
            outline: 4px solid #ff9800 !important;
            outline-offset: 3px !important;
            box-shadow: 0 0 15px rgba(255, 152, 0, 0.8) !important;
            transform: scale(1.03) !important;
            transition: transform 0.15s ease, outline 0.15s ease !important;
            z-index: 999999 !important;
        }
        /* Fare imlecini tamamen gizle */
        * {
            cursor: none !important;
            user-select: none !important;
            -webkit-user-select: none !important;
        }
    `;
    if (!document.getElementById('eba-tv-focus-styles')) {
        document.head.appendChild(style);
    }

    // 2. Tiklanabilir tum ogeleri tespit et ve odaklanabilir yap
    function makeInteractiveFocusable() {
        const selector = 'a, button, input, [role="button"], [onclick], .btn, .card, .course-box, .subject-item';
        document.querySelectorAll(selector).forEach(el => {
            if (!el.getAttribute('tabindex')) {
                el.setAttribute('tabindex', '0');
            }
        });
    }

    makeInteractiveFocusable();
    setInterval(makeInteractiveFocusable, 2000); // Dinamik AJAX icerikleri icin

    // 3. Geometrik Mesafe ve Yon Hesaplama (Spatial Navigation)
    function getFocusableElements() {
        return Array.from(document.querySelectorAll('[tabindex="0"], a, button, input'))
            .filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && 
                       window.getComputedStyle(el).visibility !== 'hidden' &&
                       window.getComputedStyle(el).display !== 'none';
            });
    }

    let currentFocus = null;

    function moveFocus(direction) {
        const elements = getFocusableElements();
        if (elements.length === 0) return;

        if (!currentFocus || !document.body.contains(currentFocus)) {
            currentFocus = elements[0];
            currentFocus.focus();
            currentFocus.classList.add('tv-focused');
            return;
        }

        const curRect = currentFocus.getBoundingClientRect();
        const curCenter = { x: curRect.left + curRect.width / 2, y: curRect.top + curRect.height / 2 };

        let bestCandidate = null;
        let minDistance = Infinity;

        elements.forEach(el => {
            if (el === currentFocus) return;
            const r = el.getBoundingClientRect();
            const center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };

            let isValid = false;
            let weightX = 1, weightY = 1;

            if (direction === 'UP' && center.y < curCenter.y - 10) {
                isValid = true;
                weightX = 2.0; // Dikey hareketlerde yatay sapmaya ceza ver
            } else if (direction === 'DOWN' && center.y > curCenter.y + 10) {
                isValid = true;
                weightX = 2.0;
            } else if (direction === 'LEFT' && center.x < curCenter.x - 10) {
                isValid = true;
                weightY = 2.0;
            } else if (direction === 'RIGHT' && center.x > curCenter.x + 10) {
                isValid = true;
                weightY = 2.0;
            }

            if (isValid) {
                const dx = (center.x - curCenter.x) * weightX;
                const dy = (center.y - curCenter.y) * weightY;
                const dist = Math.hypot(dx, dy);

                if (dist < minDistance) {
                    minDistance = dist;
                    bestCandidate = el;
                }
            }
        });

        if (bestCandidate) {
            if (currentFocus) {
                currentFocus.classList.remove('tv-focused');
                currentFocus.blur();
            }
            currentFocus = bestCandidate;
            currentFocus.focus();
            currentFocus.classList.add('tv-focused');
            currentFocus.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }

    // 4. Android TV Kumanda Tuslarini Yakala
    window.addEventListener('keydown', function(e) {
        // D-PAD Yön Tuşları
        if (e.keyCode === 38 || e.key === 'ArrowUp') { // UP
            moveFocus('UP');
            e.preventDefault();
        } else if (e.keyCode === 40 || e.key === 'ArrowDown') { // DOWN
            moveFocus('DOWN');
            e.preventDefault();
        } else if (e.keyCode === 37 || e.key === 'ArrowLeft') { // LEFT
            moveFocus('LEFT');
            e.preventDefault();
        } else if (e.keyCode === 39 || e.key === 'ArrowRight') { // RIGHT
            moveFocus('RIGHT');
            e.preventDefault();
        } else if (e.keyCode === 13 || e.key === 'Enter') { // OK / CENTER
            if (currentFocus) {
                currentFocus.click();
            }
        }
    });

    console.log('[+] EBA TV Kumanda Motoru Aktif.');
})();
