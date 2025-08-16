/* Rhyme Lab Pro - Complete Phonetic Analysis Engine
 * Advanced rhyme detection with multi-syllabic patterns, assonance, and slant rhymes
 * Direct port of Python rhyme analysis functionality to JavaScript
 */

const { Plugin, PluginSettingTab, Setting, Notice, ItemView, MarkdownView } = require('obsidian');

const VIEW_TYPE_RHYME_RESULTS = 'rhyme-results-view';

// Core phonetic analysis constants derived from computational linguistics research
const ARPA_VOWELS = new Set([
    "AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"
]);

// Vowel classification system groups similar-sounding vowels for assonance detection
const VOWEL_CLASSES = {
    "IY": "EE", "IH": "I", "EH": "E", "AE": "A", "AA": "AH", "AH": "UH", 
    "AO": "OR", "OW": "O", "UH": "U", "UW": "OO", "EY": "AY", "AY": "EYE", 
    "OY": "OY", "AW": "OW", "ER": "ER"
};

// Consonant pairs that can substitute for each other in slant rhymes
const CONSONANT_PAIRS = [
    ["S", "Z"], ["F", "V"], ["T", "D"], ["K", "G"], ["P", "B"], 
    ["SH", "ZH"], ["CH", "JH"], ["TH", "DH"], ["M", "N"]
];

// Common words excluded from rhyme analysis due to their ubiquity
const STOP_WORDS = new Set([
    "the", "and", "a", "an", "in", "on", "of", "is", "to", "for", "with", "that", 
    "this", "these", "those", "are", "be", "i", "you", "he", "she", "it", "we", 
    "they", "at", "from", "as", "by", "or", "if", "then", "but", "my", "me", 
    "your", "our", "their", "his", "her", "im", "i'm", "ya", "'em", "em", 
    "ain't", "aint", "uh", "yeah"
]);

// Custom phonetic dictionary for modern slang, contractions, and regional variations
// This addresses the limitation of traditional phonetic dictionaries with contemporary language
const CUSTOM_ARPA = {
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
    "thru": ["TH", "R", "UW1"], "tho": ["DH", "OW1"]
};

// Sophisticated pattern recognition for grapheme-to-phoneme conversion
// These patterns handle complex English spelling-to-sound relationships
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

// Core rhyme analysis engine - this class handles the computational linguistics
function maybeEnableCM6(plugin) {
  try {
    const cm6 = window.RhymeLabCM6;
    if (!cm6 || !plugin || !plugin.registerEditorExtension) return;
    plugin.registerEditorExtension(cm6.createRhymeExtension());
    plugin._setHighlights = (view, ranges) => cm6.setHighlights(view, ranges);
  } catch (_) { /* no-op */ }
}

class RhymeAnalyzer {
    constructor(settings) {
        this.settings = settings;
        this.buildConsonantEquivalence();
    }

    // Build phonetic equivalence mapping for consonant substitution detection
    buildConsonantEquivalence() {
        this.consonantEquivalence = new Map();
        for (const [a, b] of CONSONANT_PAIRS) {
            if (!this.consonantEquivalence.has(a)) this.consonantEquivalence.set(a, new Set());
            if (!this.consonantEquivalence.has(b)) this.consonantEquivalence.set(b, new Set());
            this.consonantEquivalence.get(a).add(b);
            this.consonantEquivalence.get(b).add(a);
        }
    }

    // Normalize word input by removing punctuation while preserving contractions
    cleanWord(word) {
        return word.toLowerCase().replace(/[^\\w']/g, '').trim();
    }

    // Advanced grapheme-to-phoneme conversion using pattern recognition
    // This function converts written letters into phonetic representations
    g2pHeuristic(word) {
        const w = word.toLowerCase();
        const phones = [];
        let i = 0;
        let stressed = false; // Track if we've assigned primary stress yet

        while (i < w.length) {
            let matched = false;

            // First priority: complex vowel patterns (eigh, ough, etc.)
            for (const [pattern, phoneme] of VOWEL_PATTERNS) {
                if (w.substr(i, pattern.length) === pattern) {
                    const stress = !stressed ? "1" : "0"; // Primary stress on first vowel
                    phones.push(phoneme + stress);
                    stressed = true;
                    i += pattern.length;
                    matched = true;
                    break;
                }
            }

            if (matched) continue;

            // Second priority: consonant digraphs (ch, sh, th, etc.)
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

            // Handle individual vowels with stress assignment
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

        // Clean up the phoneme sequence by removing empty entries and duplicate consonants
        const filtered = phones.filter(p => p);
        const result = [];
        for (const phone of filtered) {
            // Avoid duplicate consonants unless they're vowels (which can repeat for emphasis)
            if (result.length === 0 || result[result.length - 1] !== phone || 
                ARPA_VOWELS.has(this.normalizePhone(phone))) {
                result.push(phone);
            }
        }

        return result;
    }

    // Convert word to phonetic representation using best available method
    wordToPhones(word) {
        const cleaned = this.cleanWord(word);
        // Check custom dictionary first for known exceptions and slang
        if (CUSTOM_ARPA[cleaned]) return [...CUSTOM_ARPA[cleaned]];
        // Fall back to heuristic conversion for unknown words
        return this.g2pHeuristic(cleaned);
    }

    // Split phoneme sequence into syllables and identify stress patterns
    // Syllables are fundamental units for rhyme analysis
    syllabify(phones) {
        const syllables = [];
        let current = [];
        let stressIndex = null;

        for (const phone of phones) {
            const base = this.normalizePhone(phone);
            
            // Vowels mark syllable boundaries and carry stress information
            if (ARPA_VOWELS.has(base)) {
                if (current.length > 0) {
                    syllables.push(current);
                }
                current = [phone];
                // Check for primary stress marker
                if (phone.endsWith("1")) {
                    stressIndex = syllables.length;
                }
            } else {
                // Consonants attach to the current syllable
                current.push(phone);
            }
        }

        if (current.length > 0) {
            syllables.push(current);
        }

        // Default to final syllable stress if no explicit stress found
        if (stressIndex === null && syllables.length > 0) {
            stressIndex = syllables.length - 1;
        }

        return [syllables, stressIndex];
    }

    // Remove stress and tone markers from phonemes for comparison
    normalizePhone(phone) {
        return phone.replace(/\\d/g, '');
    }

    // Normalize consonant clusters for more flexible rhyme matching
    normalizeCoda(coda) {
        // Map voiced consonants to their unvoiced equivalents for slant rhyme detection
        const fold = {
            "Z": "S", "V": "F", "D": "T", "G": "K", "B": "P", 
            "ZH": "SH", "JH": "CH", "DH": "TH"
        };

        let result = coda.map(c => fold[this.normalizePhone(c)] || this.normalizePhone(c));
        
        // Remove trailing aspiration which doesn't affect rhyme perception
        if (result.length > 0 && result[result.length - 1] === "HH") {
            result = result.slice(0, -1);
        }

        return result;
    }

    // Group vowels into families for assonance detection
    getVowelFamily(vowel) {
        const families = [
            new Set(["EE", "I", "E"]),           // Front vowels
            new Set(["A", "AH", "ER", "UH"]),    // Central vowels  
            new Set(["O", "OR", "OO", "U"]),     // Back vowels
            new Set(["EYE", "OW", "OY", "AY"])   // Diphthongs
        ];

        for (let i = 0; i < families.length; i++) {
            if (families[i].has(vowel)) {
                return i;
            }
        }
        return 9; // Unknown family
    }

    // Extract the rhyme key (nucleus + coda) from syllable structure
    // This is the core unit used for rhyme comparison
    getRhymeKey(syllables, stressIndex) {
        if (syllables.length === 0) return null;

        const index = stressIndex !== null ? stressIndex : syllables.length - 1;
        const clampedIndex = Math.max(0, Math.min(index, syllables.length - 1));

        // Extract nucleus (vowel) and coda (following consonants) from syllable
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

        // For weak codas, include the previous syllable to capture more of the rhyme
        // This handles cases like "running" and "coming" where the rhyme spans syllables
        const weakCodeas = new Set([["S"], ["Z"], ["R"], ["L"], ["T"], ["D"], ["N"], ["M"]]);
        const codaKey = JSON.stringify(coda);
        const isWeakCoda = coda.length <= 1 || Array.from(weakCodeas).some(weak => 
            JSON.stringify(weak) === codaKey
        );

        if (isWeakCoda && clampedIndex > 0) {
            const [prevNucleus, prevCoda] = extractNucleusAndCoda(syllables[clampedIndex - 1]);
            if (prevNucleus) {
                finalNucleus = prevNucleus + "+" + (nucleus || "");
            }
            finalCoda = [...prevCoda, ...coda];
        }

        return finalNucleus ? [finalNucleus, this.normalizeCoda(finalCoda)] : null;
    }

    // Generate multi-syllabic rhyme keys for complex rhyme patterns
    getMultisyllabicKey(syllables, tail) {
        if (syllables.length === 0 || tail <= 0) return null;

        const actualTail = Math.min(tail, syllables.length);
        const keyParts = [];

        // Collect phonemes from the last 'tail' syllables
        for (let i = syllables.length - actualTail; i < syllables.length; i++) {
            for (const phone of syllables[i]) {
                const base = this.normalizePhone(phone);
                if (ARPA_VOWELS.has(base)) {
                    keyParts.push(VOWEL_CLASSES[base] || base);
                } else {
                    keyParts.push(base);
                }
            }
        }

        return keyParts.length > 0 ? keyParts.join("-") : null;
    }

    // Calculate phonetic distance between vowel nuclei
    nucleusDistance(n1, n2) {
        if (n1 === n2) return 0.0; // Perfect match

        // Handle compound nuclei by comparing the final vowel
        const a = n1.split("+").pop() || n1;
        const b = n2.split("+").pop() || n2;

        if (a === b) return 0.05; // Very close match

        // Check if vowels belong to the same phonetic family
        if (this.getVowelFamily(a) === this.getVowelFamily(b)) {
            return 0.25; // Same family, moderate similarity
        }

        return 0.6; // Different families, low similarity
    }

    // Calculate phonetic distance between consonant codas
    codaDistance(c1, c2) {
        if (JSON.stringify(c1) === JSON.stringify(c2)) return 0.0; // Perfect match
        if (c1.length === 0 || c2.length === 0) return 0.6; // One empty coda

        const minLength = Math.min(c1.length, c2.length);
        let mismatches = 0;

        // Compare consonants from the end (most important for rhyme perception)
        for (let i = 0; i < minLength; i++) {
            const a = c1[c1.length - 1 - i];
            const b = c2[c2.length - 1 - i];
            
            // Check for exact match or equivalent consonants
            if (a === b || (this.consonantEquivalence.get(a)?.has(b) ?? false)) {
                continue;
            }
            mismatches++;
        }

        // Penalize length differences
        mismatches += Math.abs(c1.length - c2.length) * 0.5;
        return Math.min(1.0, mismatches * 0.35);
    }

    // Calculate overall rhyme distance combining nucleus and coda similarities
    rhymeDistance(k1, k2) {
        // Weight nucleus more heavily than coda for rhyme perception
        return 0.7 * this.nucleusDistance(k1[0], k2[0]) + 0.3 * this.codaDistance(k1[1], k2[1]);
    }

    // Detect assonance (vowel sound repetition) between words
    detectAssonance(w1, w2) {
        if (w1.syllables.length === 0 || w2.syllables.length === 0) return false;

        const getStressedVowel = (word) => {
            const stressIndex = word.stress !== null ? word.stress : word.syllables.length - 1;
            if (stressIndex >= 0 && stressIndex < word.syllables.length) {
                for (const phone of word.syllables[stressIndex]) {
                    const base = this.normalizePhone(phone);
                    if (ARPA_VOWELS.has(base)) {
                        return VOWEL_CLASSES[base] || base;
                    }
                }
            }
            return null;
        };

        const v1 = getStressedVowel(w1);
        const v2 = getStressedVowel(w2);

        return v1 !== null && v2 !== null && 
               (v1 === v2 || this.getVowelFamily(v1) === this.getVowelFamily(v2));
    }

    // Check if a word appears at the end of its line
    isLineEnd(wordIndex, words) {
        const line = words[wordIndex].line;
        for (let i = wordIndex + 1; i < words.length; i++) {
            if (words[i].line !== line) return true; // next word is on a new line
            if (words[i].line === line) return false; // found a later word on same line
        }
        return true; // last word overall
    }
        }
        return true;
    }

    // Build traditional rhyme scheme notation (AABA, etc.)
    buildScheme(words, wordToGroup) {
        const maxLine = Math.max(...words.map(w => w.line), -1);
        const groupIdToLetter = {};
        let nextCharCode = 65; // Start with 'A'
        const sequence = [];

        for (let line = 0; line <= maxLine; line++) {
            let lastWordIndex = null;
            
            // Find the last word on this line
            for (let i = words.length - 1; i >= 0; i--) {
                if (words[i].line === line) {
                    lastWordIndex = i;
                    break;
                }
            }

            if (lastWordIndex === null) {
                sequence.push("-");
                continue;
            }

            const groups = wordToGroup[lastWordIndex] || [];
            if (groups.length === 0) {
                sequence.push("-");
                continue;
            }

            const groupId = groups[0][0];
            if (!(groupId in groupIdToLetter)) {
                groupIdToLetter[groupId] = String.fromCharCode(nextCharCode++);
            }

            sequence.push(groupIdToLetter[groupId]);
        }

        return sequence.join("");
    }

    // Main analysis function that processes text and returns comprehensive rhyme data
    async analyze(text) {
        const lines = text.split('\\n');
        const words = [];

        // Extract and process words from each line
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const wordMatches = Array.from(line.matchAll(/[A-Za-z']+/g));
            
            for (const match of wordMatches) {
                const word = match[0];
                const cleaned = this.cleanWord(word);

                // Skip common stop words unless they're emphasized
                if (STOP_WORDS.has(cleaned) && cleaned.length <= 2) {
                    continue;
                }

                const phones = this.wordToPhones(cleaned);
                const [syllables, stress] = this.syllabify(phones);

                words.push({
                    line: lineIndex,
                    text: word,
                    lower: cleaned,
                    phones,
                    syllables,
                    stress,
                    position: match.index || 0
                });
            }
        }

        // Build rhyme spans - these represent potential rhyme units
        const spans = [];
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const key = this.getRhymeKey(word.syllables, word.stress);
            
            if (key) {
                const stressIndex = word.stress !== null ? word.stress : word.syllables.length - 1;
                const tail = Math.max(1, word.syllables.length - stressIndex);

                // Extract multi-syllabic patterns for sophisticated rhyme detection
                const multiKeys = {};
                for (let t = 2; t < Math.min(4, word.syllables.length + 1); t++) {
                    const multiKey = this.getMultisyllabicKey(word.syllables, t);
                    if (multiKey) {
                        multiKeys[t] = multiKey;
                    }
                }

                spans.push({
                    wordIndex: i,
                    line: word.line,
                    key,
                    tail,
                    multiKeys
                });
            }
        }

        // Group rhymes using sophisticated pattern matching
        const groups = [];
        const used = new Array(spans.length).fill(false);

        // First pass: detect perfect and multi-syllabic rhymes
        for (let i = 0; i < spans.length; i++) {
            if (used[i]) continue;

            const groupIndices = [i];
            used[i] = true;

            for (let j = i + 1; j < spans.length; j++) {
                if (used[j]) continue;

                // Skip identical words (not rhymes, just repetition)
                if (words[spans[i].wordIndex].lower === words[spans[j].wordIndex].lower) {
                    continue;
                }

                // Prioritize multi-syllabic matches (more sophisticated rhymes)
                let matched = false;
                for (const tail of [3, 2]) {
                    if (spans[i].multiKeys[tail] && spans[j].multiKeys[tail] && 
                        spans[i].multiKeys[tail] === spans[j].multiKeys[tail]) {
                        groupIndices.push(j);
                        used[j] = true;
                        matched = true;
                        break;
                    }
                }

                if (matched) continue;

                // Check regular rhyme distance
                const distance = this.rhymeDistance(spans[i].key, spans[j].key);
                
                // Apply dynamic thresholds based on word position
                const isLineEndI = this.isLineEnd(spans[i].wordIndex, words);
                const isLineEndJ = this.isLineEnd(spans[j].wordIndex, words);
                
                let threshold;
                if (isLineEndI && isLineEndJ) {
                    threshold = this.settings.perfectThreshold; // Strictest for end rhymes
                } else if (isLineEndI || isLineEndJ) {
                    threshold = (this.settings.perfectThreshold + this.settings.slantThreshold) / 2;
                } else {
                    threshold = this.settings.slantThreshold; // Most lenient for internal rhymes
                }

                if (distance <= threshold) {
                    groupIndices.push(j);
                    used[j] = true;
                }
            }

            // Only create groups with multiple members
            if (groupIndices.length >= 2) {
                groups.push({
                    spans: groupIndices.map(idx => spans[idx]),
                    type: 'rhyme'
                });
            }
        }

        // Detect assonance groups if enabled
        const assonanceGroups = [];
        if (this.settings.highlightAssonance) {
            const assonanceUsed = new Array(words.length).fill(false);

            for (let i = 0; i < words.length; i++) {
                if (assonanceUsed[i] || STOP_WORDS.has(words[i].lower)) continue;

                const group = [i];
                assonanceUsed[i] = true;

                for (let j = i + 1; j < words.length; j++) {
                    if (assonanceUsed[j] || STOP_WORDS.has(words[j].lower)) continue;
                    if (words[j].lower === words[i].lower) continue;

                    if (this.detectAssonance(words[i], words[j])) {
                        group.push(j);
                        assonanceUsed[j] = true;
                    }
                }

                // Require at least 3 words for a meaningful assonance group
                if (group.length >= 3) {
                    assonanceGroups.push(group);
                }
            }
        }

        // Build comprehensive word-to-group mapping
        const wordToGroup = {};

        groups.forEach((group, groupId) => {
            group.spans.forEach(span => {
                if (!wordToGroup[span.wordIndex]) {
                    wordToGroup[span.wordIndex] = [];
                }
                wordToGroup[span.wordIndex].push([groupId, span.tail, 'rhyme']);
            });
        });

        assonanceGroups.forEach((group, assonanceId) => {
            group.forEach(wordIndex => {
                if (!wordToGroup[wordIndex]) {
                    wordToGroup[wordIndex] = [];
                }
                wordToGroup[wordIndex].push([groups.length + assonanceId, 1, 'assonance']);
            });
        });

        // Detect internal rhymes within individual lines
        const internalRhymes = {};
        if (this.settings.showInternalRhymes) {
            for (let lineIndex = 0; lineIndex <= Math.max(...words.map(w => w.line), -1); lineIndex++) {
                const lineWords = words.map((w, i) => [i, w]).filter(([_, w]) => w.line === lineIndex);
                const pairs = [];

                for (let i = 0; i < lineWords.length; i++) {
                    for (let j = i + 1; j < lineWords.length; j++) {
                        const [wi1, w1] = lineWords[i];
                        const [wi2, w2] = lineWords[j];

                        if (w1.lower === w2.lower) continue;

                        const k1 = this.getRhymeKey(w1.syllables, w1.stress);
                        const k2 = this.getRhymeKey(w2.syllables, w2.stress);

                        if (k1 && k2 && this.rhymeDistance(k1, k2) <= this.settings.slantThreshold) {
                            pairs.push([wi1, wi2]);
                        }
                    }
                }

                if (pairs.length > 0) {
                    internalRhymes[lineIndex] = pairs;
                }
            }
        }

        // Calculate comprehensive metrics
        const totalSyllables = words.reduce((sum, w) => sum + w.syllables.length, 0);
        const rhymingSyllables = words.reduce((sum, _, i) => {
            const maxTail = Math.max(...(wordToGroup[i] || [[0, 0]]).map(([_, tail]) => tail), 0);
            return sum + maxTail;
        }, 0);
        const multiSyllables = Object.values(wordToGroup).reduce((sum, groups) => {
            return sum + groups.reduce((groupSum, [_, tail]) => groupSum + (tail >= 2 ? tail : 0), 0);
        }, 0);

        const linesWithRhymes = {};
        Object.entries(wordToGroup).forEach(([wordIndexStr, groups]) => {
            const wordIndex = parseInt(wordIndexStr);
            const line = words[wordIndex].line;
            const maxTail = Math.max(...groups.map(([_, tail]) => tail));
            linesWithRhymes[line] = (linesWithRhymes[line] || 0) + maxTail;
        });

        const avgPerLine = Object.keys(linesWithRhymes).length > 0 
            ? Object.values(linesWithRhymes).reduce((a, b) => a + b, 0) / Object.keys(linesWithRhymes).length 
            : 0;

        const density = totalSyllables > 0 ? rhymingSyllables / totalSyllables : 0;
        const multiRatio = rhymingSyllables > 0 ? multiSyllables / rhymingSyllables : 0;
        const scheme = this.buildScheme(words, wordToGroup);

        const rhymeTypes = {};
        Object.values(wordToGroup).forEach(groups => {
            groups.forEach(([_, __, type]) => {
                rhymeTypes[type] = (rhymeTypes[type] || 0) + 1;
            });
        });

        return {
            lines,
            words,
            spans,
            groups,
            assonanceGroups,
            internalRhymes,
            wordToGroup,
            metrics: {
                totalSyllables,
                rhymingSyllables,
                density,
                multiRatio,
                avgPerLine,
                scheme,
                rhymeTypes,
                uniqueRhymeGroups: groups.length,
                uniqueAssonanceGroups: assonanceGroups.length
            }
        };
    }
}

// Results view component for displaying analysis in Obsidian sidebar
class RhymeResultsView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.currentAnalysis = null;
    }
    
    getViewType() { return VIEW_TYPE_RHYME_RESULTS; }
    getDisplayText() { return 'Rhyme Analysis'; }
    getIcon() { return 'music'; }
    
    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('rhyme-results-view');
        
        const header = container.createEl('h2', { text: 'Rhyme Analysis Results' });
        this.contentEl = container.createDiv('rhyme-content');
        this.renderEmpty();
    }
    
    // Display empty state when no analysis has been performed
    renderEmpty() {
        this.contentEl.empty();
        const empty = this.contentEl.createDiv('rhyme-empty-state');
        empty.createEl('div', { text: '🎵', cls: 'rhyme-empty-icon' });
        empty.createEl('h3', { text: 'No Analysis Yet', cls: 'rhyme-empty-title' });
        empty.createEl('p', { text: 'Run "Analyze rhymes" on your lyrics to see detailed results here.' });
    }
    
    // Update the view with new analysis results
    setAnalysis(analysis) {
        this.currentAnalysis = analysis;
        this.renderAnalysis();
    }
    
    // Render comprehensive analysis results
    renderAnalysis() {
        if (!this.currentAnalysis) {
            this.renderEmpty();
            return;
        }

        this.contentEl.empty();
        
        // Render metrics overview
        this.renderMetrics();
        
        // Render rhyme groups
        if (this.currentAnalysis.groups.length > 0) {
            this.renderRhymeGroups();
        }
        
        // Render assonance groups if present
        if (this.currentAnalysis.assonanceGroups.length > 0) {
            this.renderAssonanceGroups();
        }
        
        // Render internal rhymes if present
        if (Object.keys(this.currentAnalysis.internalRhymes).length > 0) {
            this.renderInternalRhymes();
        }
        
        // Render detailed word breakdown
        this.renderWordBreakdown();
    }
    
    // Display key metrics in an organized grid
    renderMetrics() {
        const section = this.contentEl.createDiv('rhyme-section');
        section.createEl('h3', { text: 'Analysis Metrics', cls: 'rhyme-section-title' });
        
        const metrics = this.currentAnalysis.metrics;
        const grid = section.createDiv('rhyme-metrics-grid');
        
        this.createMetricCard(grid, 'Total Syllables', metrics.totalSyllables);
        this.createMetricCard(grid, 'Rhyming Syllables', metrics.rhymingSyllables);
        this.createMetricCard(grid, 'Rhyme Density', `${(metrics.density * 100).toFixed(1)}%`);
        this.createMetricCard(grid, 'Multi-syllabic Ratio', `${(metrics.multiRatio * 100).toFixed(1)}%`);
        this.createMetricCard(grid, 'Avg per Line', metrics.avgPerLine.toFixed(2));
        this.createMetricCard(grid, 'End Rhyme Scheme', metrics.scheme || 'No pattern');
    }
    
    // Create individual metric display cards
    createMetricCard(parent, label, value) {
        const card = parent.createDiv('rhyme-metric-card');
        card.createDiv('rhyme-metric-label').setText(label);
        card.createDiv('rhyme-metric-value').setText(value.toString());
    }
    
    // Display rhyme groups with color coding
    renderRhymeGroups() {
        const section = this.contentEl.createDiv('rhyme-section');
        section.createEl('h3', { 
            text: `Rhyme Groups (${this.currentAnalysis.groups.length})`, 
            cls: 'rhyme-section-title' 
        });
        
        this.currentAnalysis.groups.forEach((group, index) => {
            const groupEl = section.createDiv('rhyme-group');
            const header = groupEl.createDiv('rhyme-group-header');
            
            header.createSpan('rhyme-group-indicator').addClass(`rhyme-group-${index % 8}`);
            header.createSpan('rhyme-group-title').setText(`Group ${index + 1}`);
            header.createSpan('rhyme-group-count').setText(`(${group.spans.length} words)`);
            
            const wordsList = groupEl.createDiv('rhyme-words-list');
            group.spans.forEach(span => {
                const word = this.currentAnalysis.words[span.wordIndex];
                const wordEl = wordsList.createSpan('rhyme-word');
                wordEl.setText(word.text);
                wordEl.addClass(`rhyme-group-${index % 8}`);
                
                const lineInfo = wordEl.createSpan('rhyme-line-info');
                lineInfo.setText(`L${word.line + 1}`);
            });
        });
    }
    
    // Display assonance patterns
    renderAssonanceGroups() {
        const section = this.contentEl.createDiv('rhyme-section');
        section.createEl('h3', { 
            text: `Assonance Groups (${this.currentAnalysis.assonanceGroups.length})`, 
            cls: 'rhyme-section-title' 
        });
        
        this.currentAnalysis.assonanceGroups.forEach((group, index) => {
            const groupEl = section.createDiv('rhyme-group');
            const header = groupEl.createDiv('rhyme-group-header');
            
            header.createSpan('assonance-group-indicator').addClass(`assonance-group-${index % 4}`);
            header.createSpan('rhyme-group-title').setText(`Assonance ${index + 1}`);
            header.createSpan('rhyme-group-count').setText(`(${group.length} words)`);
            
            const wordsList = groupEl.createDiv('rhyme-words-list');
            group.forEach(wordIndex => {
                const word = this.currentAnalysis.words[wordIndex];
                const wordEl = wordsList.createSpan('rhyme-word');
                wordEl.setText(word.text);
                wordEl.addClass(`assonance-group-${index % 4}`);
                
                const lineInfo = wordEl.createSpan('rhyme-line-info');
                lineInfo.setText(`L${word.line + 1}`);
            });
        });
    }
    
    // Display internal rhyme patterns
    renderInternalRhymes() {
        const section = this.contentEl.createDiv('rhyme-section');
        section.createEl('h3', { text: 'Internal Rhymes', cls: 'rhyme-section-title' });
        
        Object.entries(this.currentAnalysis.internalRhymes).forEach(([lineStr, pairs]) => {
            const lineNum = parseInt(lineStr);
            const lineEl = section.createDiv('rhyme-internal-line');
            
            lineEl.createDiv('rhyme-line-header').setText(`Line ${lineNum + 1}:`);
            
            const pairsList = lineEl.createDiv('rhyme-pairs-list');
            pairs.forEach(([wi1, wi2]) => {
                const word1 = this.currentAnalysis.words[wi1];
                const word2 = this.currentAnalysis.words[wi2];
                
                const pairEl = pairsList.createDiv('rhyme-pair');
                pairEl.createSpan('rhyme-word internal-rhyme').setText(word1.text);
                pairEl.createSpan('rhyme-pair-separator').setText(' ↔ ');
                pairEl.createSpan('rhyme-word internal-rhyme').setText(word2.text);
            });
        });
    }
    
    // Display detailed phonetic breakdown for each word
    renderWordBreakdown() {
        const section = this.contentEl.createDiv('rhyme-section');
        section.createEl('h3', { text: 'Phonetic Breakdown', cls: 'rhyme-section-title' });
        
        const wordsContainer = section.createDiv('rhyme-words-breakdown');
        
        this.currentAnalysis.words.forEach((word, index) => {
            const groups = this.currentAnalysis.wordToGroup[index] || [];
            if (groups.length === 0) return; // Only show words that participate in rhymes
            
            const wordEl = wordsContainer.createDiv('rhyme-word-detail');
            
            const wordText = wordEl.createDiv('rhyme-word-text');
            wordText.setText(word.text);
            
            const phonetics = wordEl.createDiv('rhyme-word-phonetics');
            phonetics.setText(`[${word.phones.join(' ')}]`);
            
            const groupInfo = wordEl.createDiv('rhyme-word-groups');
            groups.forEach(([groupId, tail, type]) => {
                const badge = groupInfo.createSpan('rhyme-group-badge');
                badge.setText(`${type} ${groupId + 1}`);
                badge.addClass(`${type}-group-${groupId % (type === 'rhyme' ? 8 : 4)}`);
                
                if (tail > 1) {
                    badge.createSpan('rhyme-tail-info').setText(`(${tail} syl)`);
                }
            });
        });
    }
}

// Main plugin class that coordinates everything
class RhymeLabPlugin extends Plugin {
    async onload() {
        // Initialize settings with sensible defaults
        this.settings = Object.assign({}, {
            perfectThreshold: 0.10,
            slantThreshold: 0.25,
            assonanceThreshold: 0.30,
            showInternalRhymes: true,
            highlightAssonance: true,
            autoAnalyzeOnType: false
        }, await this.loadData());
        
        // Initialize the analysis engine
        this.analyzer = new RhymeAnalyzer(this.settings);
        
        // Register the results view component
        this.registerView(VIEW_TYPE_RHYME_RESULTS, (leaf) => new RhymeResultsView(leaf, this));
        // Try enable CM6 decorations if bundled
        maybeEnableCM6(this);
        
        // Add ribbon icon for quick access
        this.addRibbonIcon('music', 'Analyze Rhymes', () => {
            this.analyzeCurrentNote();
        });
        
        // Register commands for various analysis functions
        this.addCommand({
            id: 'analyze-rhymes',
            name: 'Analyze rhymes in current note',
            editorCallback: (editor) => {
                const text = editor.getSelection() || editor.getValue();
                this.analyzeText(text);
            }
        });
        
        this.addCommand({
            id: 'analyze-selection',
            name: 'Analyze rhymes in selection',
            editorCallback: (editor) => {
                const selection = editor.getSelection();
                if (selection) {
                    this.analyzeText(selection);
                } else {
                    new Notice('No text selected');
                }
            }
        });
        
        this.addCommand({
            id: 'show-rhyme-results',
            name: 'Show rhyme analysis panel',
            callback: () => this.activateResultsView()
        });
        
        // Add settings tab
        this.addSettingTab(new RhymeLabSettingTab(this.app, this));
        
        console.log('Rhyme Lab Pro loaded successfully');
    }
    
    // Analyze the currently active note
    async analyzeCurrentNote() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active note found');
            return;
        }
        
        const text = activeView.editor.getValue();
        if (!text.trim()) {
            new Notice('Note is empty');
            return;
        }
        
        this.analyzeText(text);
    }
    
    // Perform rhyme analysis on provided text
    async analyzeText(text) {
        try {
            new Notice('Analyzing rhymes...', 2000);
            const analysis = await this.analyzer.analyze(text);
            await this.showResults(analysis);
            
            const message = `Analysis complete: ${analysis.metrics.uniqueRhymeGroups} rhyme groups, ` +
                          `${analysis.metrics.uniqueAssonanceGroups} assonance groups found`;
            new Notice(message, 5000);
            
        } catch (error) {
            console.error('Rhyme analysis failed:', error);
            new Notice('Analysis failed: ' + error.message);
        }
    }
    
    // Open or focus the results view panel
    async activateResultsView() {
        const { workspace } = this.app;
        let leaf = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_RHYME_RESULTS);
        
        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({ type: VIEW_TYPE_RHYME_RESULTS, active: true });
        }
        
        workspace.revealLeaf(leaf);
    }
    
    // Display analysis results in the sidebar panel
    async showResults(analysis) {
        await this.activateResultsView();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_RHYME_RESULTS);
        if (leaves.length > 0) {
            const view = leaves[0].view;
            view.setAnalysis(analysis);
        }
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
        this.analyzer = new RhymeAnalyzer(this.settings); // Recreate analyzer with new settings
    }
}

// Settings configuration panel
class RhymeLabSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Rhyme Lab Pro Settings' });
        
        // Perfect rhyme threshold setting
        new Setting(containerEl)
            .setName('Perfect rhyme threshold')
            .setDesc('Lower values require more exact phonetic matches (0.0 = identical, 1.0 = anything)')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.05)
                .setValue(this.plugin.settings.perfectThreshold)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.perfectThreshold = value;
                    await this.plugin.saveSettings();
                }));
        
        // Slant rhyme threshold setting
        new Setting(containerEl)
            .setName('Slant rhyme threshold')
            .setDesc('Threshold for near-rhymes and consonant substitutions')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.05)
                .setValue(this.plugin.settings.slantThreshold)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.slantThreshold = value;
                    await this.plugin.saveSettings();
                }));
        
        // Internal rhymes toggle
        new Setting(containerEl)
            .setName('Show internal rhymes')
            .setDesc('Detect and highlight rhymes within the same line')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showInternalRhymes)
                .onChange(async (value) => {
                    this.plugin.settings.showInternalRhymes = value;
                    await this.plugin.saveSettings();
                }));
        
        // Assonance detection toggle
        new Setting(containerEl)
            .setName('Highlight assonance')
            .setDesc('Show vowel sound repetitions and assonance patterns')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.highlightAssonance)
                .onChange(async (value) => {
                    this.plugin.settings.highlightAssonance = value;
                    await this.plugin.saveSettings();
                }));
        
        // Auto-analyze toggle
        new Setting(containerEl)
            .setName('Auto-analyze on typing')
            .setDesc('Automatically analyze text while typing (may impact performance)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoAnalyzeOnType)
                .onChange(async (value) => {
                    this.plugin.settings.autoAnalyzeOnType = value;
                    await this.plugin.saveSettings();
                }));
    }
}

module.exports = RhymeLabPlugin;