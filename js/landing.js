/* ──────────────────────────────────────────
   MARKETMIND — Landing Page JavaScript
   ────────────────────────────────────────── */

// ═══════════════════════════════════
//  NAV SCROLL EFFECT
// ═══════════════════════════════════
const nav = document.getElementById('main-nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
        nav?.classList.add('scrolled');
    } else {
        nav?.classList.remove('scrolled');
    }
});

// ═══════════════════════════════════
//  CONTRIBUTOR MODALS
// ═══════════════════════════════════
function openModal(id) {
    const overlay = document.getElementById('modal-' + id);
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const overlay = document.getElementById('modal-' + id);
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal when clicking on the dark overlay (outside card)
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(overlay => {
            overlay.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// ═══════════════════════════════════
//  THREE.JS SCENE
// ═══════════════════════════════════
const initThreeJS = () => {
    const container = document.getElementById('canvas-container');
    if (!container || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(2.5, 0, 5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // — Outer wireframe icosahedron
    const geo = new THREE.IcosahedronGeometry(2, 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.28 });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.x = 2.5;
    scene.add(sphere);

    // — Inner core
    const coreGeo = new THREE.IcosahedronGeometry(1.4, 0);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.14 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.x = 2.5;
    scene.add(core);

    // — Particles
    const pCount = 700;
    const posArr = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i++) { posArr[i] = (Math.random() - 0.5) * 22; }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.018, color: 0xffffff, transparent: true, opacity: 0.45 });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Light
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pt = new THREE.PointLight(0x3b82f6, 1.2);
    pt.position.set(5, 5, 5);
    scene.add(pt);

    // Mouse parallax
    let mx = 0, my = 0;
    document.addEventListener('mousemove', e => {
        mx = (e.clientX - window.innerWidth / 2) / 1200;
        my = (e.clientY - window.innerHeight / 2) / 1200;
    });

    const clock = new THREE.Clock();

    const animate = () => {
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        sphere.rotation.y += 0.0028;
        sphere.rotation.x += 0.001;
        const s = 1 + Math.sin(t * 0.8) * 0.05;
        sphere.scale.set(s, s, s);

        // Ease toward mouse
        sphere.rotation.y += 0.05 * (mx * 0.5 - sphere.rotation.y);
        sphere.rotation.x += 0.05 * (my * 0.5 - sphere.rotation.x);

        core.rotation.y -= 0.0022;
        core.rotation.x -= 0.0018;

        particles.rotation.y += 0.00045;
        particles.rotation.x += 0.0002;
        particles.rotation.y += 0.02 * (mx * 0.5 - particles.rotation.y);

        renderer.render(scene, camera);
    };

    animate();

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }, 50);
    });
};

// ═══════════════════════════════════
//  GSAP ANIMATIONS
// ═══════════════════════════════════
const initGSAP = () => {
    if (typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero stagger
    gsap.from('.hero-content > *', {
        y: 55,
        opacity: 0,
        duration: 1.1,
        stagger: 0.18,
        ease: 'power3.out',
        delay: 0.4,
    });

    // Feature cards — transform only so cards are never opacity-hidden
    gsap.from('.feature-card', {
        scrollTrigger: { trigger: '#features', start: 'top 90%' },
        y: 50,
        scale: 0.95,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
    });

    // Contributor cards — transform only, never opacity-hidden
    gsap.from('.contributor-card', {
        scrollTrigger: { trigger: '.contributors-section', start: 'top 85%' },
        y: 40,
        scale: 0.94,
        duration: 0.75,
        stagger: 0.12,
        ease: 'back.out(1.5)',
    });

    // Stats counters
    document.querySelectorAll('.counter').forEach(counter => {
        const target = +counter.getAttribute('data-target');
        gsap.to(counter, {
            scrollTrigger: { trigger: counter, start: 'top 85%' },
            innerHTML: target,
            duration: 2.2,
            snap: { innerHTML: 1 },
            modifiers: {
                innerHTML: v => Math.floor(v) + (target > 100 ? '+' : '%'),
            },
            ease: 'power2.out',
        });
    });
};

// ═══════════════════════════════════
//  INIT
// ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    initGSAP();
});
