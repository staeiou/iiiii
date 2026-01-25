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
        this.faceHoldStart = null;
        this.lastFaceSeen = null;
        this.currentFaceData = {};
        this.labelInterval = null;
        this.animationFrame = null;
        this.frameCount = 0;
        this.resizeObserver = null;
        this.overlayTransform = { scale: 1, offsetX: 0, offsetY: 0 };
        this.labelTimeouts = [];

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

            this.lastFaceSeen = Date.now();

            if (!this.faceDetected) {
                if (!this.faceHoldStart) {
                    this.faceHoldStart = this.lastFaceSeen;
                } else if (this.lastFaceSeen - this.faceHoldStart >= 3000) {
                    // Face has been detected continuously for 3 seconds
                    console.log('🎯 FACE STABLE FOR 3s - STARTING SEQUENCE');
                    this.startLabelSequence();
                }
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

            // Customize drawing options
            const drawOptions = {
                color: '#00ff88',
                labelColor: '#00ff88',
                fillPolygons: false,
                drawPoints: true,
                drawPolygons: true,
                drawLabels: false
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
            if (!this.faceDetected) {
                this.faceHoldStart = null;
            } else if (this.lastFaceSeen) {
                const timeSinceSeen = Date.now() - this.lastFaceSeen;
                console.log('Time since last detection:', timeSinceSeen);
                if (timeSinceSeen > 10000) {  // 10 seconds without detection
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

    // Draw functions removed - now using human.draw.canvas() and human.draw.face()

    startLabelSequence() {
        if (this.faceDetected) return;

        this.faceDetected = true;
        this.detectionStartTime = Date.now();
        this.instructions.classList.add('hidden');
        this.faceHoldStart = null;
        this.lastFaceSeen = this.detectionStartTime;
        this.clearLabelTimers();
        this.labels = [];
        this.labelsContainer.innerHTML = '';
        this.updateProgress(0);

        const steps = [
            { phase: 1, delay: 1200, count: 1 },
            { phase: 1, delay: 1400, count: 1 },
            { phase: 1, delay: 1600, count: 1 },
            { phase: 2, delay: 2000, count: 1 },
            { phase: 2, delay: 2400, count: 1 },
            { phase: 2, delay: 2800, count: 1 },
            { phase: 3, delay: 3200, count: 1 },
            { phase: 3, delay: 3600, count: 1 },
            { phase: 3, delay: 4000, count: 1 },
            { phase: 4, delay: 4500, count: 1 },
            { phase: 4, delay: 5200, count: 1 },
            { phase: 4, delay: 6000, count: 1 }
        ];

        const totalSteps = steps.length;
        const runStep = (index) => {
            if (!this.faceDetected) return;
            if (index >= totalSteps) {
                this.startInfiniteLabels();
                return;
            }
            const { phase, delay, count } = steps[index];
            const timeoutId = setTimeout(() => {
                if (!this.faceDetected) return;
                this.addLabels(phase, count);
                const progress = Math.min(Math.round(((index + 1) / totalSteps) * 95), 95);
                this.updateProgress(progress);
                runStep(index + 1);
            }, delay);
            this.labelTimeouts.push(timeoutId);
        };

        runStep(0);
    }

    startInfiniteLabels() {
        this.labelInterval = setInterval(() => {
            if (!this.faceDetected) return;
            this.addLabels(4, 1);
            const currentProgress = parseFloat(this.progressFill.style.width) || 0;
            const newProgress = Math.min(currentProgress + 0.3, 99);
            this.updateProgress(newProgress);
        }, 6500);
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
        this.clearLabelTimers();
        this.faceDetected = false;
        this.faceHoldStart = null;
        this.lastFaceSeen = null;
        this.detectionStartTime = null;
        this.labels = [];
        this.labelsContainer.innerHTML = '';
        this.updateProgress(0);
        this.instructions.classList.remove('hidden');
    }

    clearLabelTimers() {
        if (this.labelInterval) {
            clearInterval(this.labelInterval);
            this.labelInterval = null;
        }
        this.labelTimeouts.forEach((id) => clearTimeout(id));
        this.labelTimeouts = [];
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
        this.clearLabelTimers();
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
