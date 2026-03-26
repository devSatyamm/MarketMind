document.addEventListener('DOMContentLoaded', () => {

    // --- Tab Switching Logic (Generic) ---
    const tabGroups = document.querySelectorAll('.tab-group');

    tabGroups.forEach(group => {
        const tabs = group.querySelectorAll('.tab-btn');
        // Find content containers associated with this group if any
        // This part depends on specific HTML structure. 
        // For now, we'll just handle the active class on buttons

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all siblings
                tabs.forEach(t => t.classList.remove('active'));
                // Add active to clicked
                tab.classList.add('active');

                // Optional: Filter logic hook
                const filterValue = tab.dataset.filter;
                if (filterValue) {
                    console.log('Filter applied:', filterValue);
                    // Emit custom event or call filter function here
                }
            });
        });
    });

    // --- Sidebar Toggle (Mobile) ---
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // --- Range Slider Value Update ---
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
            const displayId = slider.dataset.display;
            if (displayId) {
                const displayEl = document.getElementById(displayId);
                if (displayEl) {
                    // Format appropriately based on context (currency, percent, etc)
                    let val = e.target.value;
                    if (val > 1000) val = (val / 1000).toFixed(1) + 'k';
                    displayEl.innerText = val;
                }
            }
        });
    });

    // --- Chart.js Initialization Helper (If Chart.js is present) ---
    if (typeof Chart !== 'undefined' && document.getElementById('simulationChart')) {
        initSimulationChart();
    }
});

function initSimulationChart() {
    const ctx = document.getElementById('simulationChart').getContext('2d');

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.5)'); // Blue start
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');   // Transparent end

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Projected Cash Flow',
                data: [50, 60, 55, 80, 110, 140],
                borderColor: '#2563eb', // Accent Blue
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#2563eb',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Baseline',
                data: [50, 52, 54, 56, 58, 60],
                borderColor: '#64748b', // Slate 500
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(51, 65, 85, 0.5)',
                        borderDash: [5, 5]
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}
/**
 * MMAudio — Simple TTS Utility
 */
const MMAudio = (() => {
    const _synth = window.speechSynthesis;
    let _utterance = null;
    let _isPlaying = false;
    let _lastId = null;

    return {
        speak(text, lang = 'en', id = null) {
            // If already playing this exact ID, just stop and exit
            if (_isPlaying && _lastId === id) {
                this.stop();
                return;
            }

            // Always stop previous voice before starting new one
            this.stop();

            if (!text) return;

            const langMap = {
                'en': 'en-IN', 'hi': 'hi-IN', 'bn': 'bn-IN', 'ta': 'ta-IN', 'te': 'te-IN', 'mr': 'mr-IN', 'gu': 'gu-IN', 'kn': 'kn-IN'
            };

            const cleanText = text.replace(/<[^>]*>/g, '').replace(/\*/g, '').trim();

            _utterance = new SpeechSynthesisUtterance(cleanText);
            _utterance.lang = langMap[lang] || 'en-IN';
            _utterance.rate = 1.0; 
            
            _utterance.onstart = () => {
                _isPlaying = true;
                _updateUI(id, true);
            };

            _utterance.onend = () => {
                _isPlaying = false;
                _updateUI(id, false);
                _lastId = null;
            };

            _utterance.onerror = () => {
                _isPlaying = false;
                _updateUI(id, false);
                _lastId = null;
            };

            // Vital: Set state before calling speak
            _isPlaying = true;
            _lastId = id;
            _updateUI(id, true);
            _synth.speak(_utterance);
        },

        stop() {
            if (_synth) {
                _synth.cancel();
            }
            _isPlaying = false;
            if (_lastId) {
                _updateUI(_lastId, false);
            }
            _lastId = null;
        }
    };

    function _updateUI(id, isSpeaking) {
        if (!id) return;
        const btn = document.getElementById(id);
        if (!btn) return;
        
        btn.innerHTML = isSpeaking 
            ? '<i class="fa-solid fa-stop"></i>' 
            : '<i class="fa-solid fa-volume-high"></i>';
        
        btn.classList.toggle('speaking', isSpeaking);
        
        if (btn.hasAttribute('data-listen-text')) {
           const label = isSpeaking ? 'Stop' : 'Listen';
           btn.innerHTML = `<i class="fa-solid fa-${isSpeaking ? 'stop' : 'volume-high'} mr-1"></i> ${label}`;
        }
    }
})();
