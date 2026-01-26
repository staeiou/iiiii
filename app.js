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
        this.labelDecks = {};
        this.faceLabelQueue = [];
        this.faceLabelAnchor = null;
        this.faceLabelAnchorDirty = true;

        this.init();
    }

    async init() {
        try {
            console.log('🚀 Starting initialization...');

            // Initialize Human library
            await this.initHuman();
            console.log('✓ initHuman complete');

            // Request camera access
            await this.initCamera();
            console.log('✓ initCamera complete');

            // Keep overlay aligned with responsive layout
            this.setupResizeHandling();
            console.log('✓ setupResizeHandling complete');

            // Setup UI toggle for labels panel
            this.setupLayoutToggle();
            console.log('✓ setupLayoutToggle complete');

            // Hide loading
            console.log('Hiding loading screen...');
            this.loading.style.display = 'none';
            console.log('✓ Loading screen hidden');

            // Start detection loop
            console.log('Starting detection loop...');
            this.detect();
            console.log('✓ Initialization complete!');
        } catch (error) {
            console.error('❌ Initialization error:', error);
            console.error('Error stack:', error.stack);
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
                detector: {
                    rotation: true,
                    maxDetected: 3,
                    minConfidence: 0.1,
                    skipFrames: 1,
                    skipTime: 120
                },
                mesh: { enabled: true },
                attention: { enabled: false },
                iris: { enabled: true },
                description: { enabled: true },  // This provides age, gender, race
                emotion: { enabled: true },
                antispoof: { enabled: false },
                liveness: { enabled: false }
            },
            body: { enabled: false },
            hand: { enabled: false },
            gesture: { enabled: false }
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
            const supported = navigator.mediaDevices?.getSupportedConstraints?.() || {};
            console.log('Camera supported constraints:', supported);

            const baseVideo = {
                facingMode: { ideal: 'user' },
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 960, max: 1440 }
            };

            const withAspect = supported.aspectRatio
                ? { ...baseVideo, aspectRatio: { ideal: 4 / 3 } }
                : baseVideo;

            const cameraAttempts = [
                {
                    name: '4:3 (ideal, ranged)',
                    video: withAspect
                },
                {
                    name: 'ranged (no aspect)',
                    video: baseVideo
                },
                {
                    name: 'facingMode only (fallback)',
                    video: { facingMode: { ideal: 'user' } }
                }
            ];

            let stream = null;
            let lastError = null;
            for (const attempt of cameraAttempts) {
                try {
                    console.log(`getUserMedia attempt: ${attempt.name}`);
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: attempt.video,
                        audio: false
                    });
                    console.log(`✓ getUserMedia success: ${attempt.name}`);
                    break;
                } catch (error) {
                    lastError = error;
                    console.warn(`⚠ getUserMedia failed: ${attempt.name}`, {
                        name: error?.name,
                        message: error?.message
                    });
                }
            }

            if (!stream) throw lastError;

            this.video.srcObject = stream;
            console.log('✓ Camera stream obtained');

            const videoTrack = stream.getVideoTracks?.()[0];
            if (videoTrack) {
                if (supported.aspectRatio && typeof videoTrack.applyConstraints === 'function') {
                    try {
                        await videoTrack.applyConstraints({ aspectRatio: 4 / 3 });
                        console.log('✓ Applied aspectRatio constraint (4:3)');
                    } catch (constraintError) {
                        console.warn('⚠ applyConstraints(aspectRatio) failed:', constraintError?.message || constraintError);
                    }
                }
                const settings = videoTrack.getSettings?.();
                if (settings) {
                    console.log('Camera track settings:', settings);
                }
            }

            // Wait for video metadata - check if already loaded first
            if (this.video.readyState >= 1) {
                console.log('✓ Video metadata already loaded');
                this.updateOverlayTransform();
            } else {
                console.log('Waiting for video metadata...');
                await Promise.race([
                    new Promise((resolve) => {
                        this.video.onloadedmetadata = () => {
                            console.log('✓ Video ready:', this.video.videoWidth, 'x', this.video.videoHeight);
                            this.updateOverlayTransform();
                            resolve();
                        };
                    }),
                    new Promise((resolve) => setTimeout(() => {
                        console.warn('⚠ Video metadata timeout - proceeding anyway');
                        this.updateOverlayTransform();
                        resolve();
                    }, 3000))
                ]);
            }

            // iOS: make playback explicit; if it fails we'll learn why
            try {
                await this.video.play();
                console.log('✓ Video playback started');
            } catch (playError) {
                console.warn('video.play() failed:', {
                    name: playError?.name,
                    message: playError?.message,
                    error: playError
                });
            }

            console.log('✓ Camera init complete:', this.video.videoWidth, 'x', this.video.videoHeight);

            return stream;
        } catch (error) {
            console.error('❌ getUserMedia failed:', {
                name: error?.name,
                message: error?.message,
                error: error
            });
            // Show actual failure reason in UI
            throw new Error(`Camera start failed: ${error?.name}: ${error?.message}`);
        }
    }

    setupResizeHandling() {
        try {
            console.log('Setting up resize handling...');
            this.updateOverlayTransform();
            if (typeof ResizeObserver !== 'undefined' && this.videoContainer) {
                this.resizeObserver = new ResizeObserver(() => this.updateOverlayTransform());
                this.resizeObserver.observe(this.videoContainer);
                console.log('✓ ResizeObserver active');
            } else {
                window.addEventListener('resize', () => this.updateOverlayTransform());
                window.addEventListener('orientationchange', () => {
                    setTimeout(() => this.updateOverlayTransform(), 100);
                });
                console.log('✓ Window resize listeners active');
            }
        } catch (error) {
            console.error('❌ setupResizeHandling failed:', error);
        }
    }

    setupLayoutToggle() {
        const logoText = document.querySelector('.logo-text');
        if (!logoText) return;
        logoText.setAttribute('title', 'Tap to toggle labels panel');
        logoText.setAttribute('role', 'button');
        const storageKey = 'kiosk:sidebar-hidden';
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved === '0') {
                document.body.classList.remove('sidebar-hidden');
            } else {
                document.body.classList.add('sidebar-hidden');
            }
        } catch (error) {
            console.warn('layout preference read failed:', error);
            document.body.classList.add('sidebar-hidden');
        }
        logoText.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-hidden');
            try {
                const isHidden = document.body.classList.contains('sidebar-hidden');
                localStorage.setItem(storageKey, isHidden ? '1' : '0');
            } catch (error) {
                console.warn('layout preference write failed:', error);
            }
            setTimeout(() => this.updateOverlayTransform(), 50);
        });
        setTimeout(() => this.updateOverlayTransform(), 50);
    }

    updateOverlayTransform() {
        try {
            if (!this.videoContainer) {
                console.warn('updateOverlayTransform: no videoContainer');
                return;
            }
            const displayWidth = this.videoContainer.clientWidth;
            const displayHeight = this.videoContainer.clientHeight;
            if (!displayWidth || !displayHeight) {
                console.warn('updateOverlayTransform: no display dimensions');
                return;
            }

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
            const useContain = document.body.classList.contains('sidebar-hidden');
            const scale = useContain
                ? Math.min(displayWidth / videoWidth, displayHeight / videoHeight)
                : Math.max(displayWidth / videoWidth, displayHeight / videoHeight);
            const scaledWidth = videoWidth * scale;
            const scaledHeight = videoHeight * scale;
            const offsetX = (displayWidth - scaledWidth) / 2;
            const offsetY = (displayHeight - scaledHeight) / 2;

            this.overlayTransform = {
                scale: scale * dpr,
                offsetX: offsetX * dpr,
                offsetY: offsetY * dpr
            };

            console.log('Overlay transform updated:', {
                canvasSize: `${this.canvas.width}x${this.canvas.height}`,
                videoSize: `${videoWidth}x${videoHeight}`,
                scale: this.overlayTransform.scale
            });
        } catch (error) {
            console.error('❌ updateOverlayTransform failed:', error);
        }
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
            this.drawFaceLabel(face);
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
        this.faceLabelQueue = [];
        this.faceLabelAnchor = null;
        this.faceLabelAnchorDirty = true;
        this.updateProgress(0);
        this.resetLabelDecks();

        const randomPause = (minMs = 1500, maxMs = 3000) =>
            Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

        const steps = [
            // Phase 0: "obvious" inferences before randomized phases
            { phase: 0, delay: randomPause(), count: 1 },  // Exhaustion
            { phase: 0, delay: randomPause(), count: 1 },  // Stress
            { phase: 0, delay: randomPause(), count: 1 },  // Energy
            { phase: 0, delay: randomPause(), count: 1 },  // Big Five: Openness
            { phase: 0, delay: randomPause(), count: 1 },  // Big Five: Conscientiousness
            { phase: 0, delay: randomPause(), count: 1 },  // Big Five: Extraversion
            { phase: 0, delay: randomPause(), count: 1 },  // Big Five: Agreeableness
            { phase: 0, delay: randomPause(), count: 1 },  // Big Five: Neuroticism
            { phase: 0, delay: randomPause(), count: 1 },  // MBTI
            { phase: 0, delay: randomPause(), count: 1 },  // Enneagram
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

    resetLabelDecks() {
        this.labelDecks = {};
        for (let phase = 0; phase <= 4; phase++) {
            this.labelDecks[phase] = this.buildLabelDeck(phase);
        }
    }

    buildLabelDeck(phase) {
        const key = `phase${phase}Labels`;
        const defs = (typeof LabelGenerator !== 'undefined' && Array.isArray(LabelGenerator[key])) ? LabelGenerator[key] : [];
        const deck = [...defs];
        if (phase === 0) return deck.reverse();
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    drawLabelsFromDeck(phase, count) {
        const labels = [];
        if (count <= 0) return labels;

        while (labels.length < count) {
            const deck = this.labelDecks?.[phase];
            if (!Array.isArray(deck) || deck.length === 0) break;

            const def = deck.pop();
            labels.push({
                category: def.category,
                value: def.getValue(this.currentFaceData),
                phase: phase
            });
        }

        return labels;
    }

    pickPhaseWithRemainingLabels() {
        const weights = {
            1: 0.05,
            2: 0.15,
            3: 0.25,
            4: 0.55
        };

        const available = [1, 2, 3, 4].filter((phase) => (this.labelDecks?.[phase]?.length || 0) > 0);
        if (!available.length) return null;

        const totalWeight = available.reduce((sum, phase) => sum + (weights[phase] || 0), 0);
        let roll = Math.random() * totalWeight;
        for (const phase of available) {
            roll -= (weights[phase] || 0);
            if (roll <= 0) return phase;
        }
        return available[available.length - 1];
    }

    startInfiniteLabels() {
        this.labelInterval = setInterval(() => {
            if (!this.faceDetected) return;
            const phase = this.pickPhaseWithRemainingLabels();
            if (!phase) {
                this.clearLabelTimers();
                this.updateProgress(99);
                return;
            }
            this.addLabels(phase, 1);
            const currentProgress = this.progressFill ? (parseFloat(this.progressFill.style.width) || 0) : 0;
            const newProgress = Math.min(currentProgress + 0.3, 99);
            this.updateProgress(newProgress);
        }, 6500);
    }

    addLabels(phase, count) {
        const newLabels = this.drawLabelsFromDeck(phase, count);

        newLabels.forEach(label => {
            const labelEl = document.createElement('div');
            labelEl.className = `label-item phase-${phase}`;
            labelEl.innerHTML = `
                <div class="label-category">${label.category}</div>
                <div class="label-value">${label.value}</div>
            `;
            this.labelsContainer.appendChild(labelEl);
            this.enqueueFaceLabel(`${label.category}: ${label.value}`);

            // Scroll to bottom
            this.labelsContainer.scrollTop = this.labelsContainer.scrollHeight;
        });

        this.labels.push(...newLabels);
    }

    enqueueFaceLabel(line) {
        if (!line) return;
        this.faceLabelQueue.push(line);
        while (this.faceLabelQueue.length > 10) {
            this.faceLabelQueue.shift();
        }
        this.faceLabelAnchorDirty = true;
    }

    updateProgress(percentage) {
        if (!this.progressFill || !this.progressText) return;
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `${Math.floor(percentage)}%`;
    }

    drawFaceLabel(face) {
        if (!face || !face.box) return;

        const lines = [];
        if (face.score !== undefined) lines.push(`Confidence ${Math.round(face.score * 100)}%`);
        if (face.age !== undefined) lines.push(`Age ${Math.round(face.age)} years`);
        if (face.gender) {
            const genderScore = face.genderScore !== undefined ? ` ${Math.round(face.genderScore * 100)}%` : '';
            lines.push(`Gender ${face.gender}${genderScore}`);
        }
        const topEmotion = this.getTopEmotion(face.emotion);
        if (topEmotion) lines.push(`Emotion ${topEmotion}`);
        if (this.faceLabelQueue.length) {
            lines.push(...this.faceLabelQueue);
        }
        if (lines.length === 0) return;

        const fontSize = 21;
        const lineHeight = 26;
        const paddingX = 12;
        const paddingY = 9;

        this.ctx.font = `600 ${fontSize}px "Segoe UI", system-ui, -apple-system, sans-serif`;
        this.ctx.textBaseline = 'top';

        let maxWidth = 0;
        for (const line of lines) {
            const width = this.ctx.measureText(line).width;
            if (width > maxWidth) maxWidth = width;
        }

        const boxWidth = maxWidth + paddingX * 2;
        const boxHeight = lineHeight * lines.length + paddingY * 2;
        const faceX = face.box[0];
        const faceY = face.box[1];
        const faceW = face.box[2];
        const faceH = face.box[3];

        let boxX;
        let boxY;
        if (!this.faceLabelAnchor || this.faceLabelAnchorDirty) {
            const margin = 8;
            const videoWidth = this.video.videoWidth || (faceX + faceW);
            const videoHeight = this.video.videoHeight || (faceY + faceH);
            const displayWidth = this.videoContainer?.clientWidth || videoWidth;
            const displayHeight = this.videoContainer?.clientHeight || videoHeight;
            const isPortrait = displayHeight >= displayWidth;

            if (isPortrait) {
                const aboveY = faceY - boxHeight - margin;
                const belowY = faceY + faceH + margin;
                boxX = faceX + (faceW / 2) - (boxWidth / 2);
                if (aboveY >= margin) {
                    boxY = aboveY;
                } else if (belowY + boxHeight <= videoHeight - margin) {
                    boxY = belowY;
                } else {
                    boxY = Math.min(Math.max(margin, faceY), videoHeight - boxHeight - margin);
                }
            } else {
                boxX = faceX + faceW + margin;
                boxY = faceY + (faceH / 2) - (boxHeight / 2);
                if (boxX + boxWidth > videoWidth - margin) {
                    boxX = faceX - boxWidth - margin;
                }
            }

            if (boxX < margin) boxX = margin;
            if (boxX + boxWidth > videoWidth - margin) boxX = videoWidth - boxWidth - margin;
            if (boxY < margin) boxY = margin;
            if (boxY + boxHeight > videoHeight - margin) boxY = videoHeight - boxHeight - margin;

            this.faceLabelAnchor = { x: boxX, y: boxY };
            this.faceLabelAnchorDirty = false;
        } else {
            boxX = this.faceLabelAnchor.x;
            boxY = this.faceLabelAnchor.y;
        }

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        this.ctx.fillStyle = '#00ff88';
        for (let i = 0; i < lines.length; i++) {
            this.ctx.fillText(lines[i], boxX + paddingX, boxY + paddingY + i * lineHeight);
        }
    }

    resetDetection() {
        // Stop adding labels
        this.clearLabelTimers();
        this.faceDetected = false;
        this.faceHoldStart = null;
        this.lastFaceSeen = null;
        this.detectionStartTime = null;
        this.labels = [];
        this.faceLabelQueue = [];
        this.faceLabelAnchor = null;
        this.faceLabelAnchorDirty = true;
        this.labelsContainer.innerHTML = '';
        this.updateProgress(0);
        this.instructions.classList.remove('hidden');
    }

    async softReset() {
        console.log('🔄 Performing soft reset (no page reload)');

        // Stop everything
        this.destroy();

        // Show loading
        this.loading.style.display = 'flex';
        this.loading.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>Restarting Analysis System...</p>
                <p class="loading-sub">Reinitializing camera</p>
            </div>
        `;

        try {
            // Re-init camera (models already loaded)
            await this.initCamera();

            // Hide loading
            this.loading.style.display = 'none';

            // Restart detection
            this.detect();

            console.log('✓ Soft reset complete');
        } catch (error) {
            console.error('❌ Soft reset failed:', error);
            this.showError(error.message);
        }
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

// Soft reset keyboard shortcut (Command+R or Ctrl+R)
// Prevents hard reload, does soft reset instead
window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        console.log('Intercepting reload - performing soft reset instead');
        if (app) {
            app.softReset();
        }
    }
});

// For kiosk debugging: triple-tap footer to trigger soft reset
let footerTapCount = 0;
let footerTapTimer = null;
document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('.system-footer');
    if (footer) {
        footer.addEventListener('click', () => {
            footerTapCount++;
            clearTimeout(footerTapTimer);

            if (footerTapCount === 3) {
                console.log('Triple-tap detected - triggering soft reset');
                if (app) {
                    app.softReset();
                }
                footerTapCount = 0;
            } else {
                footerTapTimer = setTimeout(() => {
                    footerTapCount = 0;
                }, 1000);
            }
        });
    }
});
