/* Rhyme Lab Pro - Hip-Hop Enhanced Edition
 * Advanced phonetic analysis with hip-hop specific techniques
 * Inspired by Eminem, Biggie, Tupac, Rakim, MF DOOM, Tech N9ne, and Snoop
 */

const { Plugin, PluginSettingTab, Setting, Notice, ItemView, MarkdownView } = require('obsidian');

// Import the hip-hop enhancements
const { HipHopRhymeAnalyzer, HIPHOP_CUSTOM_ARPA } = require('./hip-hop-enhancements.js');

const VIEW_TYPE_RHYME_RESULTS = 'rhyme-results-view-hiphop';

// Core phonetic analysis constants
const ARPA_VOWELS = new Set([
    "AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"
]);

const VOWEL_CLASSES = {
    "IY": "EE", "IH": "I", "EH": "E", "AE": "A", "AA": "AH", "AH": "UH", 
    "AO": "OR", "OW": "O", "UH": "U", "UW": "OO", "EY": "AY", "AY": "EYE", 
    "OY": "OY", "AW": "OW", "ER": "ER"
};

const CONSONANT_PAIRS = [
    ["S", "Z"], ["F", "V"], ["T", "D"], ["K", "G"], ["P", "B"], 
    ["SH", "ZH"], ["CH", "JH"], ["TH", "DH"], ["M", "N"]
];

const STOP_WORDS = new Set([
    "the", "and", "a", "an", "in", "on", "of", "is", "to", "for", "with", "that", 
    "this", "these", "those", "are", "be", "i", "you", "he", "she", "it", "we", 
    "they", "at", "from", "as", "by", "or", "if", "then", "but", "my", "me", 
    "your", "our", "their", "his", "her", "im", "i'm", "ya", "'em", "em", 
    "ain't", "aint", "uh", "yeah"
]);

// Enhanced custom dictionary combining original and hip-hop terms
const ENHANCED_CUSTOM_ARPA = {
    // Original dictionary
    "ya": ["Y", "AA1"], "yall": ["Y", "AO1", "L"], "y'all": ["Y", "AO1", "L"],
    "gon": ["G", "AA1", "N"], "gonna": ["G", "AH1", "N", "AH0"],
    "wanna": ["W", "AA1", "N", "AH0"], "bru": ["B", "R", "UW1"],
    "'em": ["AH0", "M"], "em": ["AH0", "M"], "lekker": ["L", "EH1", "K", "ER0"],
    "kak": ["K", "AA1", "K"], "finna": ["F", "IH1", "N", "AH0"],
    "tryna": ["T", "R", "AY1", "N", "AH0"], "boutta": ["B", "AW1", "T", "AH0"],
    "hella": ["HH", "EH1", "L", "AH0"], "ayy": ["EY1"], "bruh": ["B", "R", "AH1"],
    "nah": ["N", "AA1"], "aight": ["AY1", "T"], "yo": ["Y", "OW1"],
    "wassup": ["W", "AH1", "S", "AH0", "P"], "whatchu": ["W", "AH1", "CH", "UW0"],
    "cuz": ["K", "AH1", "Z"], "homie": ["HH", "OW1", "M", "IY0"],
    "thru": ["TH", "R", "UW1"], "tho": ["DH", "OW1"],
    
    // Hip-hop specific additions
    ...HIPHOP_CUSTOM_ARPA
};

// Pattern recognition for grapheme-to-phoneme conversion
const VOWEL_PATTERNS = [
    ["eigh", "EY"], ["ough", "AO"], ["augh", "AO"], ["eau", "OW"], ["igh", "AY"],
    ["oi", "OY"], ["oy", "OY"], ["ow", "AW"], ["ou", "AW"], ["ai", "EY"], 
    ["ay", "EY"], ["ey", "EY"], ["ea", "IY"], ["ee", "IY"], ["ie", "IY"], 
    ["oa", "OW"], ["oo", "UW"], ["eu", "UW"], ["au", "AO"], ["aw", "AO"], 
    ["ur", "ER"], ["ir", "ER"], ["er", "ER"], ["ar", "AA"], ["or", "AO"]
];

const CONSONANT_DIGRAPHS = {
    "ch": "CH", "sh": "SH", "th": "TH", "ph": "F", "wh": "W", "gh": "G", 
    "ng": "NG", "qu": "KW", "ck": "K", "kn": "N", "wr": "R", "ps": "S"
};

const SIMPLE_VOWELS = {
    "a": "AE", "e": "EH", "i": "IH", "o": "AO", "u": "AH", "y": "IH"
};

const CONSONANT_MAP = {
    'b': 'B', 'c': 'K', 'd': 'D', 'f': 'F', 'g': 'G', 'h': 'HH',
    'j': 'JH', 'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N', 'p': 'P',
    'q': 'K', 'r': 'R', 's': 'S', 't': 'T', 'v': 'V', 'w': 'W', 'x': 'K', 'z': 'Z'
};

// CM6 Integration
function maybeEnableCM6(plugin) {
    try {
        const cm6 = window.RhymeLabCM6;
        if (!cm6 || !plugin || !plugin.registerEditorExtension) return;
        plugin.registerEditorExtension(cm6.createRhymeExtension());
        plugin._setHighlights = (view, ranges) => cm6.setHighlights(view, ranges);
    } catch (_) { /* no-op */ }
}

// Enhanced Rhyme Analyzer with hip-hop features
class EnhancedRhymeAnalyzer {
    constructor(settings) {
        this.settings = settings;
        this.buildConsonantEquivalence();
        this.hiphopAnalyzer = new HipHopRhymeAnalyzer(this);
    }

    buildConsonantEquivalence() {
        this.consonantEquivalence = new Map();
        for (const [a, b] of CONSONANT_PAIRS) {
            if (!this.consonantEquivalence.has(a)) this.consonantEquivalence.set(a, new Set());
            if (!this.consonantEquivalence.has(b)) this.consonantEquivalence.set(b, new Set());
            this.consonantEquivalence.get(a).add(b);
            this.consonantEquivalence.get(b).add(a);
        }
    }

    cleanWord(word) {
        return word.toLowerCase().replace(/[^\\w']/g, '').trim();
    }

    g2pHeuristic(word) {
        const w = word.toLowerCase();
        const phones = [];
        let i = 0;
        let stressed = false;

        while (i < w.length) {
            let matched = false;

            // Check vowel patterns first
            for (const [pattern, phoneme] of VOWEL_PATTERNS) {
                if (w.substr(i, pattern.length) === pattern) {
                    const stress = !stressed ? "1" : "0";
                    phones.push(phoneme + stress);
                    stressed = true;
                    i += pattern.length;
                    matched = true;
                    break;
                }
            }

            if (matched) continue;

            // Check consonant digraphs
            for (const [digraph, phoneme] of Object.entries(CONSONANT_DIGRAPHS)) {
                if (w.substr(i, digraph.length) === digraph) {
                    phones.push(phoneme);
                    i += digraph.length;
                    matched = true;
                    break;
                }
            }

            if (matched) continue;

            const ch = w[i];

            // Handle individual vowels
            if ('aeiouy'.includes(ch)) {
                const phoneme = SIMPLE_VOWELS[ch] || "AH";
                const stress = !stressed ? "1" : "0";
                phones.push(phoneme + stress);
                stressed = true;
            } else {
                // Handle individual consonants
                const phoneme = CONSONANT_MAP[ch];
                if (phoneme) phones.push(phoneme);
            }

            i++;
        }

        // Clean up duplicates and empty entries
        const filtered = phones.filter(p => p);
        const result = [];
        for (const phone of filtered) {
            if (result.length === 0 || result[result.length - 1] !== phone || 
                ARPA_VOWELS.has(this.normalizePhone(phone))) {
                result.push(phone);
            }
        }

        return result;
    }

    wordToPhones(word) {
        const cleaned = this.cleanWord(word);
        // Check enhanced dictionary first
        if (ENHANCED_CUSTOM_ARPA[cleaned]) return [...ENHANCED_CUSTOM_ARPA[cleaned]];
        return this.g2pHeuristic(cleaned);
    }

    syllabify(phones) {
        const syllables = [];
        let current = [];
        let stressIndex = null;

        for (const phone of phones) {
            const base = this.normalizePhone(phone);
            
            if (ARPA_VOWELS.has(base)) {
                if (current.length > 0) {
                    syllables.push(current);
                }
                current = [phone];
                if (phone.endsWith("1")) {
                    stressIndex = syllables.length;
                }
            } else {
                current.push(phone);
            }
        }

        if (current.length > 0) {
            syllables.push(current);
        }

        if (stressIndex === null && syllables.length > 0) {
            stressIndex = syllables.length - 1;
        }

        return [syllables, stressIndex];
    }

    normalizePhone(phone) {
        return phone.replace(/\\d/g, '');
    }

    normalizeCoda(coda) {
        const fold = {
            "Z": "S", "V": "F", "D": "T", "G": "K", "B": "P", 
            "ZH": "SH", "JH": "CH", "DH": "TH"
        };

        let result = coda.map(c => fold[this.normalizePhone(c)] || this.normalizePhone(c));
        
        if (result.length > 0 && result[result.length - 1] === "HH") {
            result = result.slice(0, -1);
        }

        return result;
    }

    getVowelFamily(vowel) {
        const families = [
            new Set(["EE", "I", "E"]),
            new Set(["A", "AH", "ER", "UH"]),
            new Set(["O", "OR", "OO", "U"]),
            new Set(["EYE", "OW", "OY", "AY"])
        ];

        for (let i = 0; i < families.length; i++) {
            if (families[i].has(vowel)) {
                return i;
            }
        }
        return 9;
    }

    getRhymeKey(syllables, stressIndex) {
        if (syllables.length === 0) return null;

        const index = stressIndex !== null ? stressIndex : syllables.length - 1;
        const clampedIndex = Math.max(0, Math.min(index, syllables.length - 1));

        const extractNucleusAndCoda = (syllable) => {
            let nucleus = null;
            const coda = [];

            for (const phone of syllable) {
                const base = this.normalizePhone(phone);
                if (ARPA_VOWELS.has(base)) {
                    nucleus = VOWEL_CLASSES[base] || base;
                } else if (nucleus !== null) {
                    coda.push(base);
                }
            }

            return [nucleus, coda];
        };

        const [nucleus, coda] = extractNucleusAndCoda(syllables[clampedIndex]);
        let finalNucleus = nucleus;
        let finalCoda = [...coda];

        return {
            nucleus: finalNucleus,
            coda: this.normalizeCoda(finalCoda),
            vowelFamily: this.getVowelFamily(finalNucleus)
        };
    }

    // Enhanced analyze function with hip-hop features
    async analyzeText(text) {
        if (!text || text.trim().length === 0) {
            return {
                groups: [],
                stats: {
                    totalWords: 0,
                    rhymedWords: 0,
                    rhymeGroups: 0,
                    avgGroupSize: 0,
                    perfectRhymes: 0,
                    slantRhymes: 0
                },
                hiphop: {
                    internalRhymes: [],
                    compoundRhymes: [],
                    multisyllabicChains: [],
                    flowPatterns: [],
                    artistProfile: null
                }
            };
        }

        // Standard rhyme analysis
        const standardResult = await this.performStandardAnalysis(text);
        
        // Hip-hop specific analysis
        const hipHopResult = {
            internalRhymes: this.hiphopAnalyzer.detectInternalRhymes(text),
            compoundRhymes: this.hiphopAnalyzer.detectCompoundRhymes(text),
            multisyllabicChains: this.hiphopAnalyzer.detectMultisyllabicChains(text),
            flowPatterns: this.hiphopAnalyzer.analyzeFlowPattern(text),
            artistProfile: this.hiphopAnalyzer.generateArtistProfile(text)
        };

        return {
            ...standardResult,
            hipHop: hipHopResult
        };
    }

    async performStandardAnalysis(text) {
        const wordSpans = [];
        const lines = text.split('\\n');
        let charOffset = 0;

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            const words = line.split(/\\s+/);
            let wordOffset = 0;

            for (const word of words) {
                const cleaned = this.cleanWord(word);
                if (cleaned.length > 0 && !STOP_WORDS.has(cleaned)) {
                    const phones = this.wordToPhones(cleaned);
                    if (phones.length > 0) {
                        const [syllables, stressIndex] = this.syllabify(phones);
                        const rhymeKey = this.getRhymeKey(syllables, stressIndex);
                        
                        if (rhymeKey && rhymeKey.nucleus) {
                            const wordStart = charOffset + line.indexOf(word, wordOffset);
                            
                            wordSpans.push({
                                text: word,
                                cleaned: cleaned,
                                start: wordStart,
                                end: wordStart + word.length,
                                key: rhymeKey,
                                phones: phones,
                                syllables: syllables,
                                stressIndex: stressIndex,
                                lineNumber: lineNum
                            });
                        }
                    }
                }
                wordOffset += word.length + 1;
            }
            charOffset += line.length + 1;
        }

        // Group rhymes using enhanced similarity
        const groups = this.groupRhymes(wordSpans);
        const stats = this.calculateStats(wordSpans, groups);

        return { groups, stats };
    }

    groupRhymes(spans) {
        if (spans.length === 0) return [];

        const groups = [];
        const used = new Set();

        for (let i = 0; i < spans.length; i++) {
            if (used.has(i)) continue;

            const group = [spans[i]];
            used.add(i);

            for (let j = i + 1; j < spans.length; j++) {
                if (used.has(j)) continue;

                const distance = this.calculateRhymeDistance(spans[i].key, spans[j].key);
                
                if (distance <= this.settings.perfectThreshold) {
                    group.push(spans[j]);
                    used.add(j);
                }
            }

            if (group.length >= 2) {
                groups.push(group);
            }
        }

        return groups.sort((a, b) => b.length - a.length);
    }

    calculateRhymeDistance(key1, key2) {
        if (!key1 || !key2) return 1;

        let distance = 0;

        // Nucleus comparison
        if (key1.nucleus !== key2.nucleus) {
            if (key1.vowelFamily === key2.vowelFamily) {
                distance += 0.25;
            } else {
                distance += 0.6;
            }
        }

        // Coda comparison
        if (JSON.stringify(key1.coda) !== JSON.stringify(key2.coda)) {
            const codaSimilarity = this.calculateCodaSimilarity(key1.coda, key2.coda);
            distance += (1 - codaSimilarity) * 0.4;
        }

        return Math.min(1, distance);
    }

    calculateCodaSimilarity(coda1, coda2) {
        if (coda1.length === 0 && coda2.length === 0) return 1;
        if (coda1.length === 0 || coda2.length === 0) return 0.3;

        let similarity = 0;
        const maxLen = Math.max(coda1.length, coda2.length);

        for (let i = 0; i < maxLen; i++) {
            const c1 = coda1[i];
            const c2 = coda2[i];

            if (c1 === c2) {
                similarity += 1;
            } else if (c1 && c2 && this.consonantEquivalence.get(c1)?.has(c2)) {
                similarity += 0.7;
            }
        }

        return similarity / maxLen;
    }

    calculateStats(spans, groups) {
        const rhymedWords = groups.reduce((sum, group) => sum + group.length, 0);
        
        return {
            totalWords: spans.length,
            rhymedWords,
            rhymeGroups: groups.length,
            avgGroupSize: groups.length > 0 ? rhymedWords / groups.length : 0,
            perfectRhymes: groups.filter(g => g.length >= 2).length,
            slantRhymes: 0 // TODO: Calculate slant rhymes
        };
    }
}

// Enhanced Results View with hip-hop features
class EnhancedRhymeResultsView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_RHYME_RESULTS;
    }

    getDisplayText() {
        return "Hip-Hop Rhyme Analysis";
    }

    getIcon() {
        return "music";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h2", { text: "Hip-Hop Rhyme Analysis" });
        container.createEl("p", { text: "Analyze your lyrics with advanced hip-hop techniques" });
    }

    async displayResults(analysis) {
        const container = this.containerEl.children[1];
        container.empty();

        // Title
        container.createEl("h2", { text: "Hip-Hop Rhyme Analysis" });

        // Artist Profile Section
        if (analysis.hipHop.artistProfile) {
            this.displayArtistProfile(container, analysis.hipHop.artistProfile);
        }

        // Standard rhyme groups
        if (analysis.groups && analysis.groups.length > 0) {
            this.displayStandardRhymes(container, analysis.groups);
        }

        // Hip-hop specific features
        this.displayHipHopFeatures(container, analysis.hipHop);

        // Statistics
        this.displayStats(container, analysis.stats, analysis.hipHop);
    }

    displayArtistProfile(container, profile) {
        const profileSection = container.createEl("div", { cls: "rhyme-artist-profile" });
        profileSection.createEl("h3", { text: "🎤 Artist Style Profile" });

        const stats = profileSection.createEl("div", { cls: "profile-stats" });
        
        stats.createEl("div", { 
            text: `Complexity Score: ${Math.round(profile.complexity)}/100`,
            cls: "complexity-score"
        });

        stats.createEl("div", { 
            text: `Flow Style: ${profile.dominantFlowStyle}`,
            cls: "flow-style"
        });

        if (profile.similarArtists.length > 0) {
            stats.createEl("div", { 
                text: `Similar to: ${profile.similarArtists.join(', ')}`,
                cls: "similar-artists"
            });
        }

        const metrics = profileSection.createEl("div", { cls: "profile-metrics" });
        metrics.createEl("div", { 
            text: `Internal Rhyme Density: ${profile.internalRhymeDensity.toFixed(2)} per line`
        });
        
        if (profile.avgMultisyllabicLength > 0) {
            metrics.createEl("div", { 
                text: `Avg Multisyllabic Length: ${profile.avgMultisyllabicLength.toFixed(1)} syllables`
            });
        }
    }

    displayStandardRhymes(container, groups) {
        const rhymeSection = container.createEl("div", { cls: "rhyme-groups-section" });
        rhymeSection.createEl("h3", { text: "🎵 Traditional Rhyme Groups" });

        const colors = [
            'hsl(0, 70%, 50%)', 'hsl(45, 70%, 50%)', 'hsl(90, 70%, 50%)',
            'hsl(135, 70%, 50%)', 'hsl(180, 70%, 50%)', 'hsl(225, 70%, 50%)',
            'hsl(270, 70%, 50%)', 'hsl(315, 70%, 50%)'
        ];

        groups.forEach((group, index) => {
            if (group.length >= 2) {
                const groupDiv = rhymeSection.createEl("div", { cls: "rhyme-group" });
                const color = colors[index % colors.length];
                groupDiv.style.borderLeft = `4px solid ${color}`;

                const header = groupDiv.createEl("div", { cls: "group-header" });
                header.createEl("span", { 
                    text: `Group ${index + 1} (${group.length} words)`,
                    cls: "group-title"
                });

                const wordsList = groupDiv.createEl("div", { cls: "words-list" });
                group.forEach(word => {
                    const wordSpan = wordsList.createEl("span", { 
                        text: word.text,
                        cls: "rhyme-word"
                    });
                    wordSpan.style.backgroundColor = color + '20';
                    wordSpan.style.color = color;
                });
            }
        });
    }

    displayHipHopFeatures(container, hipHop) {
        // Internal Rhymes
        if (hipHop.internalRhymes.length > 0) {
            this.displayInternalRhymes(container, hipHop.internalRhymes);
        }

        // Compound Rhymes
        if (hipHop.compoundRhymes.length > 0) {
            this.displayCompoundRhymes(container, hipHop.compoundRhymes);
        }

        // Multisyllabic Chains
        if (hipHop.multisyllabicChains.length > 0) {
            this.displayMultisyllabicChains(container, hipHop.multisyllabicChains);
        }

        // Flow Patterns
        if (hipHop.flowPatterns.length > 0) {
            this.displayFlowPatterns(container, hipHop.flowPatterns);
        }
    }

    displayInternalRhymes(container, internalRhymes) {
        const section = container.createEl("div", { cls: "internal-rhymes-section" });
        section.createEl("h3", { text: "🔄 Internal Rhymes (Rakim Style)" });

        const list = section.createEl("ul");
        internalRhymes.slice(0, 10).forEach(rhyme => {
            const item = list.createEl("li");
            item.createEl("span", { 
                text: rhyme.word1,
                cls: "internal-word-1"
            });
            item.createEl("span", { text: " ↔ " });
            item.createEl("span", { 
                text: rhyme.word2,
                cls: "internal-word-2"
            });
        });
    }

    displayCompoundRhymes(container, compoundRhymes) {
        const section = container.createEl("div", { cls: "compound-rhymes-section" });
        section.createEl("h3", { text: "🔗 Compound Rhymes (Eminem Style)" });

        const list = section.createEl("ul");
        compoundRhymes.slice(0, 10).forEach(rhyme => {
            const item = list.createEl("li");
            item.createEl("span", { 
                text: rhyme.compound,
                cls: "compound-phrase"
            });
            item.createEl("span", { text: " → " });
            item.createEl("span", { 
                text: rhyme.target,
                cls: "compound-target"
            });
        });
    }

    displayMultisyllabicChains(container, chains) {
        const section = container.createEl("div", { cls: "multisyllabic-section" });
        section.createEl("h3", { text: "📏 Multisyllabic Chains (Big Pun Style)" });

        const list = section.createEl("ul");
        chains.slice(0, 10).forEach(chain => {
            const item = list.createEl("li");
            item.createEl("span", { 
                text: chain.phrase1,
                cls: "multi-phrase-1"
            });
            item.createEl("span", { text: " ⟷ " });
            item.createEl("span", { 
                text: chain.phrase2,
                cls: "multi-phrase-2"
            });
            item.createEl("span", { 
                text: ` (${chain.syllableCount} syllables)`,
                cls: "syllable-count"
            });
        });
    }

    displayFlowPatterns(container, patterns) {
        const section = container.createEl("div", { cls: "flow-patterns-section" });
        section.createEl("h3", { text: "🌊 Flow Analysis" });

        const avgSyllables = patterns.reduce((sum, p) => sum + p.syllableCount, 0) / patterns.length;
        const tempoDistribution = {};
        const styleDistribution = {};

        patterns.forEach(p => {
            tempoDistribution[p.tempo] = (tempoDistribution[p.tempo] || 0) + 1;
            styleDistribution[p.style] = (styleDistribution[p.style] || 0) + 1;
        });

        const stats = section.createEl("div", { cls: "flow-stats" });
        stats.createEl("div", { text: `Average Syllables per Line: ${avgSyllables.toFixed(1)}` });
        
        const tempoDiv = stats.createEl("div");
        tempoDiv.createEl("strong", { text: "Tempo Distribution: " });
        Object.entries(tempoDistribution).forEach(([tempo, count]) => {
            tempoDiv.createEl("span", { 
                text: `${tempo}: ${count} `,
                cls: `tempo-${tempo}`
            });
        });

        const styleDiv = stats.createEl("div");
        styleDiv.createEl("strong", { text: "Flow Styles: " });
        Object.entries(styleDistribution).forEach(([style, count]) => {
            styleDiv.createEl("span", { 
                text: `${style}: ${count} `,
                cls: `style-${style}`
            });
        });
    }

    displayStats(container, stats, hipHop) {
        const statsSection = container.createEl("div", { cls: "rhyme-stats" });
        statsSection.createEl("h3", { text: "📊 Analysis Statistics" });

        const grid = statsSection.createEl("div", { cls: "stats-grid" });
        
        this.createStatItem(grid, "Total Words", stats.totalWords);
        this.createStatItem(grid, "Rhymed Words", stats.rhymedWords);
        this.createStatItem(grid, "Rhyme Groups", stats.rhymeGroups);
        this.createStatItem(grid, "Internal Rhymes", hipHop.internalRhymes.length);
        this.createStatItem(grid, "Compound Rhymes", hipHop.compoundRhymes.length);
        this.createStatItem(grid, "Multisyllabic Chains", hipHop.multisyllabicChains.length);
    }

    createStatItem(container, label, value) {
        const item = container.createEl("div", { cls: "stat-item" });
        item.createEl("div", { text: label, cls: "stat-label" });
        item.createEl("div", { text: value.toString(), cls: "stat-value" });
    }
}

// Enhanced Plugin Class
class RhymeLabProHipHop extends Plugin {
    async onload() {
        await this.loadSettings();

        this.analyzer = new EnhancedRhymeAnalyzer(this.settings);

        this.registerView(
            VIEW_TYPE_RHYME_RESULTS,
            (leaf) => new EnhancedRhymeResultsView(leaf, this)
        );

        this.addCommand({
            id: 'analyze-rhymes-hiphop',
            name: 'Analyze rhymes (Hip-Hop Enhanced)',
            callback: () => this.analyzeCurrentNote()
        });

        this.addRibbonIcon('music', 'Hip-Hop Rhyme Analysis', () => {
            this.analyzeCurrentNote();
        });

        this.addSettingTab(new RhymeLabProHipHopSettingTab(this.app, this));

        maybeEnableCM6(this);
    }

    async loadSettings() {
        this.settings = Object.assign({}, {
            perfectThreshold: 0.1,
            slantThreshold: 0.4,
            assonanceThreshold: 0.6,
            enableInlineHighlights: true,
            enableHipHopFeatures: true
        }, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async analyzeCurrentNote() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active note found');
            return;
        }

        const text = activeView.editor.getValue();
        if (!text.trim()) {
            new Notice('No text to analyze');
            return;
        }

        new Notice('Analyzing hip-hop rhyme patterns...');

        try {
            const analysis = await this.analyzer.analyzeText(text);

            const leaf = this.app.workspace.getLeaf(false);
            await leaf.setViewState({
                type: VIEW_TYPE_RHYME_RESULTS,
                active: true
            });

            const view = leaf.view;
            if (view instanceof EnhancedRhymeResultsView) {
                await view.displayResults(analysis);
            }

            new Notice(`Analysis complete! Found ${analysis.groups.length} rhyme groups and ${analysis.hipHop.internalRhymes.length} internal rhymes`);

        } catch (error) {
            new Notice('Analysis failed: ' + error.message);
            console.error('Rhyme analysis error:', error);
        }
    }
}

// Settings Tab
class RhymeLabProHipHopSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Hip-Hop Rhyme Analysis Settings' });

        new Setting(containerEl)
            .setName('Perfect rhyme threshold')
            .setDesc('Lower values = stricter rhyme matching (0.0-1.0)')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.05)
                .setValue(this.plugin.settings.perfectThreshold)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.perfectThreshold = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable hip-hop features')
            .setDesc('Analyze internal rhymes, compound rhymes, and flow patterns')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableHipHopFeatures)
                .onChange(async (value) => {
                    this.plugin.settings.enableHipHopFeatures = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable inline highlights')
            .setDesc('Highlight rhymes directly in the editor')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableInlineHighlights)
                .onChange(async (value) => {
                    this.plugin.settings.enableInlineHighlights = value;
                    await this.plugin.saveSettings();
                }));
    }
}

module.exports = RhymeLabProHipHop;