// Satirical label generation system
// Phases escalate from "confident AI inference" to quantified-self doom.

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 1) => {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
};
const pad2 = (value) => String(value).padStart(2, '0');
const formatHm = (hours, minutes) => `${hours}h ${pad2(minutes)}m`;
const formatDhr = (days, hours) => `${days}d ${hours}hr`;
const bucket100 = (score) => {
    if (score >= 75) return 'High';
    if (score >= 45) return 'Moderate';
    return 'Low';
};

const LabelGenerator = {
    // Phase 0: "Obvious" inferences (front-loaded before the satirical escalation)
    phase0Labels: [
        { category: 'Facial Recognition ID Match', getValue: () => `${randInt(90, 99)}%` },
        { category: 'Social Media Profile Match', getValue: () => `${randInt(90, 99)}%` },
        { category: 'LinkedIn Profile Authenticity', getValue: () => `${randInt(8, 54)}%` },
        { category: 'Influence Quotient', getValue: () => `${randInt(8, 34)}th percentile` },
        { category: 'Security Threat (property crimes)', getValue: () => `${randInt(38, 97)}%` },
        { category: 'Security Threat (thought crimes)', getValue: () => `${randInt(38, 97)}%` }
    ],

    // Phase 1: Psychometric inference (confident, quantified, vague)
    phase1Labels: [
        { category: 'Culture Fit Score', getValue: () => `${randInt(2, 99)}%` },
        { category: 'Work Ethic', getValue: () => `${randInt(38, 97)}%` },
        { category: 'Identity Fragmentation', getValue: () => `${randFloat(3.0, 8.9, 1).toFixed(1)} distinct personas` },
        {
            category: 'Stress Level',
            getValue: () => {
                const score = randInt(8, 99);
                return `${bucket100(score)} (${score}/100)`;
            }
        },
        {
            category: 'Energy Level',
            getValue: () => {
                const score = randInt(6, 97);
                return `${bucket100(score)} (${score}/100)`;
            }
        },
        {
            category: 'Myers-Briggs Type Indicator',
            getValue: () => {
                const types = ['INTJ', 'INTP', 'INTJ', 'INTP', 'INFJ', 'INFP', 'INFJ', 'INFP'];
                return types[randInt(0, types.length - 1)];
            }
        }

    ],

    // Phase 2: Institutional/corporate valuation (human -> KPI)
    phase2Labels: [
        { category: 'Sleep Debt', getValue: () => formatHm(randInt(9, 21), randInt(0, 59)) },
        { category: 'Net Institutional Value', getValue: () => `$${randFloat(99, 999, 2).toFixed(2)}/day` },
        { category: 'Original Thought Suppression', getValue: () => `${randInt(72, 99)}%` },
        { category: 'Percent of Soul Sold', getValue: () => `${randInt(12, 99)}%` },
        { category: 'Unpaid Emotional Labor', getValue: () => `${randFloat(1.0, 18.0, 1).toFixed(1)} “no worries”/day` },
    ],

    // Phase 3: Prestige society / quantified self / algorithmic vibe-reading
    phase3Labels: [
        { category: 'Parasocial Investment (7d)', getValue: () => formatHm(randInt(0, 18), randInt(0, 59)) },
        { category: 'Hot Take Temperature', getValue: () => `${randInt(34, 109)}°C` },
        { category: 'Average Smile Duration', getValue: () => `${randInt(2, 33)}s` },
        { category: 'Main Character Probability', getValue: () => `${randInt(6, 94)}%` },
        { category: 'Ironic Detachment Level', getValue: () => `${randInt(38, 99)}%` },
        { category: 'Caffeine‑to‑Serotonin Substitution', getValue: () => `${randFloat(0.7, 4.6, 1).toFixed(1)}x` },
        { category: 'Subscription Load', getValue: () => `${randFloat(0.0, 12.0, 1).toFixed(1)} services/month` },
        { category: 'Life Admin Backlog', getValue: () => `${randInt(0, 120)} tasks` },
        { category: 'Career Pivot Probability', getValue: () => `${randInt(8, 92)}%` },
    ],

    // Phase 4: Deep interior readout (absurd, confident, precise)
    phase4Labels: [
        { category: 'Distance from True Self', getValue: () => `${randFloat(24.0, 1800.0, 1).toFixed(1)}mi` },
        { category: 'Time to Next Existential Crisis', getValue: () => formatDhr(randInt(0, 13), randInt(0, 23)) },
        { category: 'Existential Dread Level', getValue: () => `${randInt(1, 10)}/10` },
        { category: 'Loss of Faith in Humanity', getValue: () => `${randInt(52, 99)}%` },
        { category: 'Internal Scream Frequency', getValue: () => `${randInt(240, 1400)}Hz` },
        { category: 'Hunger Level', getValue: () => `${randInt(22, 99)}%` },
        { category: 'Social Battery Remaining', getValue: () => `${randInt(0, 67)}%` },
        { category: 'Fluorescent Light Exposure (7d)', getValue: () => `${randInt(12, 140)}hr` },
        { category: 'Natural Sunlight Exposure (7d)', getValue: () => `${randInt(0, 240)}m` },
        { category: 'Time to next Real Weekend', getValue: () => `${randInt(2, 40)} days` },
        { category: 'Screen Time (past 24h)', getValue: () => formatHm(randInt(2, 16), randInt(0, 59)) },
        { category: 'Emotional Bandwidth Remaining', getValue: () => `${randInt(3, 78)}%` },
        { category: 'Silence Tolerance', getValue: () => `${randInt(3, 160)}s` },
        { category: 'Inner Monologue Volume', getValue: () => `${randInt(48, 102)} dB` },
        { category: 'Social Comparison Rate', getValue: () => `${randInt(0, 84)} comparisons/hr` },
        { category: 'Perfectionism Coefficient', getValue: () => `${randFloat(0.9, 4.9, 1).toFixed(1)}x` },
        { category: 'Self‑Worth Tied to Output', getValue: () => `${randInt(35, 99)}%` },
        { category: 'Rest Guilt Level', getValue: () => `${randInt(1, 10)}/10` },
        { category: 'Boundary Enforcement Probability', getValue: () => `${randInt(0, 54)}%` },
        { category: 'Dopamine Budget Remaining', getValue: () => `${randInt(0, 55)}%` },
        { category: 'Purpose Clarity', getValue: () => `${randInt(0, 66)}%` },
        { category: 'Executive Function Availability', getValue: () => `${randInt(4, 74)}%` },
        { category: 'Working Memory Free Space', getValue: () => `${randInt(0, 42)}%` },
        { category: 'Inner Critic Volume', getValue: () => `${randInt(60, 112)} dB` },
        { category: 'Compliment Absorption Rate', getValue: () => `${randInt(0, 66)}%` },
        { category: 'Criticism Retention Half‑Life', getValue: () => `${randInt(7, 240)} days` },
        { category: 'Guilt Multiplier', getValue: () => `${randFloat(1.0, 6.2, 1).toFixed(1)}x` },
        { category: 'Blood Type', getValue: () => ['Oh, No', 'Red'][randInt(0, 1)] }
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
