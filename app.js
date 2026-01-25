// Main application logic
class KioskApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.videoContainer = document.querySelector('.video-container');
        this.loading = document.getElementById('loading');
        this.instructions = document.getElementById('instructions');
        this.labelsContainer = document.getElementById('labelsContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');

        this.human = null;
        this.currentPhase = 0;
        this.labels = [];
        this.detectionStartTime = null;
        this.faceDetected = false;
        this.currentFaceData = {};
        this.labelInterval = null;
        this.animationFrame = null;
        this.frameCount = 0;
        this.resizeObserver = null;
        this.overlayTransform = { scale: 1, offsetX: 0, offsetY: 0 };

        this.init();
    }

    async init() {
        try {
            // Initialize Human library
            await this.initHuman();

            // Request camera access
            await this.initCamera();

            // Keep overlay aligned with responsive layout
            this.setupResizeHandling();

            // Hide loading
            this.loading.style.display = 'none';

            // Start detection loop
            this.detect();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError(error.message);
        }
    }

    async initHuman() {
        console.log('Initializing Human library...');
        const config = {
            backend: 'webgl',
            modelBasePath: 'https://vladmandic.github.io/human-models/models/',
            filter: { enabled: false },
            face: {
                enabled: true,
                detector: { rotation: true, maxDetected: 1 },
                mesh: { enabled: true },
                attention: { enabled: false },
                iris: { enabled: true },
                description: { enabled: true },  // This provides age, gender, race
                emotion: { enabled: true },
                antispoof: { enabled: true },
                liveness: { enabled: true }
            },
            body: { enabled: false },
            hand: { enabled: false },
            gesture: { enabled: true }
        };

        this.human = new Human.default(config);
        console.log('Loading models...');
        await this.human.load();
        console.log('✓ Human library loaded with backend:', this.human.backend);
        console.log('✓ Human config:', this.human.config);
        console.log('✓ Models loaded');
    }

    async initCamera() {
        try {
            console.log('Requesting camera access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.video.srcObject = stream;
            console.log('✓ Camera stream obtained');

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    console.log('✓ Video ready:', this.video.videoWidth, 'x', this.video.videoHeight);
                    this.updateOverlayTransform();
                    resolve();
                };
            });
        } catch (error) {
            throw new Error('Camera access denied. Please allow camera permissions.');
        }
    }

    setupResizeHandling() {
        this.updateOverlayTransform();
        if (typeof ResizeObserver !== 'undefined' && this.videoContainer) {
            this.resizeObserver = new ResizeObserver(() => this.updateOverlayTransform());
            this.resizeObserver.observe(this.videoContainer);
        } else {
            window.addEventListener('resize', () => this.updateOverlayTransform());
            window.addEventListener('orientationchange', () => {
                setTimeout(() => this.updateOverlayTransform(), 100);
            });
        }
    }

    updateOverlayTransform() {
        if (!this.videoContainer) return;
        const displayWidth = this.videoContainer.clientWidth;
        const displayHeight = this.videoContainer.clientHeight;
        if (!displayWidth || !displayHeight) return;

        const dpr = window.devicePixelRatio || 1;
        const pixelWidth = Math.round(displayWidth * dpr);
        const pixelHeight = Math.round(displayHeight * dpr);

        if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
            this.canvas.width = pixelWidth;
            this.canvas.height = pixelHeight;
        }

        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;

        const videoWidth = this.video.videoWidth || displayWidth;
        const videoHeight = this.video.videoHeight || displayHeight;
        const scale = Math.max(displayWidth / videoWidth, displayHeight / videoHeight);
        const scaledWidth = videoWidth * scale;
        const scaledHeight = videoHeight * scale;
        const offsetX = (displayWidth - scaledWidth) / 2;
        const offsetY = (displayHeight - scaledHeight) / 2;

        this.overlayTransform = {
            scale: scale * dpr,
            offsetX: offsetX * dpr,
            offsetY: offsetY * dpr
        };
    }

    async detect() {
        // Log every 60 frames (about once per second at 60fps) to avoid spam
        if (!this.frameCount) this.frameCount = 0;
        this.frameCount++;

        if (this.frameCount % 60 === 0) {
            console.log(`[Frame ${this.frameCount}] detect() running, video ready:`, this.video.readyState === 4);
        }

        if (!this.human || this.video.readyState !== 4) {
            this.animationFrame = requestAnimationFrame(() => this.detect());
            return;
        }

        try {
            const result = await this.human.detect(this.video);

            if (this.frameCount % 60 === 0 || (result.face && result.face.length > 0)) {
                console.log('Detection result:', {
                    faceCount: result.face?.length || 0,
                    faceDetected: this.faceDetected,
                    canvasVisible: this.canvas.style.display !== 'none',
                    timestamp: Date.now()
                });
            }

            this.updateOverlayTransform();

            // Clear canvas in display space
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            if (result.face && result.face.length > 0) {
            const face = result.face[0];

            // Debug log to see what we're getting
            if (!this.faceDetected) {
                console.log('Face detected:', face);
                console.log('Age:', face.age);
                console.log('Gender:', face.gender, 'Score:', face.genderScore);
                console.log('Emotion:', face.emotion);
                console.log('Race:', face.race);
            }

            if (!this.faceDetected) {
                // First face detection - start the label sequence
                console.log('🎯 FACE DETECTED FOR FIRST TIME!');
                this.faceDetected = true;
                this.detectionStartTime = Date.now();
                this.instructions.classList.add('hidden');
                this.startLabelSequence();
            }

            // Update current face data
            this.currentFaceData = {
                age: face.age,
                gender: face.gender,
                genderScore: face.genderScore,
                emotion: this.getTopEmotion(face.emotion),
                race: this.getTopRace(face.race),
                confidence: face.score
            };

            // Build dynamic escalating labels based on elapsed time
            const elapsed = Date.now() - this.detectionStartTime;
            const faceLabels = this.buildEscalatingLabels(elapsed, face);

            // Log drawing details every 60 frames or when just detected
            if (this.frameCount % 60 === 0 || this.frameCount < 120) {
                console.log('Drawing labels:', {
                    elapsed,
                    labelLength: faceLabels.length,
                    firstLines: faceLabels.split('\n').slice(0, 5)
                });
            }

            // Customize drawing options
            const drawOptions = {
                color: '#00ff88',
                labelColor: '#00ff88',
                fillPolygons: false,
                drawPoints: true,
                drawPolygons: true,
                drawLabels: true,  // CRITICAL: Without this, labels won't render!
                font: 'small-caps 14px "Segoe UI"',
                lineHeight: 18,
                faceLabels: faceLabels
            };

            // Use a cover transform so overlays match the cropped video
            this.ctx.save();
            this.ctx.setTransform(
                this.overlayTransform.scale,
                0,
                0,
                this.overlayTransform.scale,
                this.overlayTransform.offsetX,
                this.overlayTransform.offsetY
            );

            // Use Human's built-in draw function for face overlay
            this.human.draw.face(this.canvas, result.face, drawOptions);
            this.ctx.restore();

        } else {
            // No face detected - potentially reset after a timeout
            console.log('No face detected in this frame');
            if (this.faceDetected) {
                const timeSinceDetection = Date.now() - this.detectionStartTime;
                console.log('Time since last detection:', timeSinceDetection);
                if (timeSinceDetection > 3000) {  // 3 seconds without detection
                    console.log('Resetting detection due to timeout');
                    this.resetDetection();
                }
            }
        }

        } catch (error) {
            console.error('ERROR in detect loop:', error);
            console.error('Error stack:', error.stack);
        }

        this.animationFrame = requestAnimationFrame(() => this.detect());
    }

    getTopEmotion(emotions) {
        if (!emotions || emotions.length === 0) return 'Neutral';

        // Find emotion with highest score
        let topEmotion = emotions[0];
        for (const emotion of emotions) {
            if (emotion.score > topEmotion.score) {
                topEmotion = emotion;
            }
        }

        // Capitalize first letter
        return topEmotion.emotion.charAt(0).toUpperCase() + topEmotion.emotion.slice(1);
    }

    getTopRace(races) {
        if (!races || races.length === 0) return null;

        // Find race with highest score
        let topRace = races[0];
        for (const race of races) {
            if (race.score > topRace.score) {
                topRace = race;
            }
        }

        // Capitalize first letter
        return topRace.race.charAt(0).toUpperCase() + topRace.race.slice(1);
    }

    buildEscalatingLabels(elapsed, face) {
        // Start with basic real data using template variables
        let labels = `Face\nConfidence [score]%\n[gender]: [genderScore]%\nAge: [age] years`;

        // Add real/live if available
        if (face.real !== undefined) labels += '\nReal [real]%';
        if (face.live !== undefined) labels += '\nLive [live]%';

        // Add emotions
        if (face.emotion && face.emotion.length > 0) {
            labels += '\n[emotions]';
        }

        // Add rotation data
        if (face.rotation?.angle) {
            labels += '\nRoll [roll] Yaw [yaw] Pitch [pitch]';
        }

        // Add distance if available
        if (face.distance) {
            labels += '\nDistance: [distance]cm';
        }

        // Phase 2: Corporate Metrics (after 2 seconds)
        if (elapsed > 2000) {
            labels += '\n─────────────────';
            labels += '\nSynergy Score: 8.7/10';
        }

        if (elapsed > 3000) {
            labels += '\nHustle Culture: 92%';
        }

        if (elapsed > 4500) {
            labels += '\nCulture Fit: 94/100';
        }

        if (elapsed > 6000) {
            labels += '\nOKR Alignment: High';
        }

        // Phase 3: Pseudoscience (after 8 seconds)
        if (elapsed > 8000) {
            labels += '\n─────────────────';
            labels += '\nAura: Corporate Blue';
        }

        if (elapsed > 9500) {
            labels += '\nChakras Aligned: 6/7';
        }

        if (elapsed > 11000) {
            labels += '\nSpirit Animal: Tired Owl';
        }

        if (elapsed > 13000) {
            const signs = ['♑ Capricorn', '♒ Aquarius', '♓ Pisces', '♈ Aries', '♉ Taurus', '♊ Gemini'];
            const sign = signs[Math.floor(Math.random() * signs.length)];
            labels += `\nSign: ${sign}`;
        }

        // Phase 4: Existential Absurdity (after 15 seconds)
        if (elapsed > 15000) {
            labels += '\n─────────────────';
            labels += '\nSoul Sold: 73.2%';
        }

        if (elapsed > 17000) {
            labels += '\nTrue Self: 847m away';
        }

        if (elapsed > 19000) {
            labels += '\nAtoms in Dread: 2.4T';
        }

        if (elapsed > 21000) {
            labels += '\nChair Compat: 99.1%';
        }

        if (elapsed > 23000) {
            labels += '\nSimulation: 67% likely';
        }

        if (elapsed > 25000) {
            labels += '\nImposter Syndrome: 84%';
        }

        if (elapsed > 27000) {
            labels += '\nCoffee Dependency: 9.2/10';
        }

        if (elapsed > 30000) {
            labels += '\nLinkedIn Auth: 18%';
        }

        if (elapsed > 33000) {
            labels += '\nPassive Income: 0.02%';
        }

        // Keep adding more existential dread indefinitely
        if (elapsed > 35000) {
            const extraLabels = [
                'Work-Life Merge: 91%',
                'AI Replacement: 78%',
                'Burnout Index: Critical',
                'Genuine Smile: 4d ago',
                'Email→Slack Ratio: 3:1',
                'Meetings→Emails: 2:1',
                'Fluorescent Hrs: 8,247',
                'Dream Job Δ: 100%'
            ];
            const cycle = Math.floor((elapsed - 35000) / 3000);
            if (cycle < extraLabels.length) {
                labels += '\n' + extraLabels[cycle];
            }
        }

        return labels;
    }

    // Draw functions removed - now using human.draw.canvas() and human.draw.face()

    startLabelSequence() {
        let labelIndex = 0;
        const timings = [
            // Phase 1: Real data (display quickly)
            { phase: 1, delay: 500, count: 1 },
            { phase: 1, delay: 1000, count: 1 },
            { phase: 1, delay: 1500, count: 1 },
            { phase: 1, delay: 2000, count: 1 },

            // Phase 2: Corporate metrics (start slowing down)
            { phase: 2, delay: 3000, count: 2 },
            { phase: 2, delay: 5000, count: 2 },
            { phase: 2, delay: 7000, count: 2 },
            { phase: 2, delay: 9000, count: 2 },

            // Phase 3: Pseudoscience (even slower)
            { phase: 3, delay: 11000, count: 1 },
            { phase: 3, delay: 13000, count: 2 },
            { phase: 3, delay: 16000, count: 2 },
            { phase: 3, delay: 19000, count: 2 },

            // Phase 4: Existential absurdity (continuous trickle)
            { phase: 4, delay: 22000, count: 1 },
            { phase: 4, delay: 25000, count: 2 },
            { phase: 4, delay: 28000, count: 1 },
            { phase: 4, delay: 31000, count: 2 },
            { phase: 4, delay: 34000, count: 1 },
            { phase: 4, delay: 37000, count: 2 },
            { phase: 4, delay: 40000, count: 1 },
            { phase: 4, delay: 43000, count: 2 }
        ];

        timings.forEach(timing => {
            setTimeout(() => {
                this.addLabels(timing.phase, timing.count);
                this.updateProgress(timing.delay / 430); // Progress bar never reaches 100%
            }, timing.delay);
        });

        // Continue adding random phase 4 labels forever
        setTimeout(() => {
            this.labelInterval = setInterval(() => {
                this.addLabels(4, Math.floor(Math.random() * 2) + 1);
                // Progress bar creeps up but asymptotically approaches 99%
                const currentProgress = parseFloat(this.progressFill.style.width) || 0;
                const newProgress = Math.min(currentProgress + 0.5, 99);
                this.updateProgress(newProgress);
            }, 5000);
        }, 45000);
    }

    addLabels(phase, count) {
        const newLabels = LabelGenerator.getRandomLabels(phase, count, this.currentFaceData);

        newLabels.forEach(label => {
            const labelEl = document.createElement('div');
            labelEl.className = `label-item phase-${phase}`;
            labelEl.innerHTML = `
                <div class="label-category">${label.category}</div>
                <div class="label-value">${label.value}</div>
            `;
            this.labelsContainer.appendChild(labelEl);

            // Scroll to bottom
            this.labelsContainer.scrollTop = this.labelsContainer.scrollHeight;
        });

        this.labels.push(...newLabels);
    }

    updateProgress(percentage) {
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `${Math.floor(percentage)}%`;
    }

    resetDetection() {
        // Stop adding labels
        if (this.labelInterval) {
            clearInterval(this.labelInterval);
            this.labelInterval = null;
        }

        // Clear everything after a delay (pretend to "process")
        setTimeout(() => {
            this.faceDetected = false;
            this.detectionStartTime = null;
            this.labels = [];
            this.labelsContainer.innerHTML = '';
            this.updateProgress(0);
            this.instructions.classList.remove('hidden');
        }, 2000);
    }

    showError(message) {
        this.loading.innerHTML = `
            <div class="loading-content">
                <h2 style="color: #ff0066; margin-bottom: 1rem;">System Error</h2>
                <p>${message}</p>
                <p class="loading-sub" style="margin-top: 1rem;">Please refresh the page to try again.</p>
            </div>
        `;
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.labelInterval) {
            clearInterval(this.labelInterval);
        }
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
    }
}

// Initialize app when page loads
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new KioskApp();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
});
