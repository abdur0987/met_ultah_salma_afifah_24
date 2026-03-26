document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const screen1 = document.getElementById('screen1');
    const screen2 = document.getElementById('screen2');
    const screen3 = document.getElementById('screen3');
    const giftBtn = document.getElementById('gift-btn');
    const giftImg = document.getElementById('gift-img');
    const btnNext = document.getElementById('btn-next');
    const bgMusic = document.getElementById('bg-music');
    const canvas = document.getElementById('confetti');

    // Web Audio API for synthetic UI sounds (fallback / lightweight)
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playClickSound() {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        // A nice, soft pop sound
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        
        // Frequency sweep
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
        
        // Envelope
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    }

    function playSparkleSound() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        // Create a magical sparkle sweeping sound
        const rootFreq = 800;
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(rootFreq + (i * 200) + (Math.random()*100), audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(rootFreq * 2.5, audioCtx.currentTime + 0.3);
                
                gain.gain.setValueAtTime(0, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.start();
                osc.stop(audioCtx.currentTime + 0.5);
            }, i * 60);
        }
    }

    // Confetti implementation
    function initConfetti() {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const confetti = [];
        const colors = ['#ff9a9e', '#fecfef', '#b05c8d', '#ffffff', '#ffb6c1'];

        for (let i = 0; i < 150; i++) {
            confetti.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 10 + 5,
                h: Math.random() * 10 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                speed: Math.random() * 3 + 2,
                angle: Math.random() * 360,
                spin: Math.random() * 0.2 - 0.1
            });
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < confetti.length; i++) {
                let p = confetti[i];
                ctx.save();
                ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
                ctx.rotate(p.angle);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();

                p.y += p.speed;
                p.angle += p.spin;

                if (p.y > canvas.height) {
                    p.y = -10;
                    p.x = Math.random() * canvas.width;
                }
            }
            requestAnimationFrame(animate);
        }
        animate();
    }

    // Handle screen transition
    function switchScreen(from, to, callback) {
        from.classList.remove('active');
        from.classList.add('hidden');
        
        setTimeout(() => {
            to.classList.remove('hidden');
            // Trigger reflow
            void to.offsetWidth;
            to.classList.add('active');
            if (callback) callback();
        }, 800);
    }

    // Create sparks originating from element center
    function createSparks(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        for (let i = 0; i < 20; i++) {
            const spark = document.createElement('div');
            spark.className = 'spark';
            spark.style.left = `${centerX}px`;
            spark.style.top = `${centerY}px`;
            
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 150 + 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            spark.style.setProperty('--tx', `${tx}px`);
            spark.style.setProperty('--ty', `${ty}px`);
            
            document.body.appendChild(spark);
            
            setTimeout(() => spark.remove(), 800);
        }
    }

    // Event Listeners
    giftBtn.addEventListener('click', () => {
        playSparkleSound();
        createSparks(giftImg);
        
        // Open animation for gift
        giftImg.classList.add('opening');
        
        // Start background music
        bgMusic.volume = 0;
        bgMusic.play();
        let vol = 0;
        const fadeAudio = setInterval(() => {
            if (vol < 0.6) {
                vol += 0.05;
                bgMusic.volume = vol;
            } else {
                clearInterval(fadeAudio);
            }
        }, 200);

        setTimeout(() => {
            switchScreen(screen1, screen2, () => {
                initConfetti();
            });
        }, 600);
    });

    btnNext.addEventListener('click', () => {
        playClickSound();
        switchScreen(screen2, screen3);
    });

    // Resize handler for canvas
    window.addEventListener('resize', () => {
        if (screen2.classList.contains('active')) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    });
});
