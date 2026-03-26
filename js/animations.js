// MarketMind Animations

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    init3DTilt();
});

// 1. Scroll Reveal
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: Stop observing once revealed
                // observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15, // Trigger when 15% visible
        rootMargin: "0px"
    });

    reveals.forEach(el => revealObserver.observe(el));
}

// 2. 3D Tilt for Feature Cards
function init3DTilt() {
    const cards = document.querySelectorAll('.feature-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate rotation (max 15deg)
            const xMid = rect.width / 2;
            const yMid = rect.height / 2;

            const rotateX = ((y - yMid) / yMid) * -10; // Invert Y for tilt
            const rotateY = ((x - xMid) / xMid) * 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;

            // Move Highlight
            card.style.setProperty('--x', `${x}px`);
            card.style.setProperty('--y', `${y}px`);
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}
