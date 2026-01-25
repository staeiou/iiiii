// Satirical label generation system
// Phases escalate from real ML data to complete absurdity

const LabelGenerator = {
    // Phase 1: Standard Surveillance (real data from Human library)
    phase1Labels: [
        { category: 'AGE', getValue: (data) => data.age ? `${Math.round(data.age)} years` : 'Analyzing...' },
        { category: 'GENDER', getValue: (data) => {
            if (!data.gender) return 'Analyzing...';
            const score = data.genderScore ? ` (${(data.genderScore * 100).toFixed(1)}%)` : '';
            return data.gender.charAt(0).toUpperCase() + data.gender.slice(1) + score;
        }},
        { category: 'RACE/ETHNICITY', getValue: (data) => data.race || 'Analyzing...' },
        { category: 'EMOTION', getValue: (data) => data.emotion || 'Neutral' },
        { category: 'CONFIDENCE', getValue: (data) => data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : 'High' }
    ],

    // Phase 2: Corporate Metrics (fake, but plausible)
    phase2Labels: [
        { category: 'SYNERGY COEFFICIENT', getValue: () => `${(Math.random() * 3 + 7).toFixed(1)}/10` },
        { category: 'HUSTLE CULTURE COMPLIANCE', getValue: () => `${Math.floor(Math.random() * 20 + 80)}%` },
        { category: 'INNOVATION DISRUPTION POTENTIAL', getValue: () => ['Low', 'Moderate', 'High', 'Exponential'][Math.floor(Math.random() * 4)] },
        { category: 'QUARTERLY OKR ALIGNMENT', getValue: () => ['Poor', 'Fair', 'Good', 'Excellent'][Math.floor(Math.random() * 4)] },
        { category: 'CULTURE FIT SCORE', getValue: () => `${Math.floor(Math.random() * 15 + 85)}/100` },
        { category: 'THOUGHT LEADERSHIP INDEX', getValue: () => `${(Math.random() * 2 + 6).toFixed(2)}` },
        { category: 'PIVOT READINESS', getValue: () => `${Math.floor(Math.random() * 30 + 70)}%` },
        { category: 'GROWTH HACKING APTITUDE', getValue: () => ['Minimal', 'Developing', 'Proficient', 'Expert'][Math.floor(Math.random() * 4)] }
    ],

    // Phase 3: Pseudoscientific BS
    phase3Labels: [
        { category: 'ASTROLOGICAL SIGN', getValue: () => {
            const signs = ['Capricorn (Rising: Spreadsheet)', 'Aquarius (Moon: Pivot Table)', 'Pisces (Ascending: Gantt Chart)',
                          'Aries (Rising: Slack Message)', 'Taurus (Moon: Standing Desk)', 'Gemini (Ascending: Dual Monitor)',
                          'Cancer (Rising: Ergonomic Chair)', 'Leo (Moon: Corner Office)', 'Virgo (Ascending: To-Do List)',
                          'Libra (Rising: Work-Life Balance)', 'Scorpio (Moon: Dark Mode)', 'Sagittarius (Ascending: Remote Work)'];
            return signs[Math.floor(Math.random() * signs.length)];
        }},
        { category: 'SPIRIT ANIMAL', getValue: () => {
            const animals = ['A Very Tired Owl', 'An Overly Caffeinated Squirrel', 'A Passive-Aggressive Dolphin',
                           'An Anxious Hummingbird', 'A Burnt Out Phoenix', 'A Micromanaging Eagle',
                           'A People-Pleasing Golden Retriever', 'An Imposter Syndrome Chameleon'];
            return animals[Math.floor(Math.random() * animals.length)];
        }},
        { category: 'CHAKRA ALIGNMENT W/ COMPANY VALUES', getValue: () => `${Math.floor(Math.random() * 3 + 5)}/7 chakras aligned` },
        { category: 'AURA COLOR', getValue: () => {
            const auras = ['Corporate Blue (#0066CC)', 'Burnout Orange (#FF6600)', 'Meeting Gray (#808080)',
                          'Resignation Beige (#D4C4A0)', 'Startup Green (#00FF00)', 'Layoff Red (#CC0000)',
                          'Promotion Gold (#FFD700)', 'Middle Management Mauve (#CC99FF)'];
            return auras[Math.floor(Math.random() * auras.length)];
        }},
        { category: 'PAST LIFE', getValue: () => {
            const lives = ['Manila Folder', 'Filing Cabinet', 'Fax Machine', 'Rolodex', 'Dictaphone',
                          'Carbon Copy', 'Typewriter Ribbon', 'Punch Card', 'Overhead Projector'];
            return lives[Math.floor(Math.random() * lives.length)];
        }},
        { category: 'ENNEAGRAM TYPE', getValue: () => `Type ${Math.floor(Math.random() * 9 + 1)} (The Overthinker)` },
        { category: 'FENG SHUI OFFICE COMPATIBILITY', getValue: () => `${Math.floor(Math.random() * 20 + 60)}%` },
        { category: 'MERCURY RETROGRADE RESILIENCE', getValue: () => ['Vulnerable', 'Moderate', 'Strong', 'Immune'][Math.floor(Math.random() * 4)] }
    ],

    // Phase 4: Existential Absurdity
    phase4Labels: [
        { category: 'ATOMS EXPERIENCING EXISTENTIAL DREAD', getValue: () => `${(Math.random() * 5 + 1).toFixed(1)} trillion` },
        { category: 'PERCENTAGE OF SOUL SOLD', getValue: () => `${(Math.random() * 30 + 60).toFixed(1)}%` },
        { category: 'DISTANCE FROM TRUE SELF', getValue: () => `${Math.floor(Math.random() * 1000 + 500)} meters` },
        { category: 'TIME SINCE LAST GENUINE SMILE', getValue: () => {
            const days = Math.floor(Math.random() * 10);
            const hours = Math.floor(Math.random() * 24);
            const mins = Math.floor(Math.random() * 60);
            return `${days}d ${hours}h ${mins}m`;
        }},
        { category: 'OFFICE CHAIR COMPATIBILITY', getValue: () => `${(Math.random() * 10 + 90).toFixed(1)}%` },
        { category: 'LIKELIHOOD OF BEING SIMULATION', getValue: () => `${Math.floor(Math.random() * 40 + 60)}%` },
        { category: 'EMAILS THAT COULD HAVE BEEN SLACK MSGS', getValue: () => Math.floor(Math.random() * 500 + 1000) },
        { category: 'MEETINGS THAT COULD\'VE BEEN EMAILS', getValue: () => Math.floor(Math.random() * 100 + 200) },
        { category: 'INTERNAL SCREAMING FREQUENCY', getValue: () => `${(Math.random() * 50 + 50).toFixed(1)} Hz` },
        { category: 'EXISTENTIAL CRISIS COUNTDOWN', getValue: () => `${Math.floor(Math.random() * 72)} hours` },
        { category: 'DREAM JOB DIVERGENCE SCORE', getValue: () => `${Math.floor(Math.random() * 100)}% different path` },
        { category: 'FLUORESCENT LIGHT DAMAGE ESTIMATE', getValue: () => `${Math.floor(Math.random() * 5000 + 5000)} hours exposure` },
        { category: 'COFFEE DEPENDENCY LEVEL', getValue: () => `${(Math.random() * 3 + 7).toFixed(1)}/10 (Critical)` },
        { category: 'IMPOSTOR SYNDROME INTENSITY', getValue: () => `${Math.floor(Math.random() * 30 + 70)}% (Elevated)` },
        { category: 'LINKEDIN PROFILE AUTHENTICITY', getValue: () => `${Math.floor(Math.random() * 40 + 10)}% (Below Average)` },
        { category: 'WORK-LIFE BOUNDARY DISSOLUTION', getValue: () => `${Math.floor(Math.random() * 20 + 80)}% merged` },
        { category: 'PASSIVE INCOME DREAM LIKELIHOOD', getValue: () => `${(Math.random() * 2).toFixed(2)}%` },
        { category: 'YEARS UNTIL SABBATICAL', getValue: () => `${Math.floor(Math.random() * 20 + 10)} (Aspirational)` },
        { category: 'PROBABILITY OF AI REPLACING YOUR JOB', getValue: () => `${Math.floor(Math.random() * 50 + 50)}%` },
        { category: 'SYNERGISTIC PARADIGM SHIFTS WITNESSED', getValue: () => Math.floor(Math.random() * 50 + 100) }
    ],

    // Get labels for a specific phase
    getPhaseLabels(phase, faceData = {}) {
        const phases = [this.phase1Labels, this.phase2Labels, this.phase3Labels, this.phase4Labels];
        if (phase < 1 || phase > 4) return [];

        const labels = phases[phase - 1];
        return labels.map(label => ({
            category: label.category,
            value: label.getValue(faceData),
            phase: phase
        }));
    },

    // Get a random subset of labels from a phase
    getRandomLabels(phase, count, faceData = {}) {
        const allLabels = this.getPhaseLabels(phase, faceData);
        const shuffled = [...allLabels].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LabelGenerator;
}
