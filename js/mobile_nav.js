/**
 * Mobile Navigation & Interaction Logic
 * Handles active nav states and modal transitions.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Set Active Nav State
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard_mobile.html';
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        // Handle both root and pages/ directory paths
        if (href && (href.includes(currentPath) || currentPath.includes(href.split('/').pop()))) {
            item.classList.add('active');
        }
    });

    // 2. Modal Logic
    window.openMobileModal = function(modalId) {
        const backdrop = document.querySelector('.modal-backdrop');
        const modal = document.getElementById(modalId);
        
        if (!backdrop || !modal) return;

        // Hide all other modals first
        document.querySelectorAll('.modal-content').forEach(m => m.classList.remove('active'));
        
        backdrop.style.display = 'block';
        setTimeout(() => {
            backdrop.classList.add('active');
            modal.classList.add('active');
        }, 10);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    };

    window.closeMobileModal = function() {
        const backdrop = document.querySelector('.modal-backdrop');
        const modals = document.querySelectorAll('.modal-content');
        
        modals.forEach(m => m.classList.remove('active'));
        if (backdrop) backdrop.classList.remove('active');
        
        setTimeout(() => {
            if (backdrop) backdrop.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    };

    // Close on backdrop click
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeMobileModal();
        });
    }

    // 3. Simple Haptic Feedback Simulation
    const clickable = document.querySelectorAll('.glass-card, .nav-item, .contributor-card');
    clickable.forEach(el => {
        el.addEventListener('touchstart', () => {
            if (window.navigator.vibrate) window.navigator.vibrate(10);
        });
    });
});
