/* Hip-Hop Rhyme Enhancement Module
 * Advanced rhyme detection techniques for hip-hop analysis
 * Inspired by techniques from Eminem, Biggie, Tupac, Rakim, MF DOOM, Tech N9ne, and Snoop
 */

// Extended hip-hop specific phonetic dictionary
const HIPHOP_CUSTOM_ARPA = {
    // Eminem-style compound words
    "orange": ["AO1", "R", "IH0", "N", "JH"],
    "doorhinge": ["D", "AO1", "R", "HH", "IH0", "N", "JH"],
    "fourinch": ["F", "AO1", "R", "IH0", "N", "CH"],
    "syringe": ["S", "ER0", "IH1", "N", "JH"],
    
    // Common hip-hop contractions and slang
    "nigga": ["N", "IH1", "G", "AH0"],
    "niggas": ["N", "IH1", "G", "AH0", "Z"],
    "playa": ["P", "L", "EY1", "AH0"],
    "gangsta": ["G", "AE1", "NG", "S", "T", "AH0"],
    "hustla": ["HH", "AH1", "S", "L", "AH0"],
    "baller": ["B", "AO1", "L", "ER0"],
    "realest": ["R", "IY1", "L", "IH0", "S", "T"],
    "illest": ["IH1", "L", "IH0", "S", "T"],
    "dopest": ["D", "OW1", "P", "IH0", "S", "T"],
    
    // MF DOOM style vocabulary
    "villain": ["V", "IH1", "L", "AH0", "N"],
    "chillin": ["CH", "IH1", "L", "IH0", "N"],
    "illin": ["IH1", "L", "IH0", "N"],
    "spillin": ["S", "P", "IH1", "L", "IH0", "N"],
    
    // Tech N9ne chopper style
    "choppa": ["CH", "AA1", "P", "AH0"],
    "poppa": ["P", "AA1", "P", "AH0"],
    "stoppa": ["S", "T", "AA1", "P", "AH0"],
    
    // West Coast / Snoop style
    "foshizzle": ["F", "AO1", "SH", "IH1", "Z", "AH0", "L"],
    "nizzle": ["N", "IH1", "Z", "AH0", "L"],
    "dizzle": ["D", "IH1", "Z", "AH0", "L"],
    "bizzle": ["B", "IH1", "Z", "AH0", "L"],
    
    // Rakim flow vocabulary
    "microphone": ["M", "AY1", "K", "R", "AH0", "F", "OW2", "N"],
    "cyclone": ["S", "AY1", "K", "L", "OW2", "N"],
    "milestone": ["M", "AY1", "L", "S", "T", "OW2", "N"],
    
    // Common hip-hop expressions
    "whatup": ["W", "AH1", "T", "AH0", "P"],
    "holup": ["HH", "OW1", "L", "AH0", "P"],
    
    // Mosaic rhyme examples for better detection
    "hinge": ["HH", "IH1", "N", "JH"],
    "door": ["D", "AO1", "R"],
    "four": ["F", "AO1", "R"],
    "more": ["M", "AO1", "R"],
    "store": ["S", "T", "AO1", "R"],
    "turnt": ["T", "ER1", "N", "T"],
    "crunk": ["K", "R", "AH1", "NG", "K"],
    "trill": ["T", "R", "IH1", "L"],
    "swag": ["S", "W", "AE1", "G"],
    "dope": ["D", "OW1", "P"],
    "whack": ["W", "AE1", "K"],
    "phat": ["F", "AE1", "T"],
    "lit": ["L", "IH1", "T"],
    "fire": ["F", "AY1", "ER0"],
    "bars": ["B", "AA1", "R", "Z"],
    "spittin": ["S", "P", "IH1", "T", "IH0", "N"],
    "flowin": ["F", "L", "OW1", "IH0", "N"],
    "ballin": ["B", "AO1", "L", "IH0", "N"],
    "stackin": ["S", "T", "AE1", "K", "IH0", "N"],
    "grindin": ["G", "R", "AY1", "N", "D", "IH0", "N"]
};

// Hip-hop specific rhyme patterns
class HipHopRhymeAnalyzer {
    constructor(baseAnalyzer) {
        this.baseAnalyzer = baseAnalyzer;
    }
    
    // Detect internal rhymes within a single line (Rakim technique)
    detectInternalRhymes(line) {
        const words = line.split(/\s+/).filter(w => w.length > 2);
        const internalRhymes = [];
        
        for (let i = 0; i < words.length - 1; i++) {
            for (let j = i + 1; j < words.length; j++) {
                const phones1 = this.baseAnalyzer.wordToPhones(words[i]);
                const phones2 = this.baseAnalyzer.wordToPhones(words[j]);
                
                if (this.checkPhoneticSimilarity(phones1, phones2) > 0.7) {
                    internalRhymes.push({
                        word1: words[i],
                        word2: words[j],
                        position1: i,
                        position2: j,
                        type: 'internal'
                    });
                }
            }
        }
        
        return internalRhymes;
    }
    
    // Detect compound/mosaic rhymes (Eminem technique)
    detectCompoundRhymes(text) {
        const lines = text.split('\n');
        const compoundRhymes = [];
        
        for (let i = 0; i < lines.length; i++) {
            const words = lines[i].split(/\s+/);
            
            // Look for multi-word combinations that rhyme
            for (let j = 0; j < words.length - 1; j++) {
                const compound = words[j] + words[j + 1];
                const compoundPhones = this.baseAnalyzer.wordToPhones(compound);
                
                // Check against single words and other compounds
                for (let k = i; k < Math.min(i + 4, lines.length); k++) {
                    const targetWords = lines[k].split(/\s+/);
                    
                    for (const target of targetWords) {
                        const targetPhones = this.baseAnalyzer.wordToPhones(target);
                        
                        if (this.checkPhoneticSimilarity(compoundPhones, targetPhones) > 0.8) {
                            compoundRhymes.push({
                                compound: `${words[j]} ${words[j + 1]}`,
                                target: target,
                                line1: i,
                                line2: k,
                                type: 'compound'
                            });
                        }
                    }
                }
            }
        }
        
        return compoundRhymes;
    }
    
    // Detect multisyllabic rhyme chains (Big L, Big Pun technique)
    detectMultisyllabicChains(text) {
        const lines = text.split('\n');
        const chains = [];
        
        for (let i = 0; i < lines.length - 1; i++) {
            const line1Words = lines[i].split(/\s+/);
            const line2Words = lines[i + 1].split(/\s+/);
            
            // Look for sequences of 3+ syllables that rhyme
            for (let j = 0; j <= line1Words.length - 3; j++) {
                const phrase1 = line1Words.slice(j, j + 3).join(' ');
                const phones1 = this.getPhrasePhonemesFlat(phrase1);
                
                for (let k = 0; k <= line2Words.length - 3; k++) {
                    const phrase2 = line2Words.slice(k, k + 3).join(' ');
                    const phones2 = this.getPhrasePhonemesFlat(phrase2);
                    
                    const similarity = this.checkMultisyllabicSimilarity(phones1, phones2);
                    
                    if (similarity > 0.7) {
                        chains.push({
                            phrase1,
                            phrase2,
                            line1: i,
                            line2: i + 1,
                            similarity,
                            syllableCount: Math.min(
                                this.countSyllables(phones1),
                                this.countSyllables(phones2)
                            ),
                            type: 'multisyllabic'
                        });
                    }
                }
            }
        }
        
        return chains;
    }
    
    // Detect flow patterns and cadence (Tech N9ne chopper style)
    analyzeFlowPattern(text) {
        const lines = text.split('\n');
        const patterns = [];
        
        for (const line of lines) {
            const words = line.split(/\s+/);
            const stressPattern = [];
            let syllableCount = 0;
            
            for (const word of words) {
                const phones = this.baseAnalyzer.wordToPhones(word);
                const [syllables, stressIndex] = this.baseAnalyzer.syllabify(phones);
                
                syllableCount += syllables.length;
                
                // Build stress pattern (1 = stressed, 0 = unstressed)
                for (let i = 0; i < syllables.length; i++) {
                    stressPattern.push(i === stressIndex ? 1 : 0);
                }
            }
            
            patterns.push({
                line,
                syllableCount,
                stressPattern,
                tempo: this.estimateTempo(stressPattern),
                style: this.classifyFlowStyle(stressPattern)
            });
        }
        
        return patterns;
    }
    
    // Helper: Get flat phoneme array for phrase
    getPhrasePhonemesFlat(phrase) {
        const words = phrase.split(/\s+/);
        const allPhones = [];
        
        for (const word of words) {
            const phones = this.baseAnalyzer.wordToPhones(word);
            allPhones.push(...phones);
        }
        
        return allPhones;
    }
    
    // Helper: Check phonetic similarity between two phoneme arrays
    checkPhoneticSimilarity(phones1, phones2) {
        if (!phones1.length || !phones2.length) return 0;
        
        const [syll1, stress1] = this.baseAnalyzer.syllabify(phones1);
        const [syll2, stress2] = this.baseAnalyzer.syllabify(phones2);
        
        const key1 = this.baseAnalyzer.getRhymeKey(syll1, stress1);
        const key2 = this.baseAnalyzer.getRhymeKey(syll2, stress2);
        
        if (!key1 || !key2) return 0;
        
        // Calculate similarity based on nucleus and coda matching
        let similarity = 0;
        
        // Exact nucleus match
        if (key1.nucleus === key2.nucleus) {
            similarity += 0.5;
        } else if (key1.vowelFamily === key2.vowelFamily) {
            similarity += 0.3;
        }
        
        // Coda similarity
        const codaSim = this.calculateCodaSimilarity(key1.coda, key2.coda);
        similarity += codaSim * 0.5;
        
        return similarity;
    }
    
    // Helper: Check multisyllabic similarity
    checkMultisyllabicSimilarity(phones1, phones2) {
        const minLen = Math.min(phones1.length, phones2.length);
        if (minLen < 3) return 0;
        
        let matches = 0;
        const checkLen = Math.min(minLen, 8); // Check up to 8 phonemes
        
        // Check from the end (where rhymes typically occur)
        for (let i = 1; i <= checkLen; i++) {
            const p1 = this.baseAnalyzer.normalizePhone(phones1[phones1.length - i] || '');
            const p2 = this.baseAnalyzer.normalizePhone(phones2[phones2.length - i] || '');
            
            if (p1 === p2) {
                matches++;
            } else if (this.arePhonemesSimilar(p1, p2)) {
                matches += 0.5;
            }
        }
        
        return matches / checkLen;
    }
    
    // Helper: Calculate coda similarity
    calculateCodaSimilarity(coda1, coda2) {
        if (!coda1.length && !coda2.length) return 1;
        if (!coda1.length || !coda2.length) return 0.3;
        
        const norm1 = this.baseAnalyzer.normalizeCoda(coda1);
        const norm2 = this.baseAnalyzer.normalizeCoda(coda2);
        
        if (JSON.stringify(norm1) === JSON.stringify(norm2)) return 1;
        
        // Check for partial matches
        let matches = 0;
        const minLen = Math.min(norm1.length, norm2.length);
        
        for (let i = 0; i < minLen; i++) {
            if (norm1[i] === norm2[i]) {
                matches++;
            } else if (this.areConsonantsSimilar(norm1[i], norm2[i])) {
                matches += 0.5;
            }
        }
        
        return matches / Math.max(norm1.length, norm2.length);
    }
    
    // Helper: Check if two phonemes are similar
    arePhonemesSimilar(p1, p2) {
        // Check vowel similarity
        const vowelClasses = {
            'IY': ['IH', 'EH'],
            'IH': ['IY', 'EH'],
            'EH': ['IH', 'AE'],
            'AE': ['EH', 'AA'],
            'AA': ['AE', 'AH'],
            'AH': ['AA', 'UH'],
            'UH': ['AH', 'UW'],
            'UW': ['UH', 'OW'],
            'OW': ['UW', 'AO'],
            'AO': ['OW', 'AA']
        };
        
        if (vowelClasses[p1] && vowelClasses[p1].includes(p2)) return true;
        if (vowelClasses[p2] && vowelClasses[p2].includes(p1)) return true;
        
        return this.areConsonantsSimilar(p1, p2);
    }
    
    // Helper: Check if two consonants are similar
    areConsonantsSimilar(c1, c2) {
        const similarPairs = [
            ['P', 'B'], ['T', 'D'], ['K', 'G'],
            ['F', 'V'], ['S', 'Z'], ['SH', 'ZH'],
            ['CH', 'JH'], ['TH', 'DH'],
            ['M', 'N'], ['N', 'NG'],
            ['L', 'R'], ['W', 'Y']
        ];
        
        for (const [a, b] of similarPairs) {
            if ((c1 === a && c2 === b) || (c1 === b && c2 === a)) {
                return true;
            }
        }
        
        return false;
    }
    
    // Helper: Count syllables in phoneme array
    countSyllables(phones) {
        return phones.filter(p => {
            const base = this.baseAnalyzer.normalizePhone(p);
            return this.baseAnalyzer.constructor.ARPA_VOWELS.has(base);
        }).length;
    }
    
    // Helper: Estimate tempo from stress pattern
    estimateTempo(stressPattern) {
        if (stressPattern.length < 4) return 'slow';
        
        const stressRatio = stressPattern.filter(s => s === 1).length / stressPattern.length;
        
        if (stressRatio > 0.6) return 'rapid'; // Tech N9ne chopper style
        if (stressRatio > 0.4) return 'medium'; // Normal flow
        return 'laid-back'; // Snoop style
    }
    
    // Helper: Classify flow style based on stress pattern
    classifyFlowStyle(stressPattern) {
        const patternStr = stressPattern.join('');
        
        // Common hip-hop flow patterns
        if (patternStr.includes('1010')) return 'bounce'; // Classic hip-hop bounce
        if (patternStr.includes('1001')) return 'triplet'; // Migos-style triplet flow
        if (patternStr.includes('111')) return 'chopper'; // Tech N9ne rapid-fire
        if (patternStr.includes('10001000')) return 'laid-back'; // Snoop/West Coast
        if (patternStr.includes('110110')) return 'syncopated'; // Jazz-influenced
        
        // Count consecutive stresses
        let maxConsecutive = 0;
        let current = 0;
        
        for (const stress of stressPattern) {
            if (stress === 1) {
                current++;
                maxConsecutive = Math.max(maxConsecutive, current);
            } else {
                current = 0;
            }
        }
        
        if (maxConsecutive >= 3) return 'aggressive'; // Eminem angry style
        if (maxConsecutive === 0) return 'conversational'; // Biggie storytelling
        
        return 'standard';
    }
    
    // Generate artist style profile based on analysis
    generateArtistProfile(text) {
        const internalRhymes = this.detectInternalRhymes(text);
        const compoundRhymes = this.detectCompoundRhymes(text);
        const multisyllabicChains = this.detectMultisyllabicChains(text);
        const flowPatterns = this.analyzeFlowPattern(text);
        
        const profile = {
            internalRhymeDensity: internalRhymes.length / text.split('\n').length,
            compoundRhymeCount: compoundRhymes.length,
            avgMultisyllabicLength: multisyllabicChains.length ? 
                multisyllabicChains.reduce((sum, c) => sum + c.syllableCount, 0) / multisyllabicChains.length : 0,
            dominantFlowStyle: this.getMostCommonFlowStyle(flowPatterns),
            complexity: this.calculateComplexityScore(internalRhymes, compoundRhymes, multisyllabicChains),
            similarArtists: this.matchArtistStyle(internalRhymes, compoundRhymes, flowPatterns)
        };
        
        return profile;
    }
    
    // Helper: Get most common flow style
    getMostCommonFlowStyle(patterns) {
        const styleCounts = {};
        
        for (const pattern of patterns) {
            styleCounts[pattern.style] = (styleCounts[pattern.style] || 0) + 1;
        }
        
        let maxCount = 0;
        let dominantStyle = 'standard';
        
        for (const [style, count] of Object.entries(styleCounts)) {
            if (count > maxCount) {
                maxCount = count;
                dominantStyle = style;
            }
        }
        
        return dominantStyle;
    }
    
    // Helper: Calculate complexity score
    calculateComplexityScore(internal, compound, multisyllabic) {
        let score = 0;
        
        score += internal.length * 2; // Internal rhymes add complexity
        score += compound.length * 3; // Compound rhymes are more complex
        score += multisyllabic.reduce((sum, c) => sum + c.syllableCount, 0); // Longer chains = higher complexity
        
        // Normalize to 0-100 scale
        return Math.min(100, score * 2);
    }
    
    // Helper: Match to known artist styles
    matchArtistStyle(internal, compound, flowPatterns) {
        const artists = [];
        
        // High internal rhyme density = Rakim, MF DOOM
        if (internal.length > 10) {
            artists.push('Rakim', 'MF DOOM');
        }
        
        // Many compound rhymes = Eminem
        if (compound.length > 5) {
            artists.push('Eminem');
        }
        
        // Check flow styles
        const styles = flowPatterns.map(p => p.style);
        
        if (styles.includes('chopper')) {
            artists.push('Tech N9ne', 'Twista');
        }
        
        if (styles.includes('laid-back')) {
            artists.push('Snoop Dogg', 'Warren G');
        }
        
        if (styles.includes('aggressive')) {
            artists.push('Eminem', 'DMX');
        }
        
        if (styles.includes('conversational')) {
            artists.push('Biggie', 'Jay-Z');
        }
        
        // Remove duplicates
        return [...new Set(artists)];
    }
    
    // Detect mosaic rhymes (multi-word phrases that rhyme - Eminem signature technique)
    // Examples: "orange" / "door hinge", "microphone check" / "might have gone wreck"
    detectMosaicRhymes(text) {
        const lines = text.split('\n');
        const MAX_LINES = 100; // Performance guard
        
        if (lines.length > MAX_LINES) {
            console.warn(`Mosaic rhyme analysis limited to first ${MAX_LINES} lines for performance`);
            lines.splice(MAX_LINES);
        }
        
        const mosaicRhymes = [];
        const phoneticCache = new Map(); // Cache phonetic conversions
        
        // Pre-compute phonetics for all words to avoid redundant calculations
        const lineData = lines.map(line => {
            const words = line.split(/\s+/).filter(w => w.length > 0);
            return words.map(word => {
                const key = word.toLowerCase().replace(/[^a-z']/g, '');
                if (key.length === 0) return null;
                
                if (!phoneticCache.has(key)) {
                    phoneticCache.set(key, this.baseAnalyzer.wordToPhones(key));
                }
                return { word, key, phonetics: phoneticCache.get(key) };
            }).filter(w => w !== null);
        });
        
        // Reduced search radius to prevent O(n³) explosion
        const SEARCH_RADIUS = 3;
        
        for (let i = 0; i < lineData.length; i++) {
            // Limit to high-value single words (longer words more likely to have mosaic matches)
            const significantWords = lineData[i].filter(w => w.word.length >= 4);
            
            for (const wordData of significantWords) {
                const searchStart = Math.max(0, i - SEARCH_RADIUS);
                const searchEnd = Math.min(i + SEARCH_RADIUS, lineData.length - 1);
                
                for (let k = searchStart; k <= searchEnd; k++) {
                    if (k === i) continue;
                    
                    // Check only 2-word combinations to reduce complexity
                    for (let l = 0; l < lineData[k].length - 1; l++) {
                        const phrase = `${lineData[k][l].word} ${lineData[k][l + 1].word}`;
                        const combinedPhonetics = [...lineData[k][l].phonetics, ...lineData[k][l + 1].phonetics];
                        
                        const mosaicMatch = this.analyzeMosaicRhymeOptimized(
                            wordData.phonetics, 
                            combinedPhonetics
                        );
                        
                        if (mosaicMatch && mosaicMatch.similarity > 0.5) {
                            mosaicRhymes.push({
                                singleWord: wordData.word,
                                phrase: phrase,
                                line1: i,
                                line2: k,
                                similarity: mosaicMatch.similarity,
                                type: 'single-to-phrase'
                            });
                        }
                    }
                }
            }
            
            // Limited phrase-to-phrase analysis for performance
            if (lineData[i].length >= 2) {
                const phrase1 = `${lineData[i][0].word} ${lineData[i][1].word}`;
                const phrase1Phonetics = [...lineData[i][0].phonetics, ...lineData[i][1].phonetics];
                
                for (let k = i + 1; k < Math.min(i + 2, lineData.length); k++) {
                    if (lineData[k].length >= 2) {
                        const phrase2 = `${lineData[k][0].word} ${lineData[k][1].word}`;
                        const phrase2Phonetics = [...lineData[k][0].phonetics, ...lineData[k][1].phonetics];
                        
                        const mosaicMatch = this.analyzeMosaicRhymeOptimized(phrase1Phonetics, phrase2Phonetics);
                        
                        if (mosaicMatch && mosaicMatch.similarity > 0.6) {
                            mosaicRhymes.push({
                                phrase1: phrase1,
                                phrase2: phrase2,
                                line1: i,
                                line2: k,
                                similarity: mosaicMatch.similarity,
                                type: 'phrase-to-phrase'
                            });
                        }
                    }
                }
            }
        }
        
        return mosaicRhymes.slice(0, 20); // Limit results to prevent UI overload
    }
    
    // Analyze potential mosaic rhyme between a word/phrase and another word/phrase
    analyzeMosaicRhyme(item1, item2) {
        // Get phonetic sequences for both items
        const phonemes1 = this.getPhrasePhonemes(item1);
        const phonemes2 = this.getPhrasePhonemes(item2);
        
        if (phonemes1.length === 0 || phonemes2.length === 0) {
            return null;
        }
        
        // Compare phonetic sequences from the end (where rhymes typically occur)
        const commonSuffix = this.findCommonPhoneticSuffix(phonemes1, phonemes2);
        
        // Calculate similarity score based on common suffix length and total length
        const minLength = Math.min(phonemes1.length, phonemes2.length);
        const similarity = commonSuffix.length / minLength;
        
        // Mosaic rhyme threshold - needs significant phonetic overlap
        if (similarity >= 0.4 && commonSuffix.length >= 2) {
            return {
                similarity: similarity,
                commonPhonemes: commonSuffix,
                matchedLength: commonSuffix.length
            };
        }
        
        return null;
    }
    
    // Get phonetic sequence for a word or phrase
    getPhrasePhonemes(phrase) {
        const words = phrase.toLowerCase().split(/\s+/);
        const allPhonemes = [];
        
        for (const word of words) {
            const cleanWord = word.replace(/[^a-z']/g, '');
            if (cleanWord.length > 0) {
                const phonemes = this.baseAnalyzer.wordToPhones(cleanWord);
                allPhonemes.push(...phonemes);
            }
        }
        
        return allPhonemes;
    }
    
    // Find common phonetic suffix between two phoneme arrays
    findCommonPhoneticSuffix(phonemes1, phonemes2) {
        const commonSuffix = [];
        const minLength = Math.min(phonemes1.length, phonemes2.length);
        
        for (let i = 1; i <= minLength; i++) {
            const phone1 = this.baseAnalyzer.normalizePhone(phonemes1[phonemes1.length - i]);
            const phone2 = this.baseAnalyzer.normalizePhone(phonemes2[phonemes2.length - i]);
            
            if (phone1 === phone2) {
                commonSuffix.unshift(phone1);
            } else if (this.arePhonemesSimilar(phone1, phone2)) {
                // Allow for slight phonetic variations in mosaic rhymes
                commonSuffix.unshift(phone1);
            } else {
                break;
            }
        }
        
        return commonSuffix;
    }
    
    // Optimized mosaic rhyme analysis for performance
    analyzeMosaicRhymeOptimized(phonemes1, phonemes2) {
        if (phonemes1.length === 0 || phonemes2.length === 0) return null;
        
        const minLength = Math.min(phonemes1.length, phonemes2.length);
        if (minLength < 2) return null;
        
        // Fast suffix comparison using normalized phonemes
        let matchCount = 0;
        const checkLength = Math.min(minLength, 6); // Limit comparison length for performance
        
        for (let i = 1; i <= checkLength; i++) {
            const p1 = this.baseAnalyzer.normalizePhone(phonemes1[phonemes1.length - i] || '');
            const p2 = this.baseAnalyzer.normalizePhone(phonemes2[phonemes2.length - i] || '');
            
            if (p1 === p2) {
                matchCount++;
            } else if (this.arePhonemesSimilar(p1, p2)) {
                matchCount += 0.5; // Partial credit for similar phonemes
            } else {
                break; // Stop at first significant mismatch for performance
            }
        }
        
        const similarity = matchCount / checkLength;
        
        if (similarity >= 0.4 && matchCount >= 2) {
            return { 
                similarity: similarity, 
                matchedLength: matchCount 
            };
        }
        
        return null;
    }
}

// Export for use in main plugin
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HipHopRhymeAnalyzer, HIPHOP_CUSTOM_ARPA };
}