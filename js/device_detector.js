/**
 * Unified Device Detector & Redirection
 * Handles screen size shifts and "Request Desktop Site" mode.
 */

(function() {
    const mobileBreakpoint = 768;
    
    function checkDevice() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        const isMobileFile = filename.includes('_mobile');
        
        // Detection Logic
        const width = window.innerWidth;
        const ua = navigator.userAgent;
        
        // Check if the User Agent contains mobile device keywords
        // Most mobile browsers strip "Mobile" or "Android" when "Desktop Site" is requested.
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) && ua.toLowerCase().includes('mobile');
        
        // Decide preference: 
        // 1. If screen is wide (>768px) -> Desktop
        // 2. If User Agent doesn't look like mobile -> Desktop (matches "Request Desktop Site")
        const shouldBeDesktop = width > mobileBreakpoint || !isMobileUA;

        if (isMobileFile && shouldBeDesktop) {
            // Currently on mobile file but should be desktop
            const desktopFile = filename.replace('_mobile.html', '.html');
            console.log('[DeviceDetector] Switching to Desktop View');
            window.location.replace(desktopFile);
        } else if (!isMobileFile && !isMobileUA && width <= mobileBreakpoint) {
             // Edge case: Desktop UA but small width? 
             // Usually means resized desktop browser, we stay on desktop.
        } else if (!isMobileFile && !shouldBeDesktop) {
            // Currently on desktop file but should be mobile
            const mobileSupport = ['dashboard', 'funding', 'strategy', 'vc_forge', 'profile', 'news_reels', 'global_policies'];
            const pageName = filename.replace('.html', '');
            
            if (mobileSupport.includes(pageName)) {
                console.log('[DeviceDetector] Switching to Mobile View');
                window.location.replace(pageName + '_mobile.html');
            }
        }
    }

    // Run immediately
    checkDevice();
    
    // Monitor for resize changes (immediate response)
    window.addEventListener('resize', checkDevice);
})();
