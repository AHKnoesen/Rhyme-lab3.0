# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building CM6 Decorations Extension
If implementing inline highlighting with CodeMirror 6:
```bash
# Initialize npm if not already done
npm init -y
npm i -D esbuild @codemirror/view @codemirror/state

# Build the CM6 extension
npx esbuild cm6-decorations.ts --bundle --format=iife --global-name=RhymeLabCM6 --outfile=cm6-decorations.js
```

### Plugin Installation
1. Copy folder to `<vault>/.obsidian/plugins/rhyme-lab-pro/`
2. Enable in Obsidian Settings → Community plugins
3. Use Command palette → "Rhyme Lab: Analyze Current Note"

## Architecture Overview

This is an Obsidian plugin for advanced phonetic rhyme analysis. The codebase consists of three main JavaScript builds:

### Core Components
- **main.js**: Primary engine with CM6-safe panel view. Contains the RhymeAnalyzer class implementing phonetic analysis algorithms, and RhymeResultsView for displaying results
- **main-simple.js**: Simplified panel-only version without inline highlighting
- **rhyme-lab-main.js**: Legacy version with guarded inline highlighting (won't crash on CM6)
- **cm6-decorations.ts**: TypeScript module for proper CM6 decoration extension (requires bundling)

### Key Classes and Systems

**RhymeAnalyzer**: Core phonetic analysis engine
- Implements grapheme-to-phoneme conversion using ARPA phonetic notation
- Handles syllabification, stress patterns, and rhyme scoring
- Supports perfect rhymes, slant rhymes, assonance, and consonance detection
- Custom phonetic dictionary for modern slang and contractions

**RhymeResultsView**: Obsidian ItemView for displaying analysis results
- Renders rhyme patterns with color-coded categories
- Shows rhyme statistics and grouped results
- Handles theme-aware styling

**Phonetic Data Structures**:
- ARPA_VOWELS: Set of vowel phonemes for syllable detection
- VOWEL_CLASSES: Groups similar vowels for assonance detection
- CONSONANT_PAIRS: Defines substitutable consonants for slant rhymes
- CUSTOM_ARPA: Dictionary for contemporary language not in traditional phonetic databases

### Rhyme Detection Algorithm
The plugin uses multi-layer phonetic analysis:
1. Word normalization and tokenization
2. Grapheme-to-phoneme conversion (G2P)
3. Syllabification and stress pattern extraction
4. Multi-criteria rhyme scoring based on:
   - Phonetic similarity (shared phonemes)
   - Stress pattern alignment
   - Vowel class matching (assonance)
   - Consonant equivalence (slant rhymes)

### Integration Points
- Hooks into Obsidian's editor through Plugin API
- Optional CM6 decoration extension via `maybeEnableCM6()`
- Settings management through PluginSettingTab
- Command registration for user interaction

## File Structure
- `manifest.json`: Plugin metadata (id: "rhyme-lab-pro", minAppVersion: "0.15.0")
- `styles.css`: Theme-friendly styling without invalid HSL math
- Main implementations share core RhymeAnalyzer but differ in visualization approach

## Advanced Hip-Hop Rhyme Analysis

### Hip-Hop Enhancement Features
- **Internal Rhymes**: Rakim-style mid-line rhyming patterns
- **Compound Rhymes**: Eminem-style multi-word phrase rhyming
- **Multisyllabic Chains**: Big Pun-style extended syllable matching
- **Mosaic Rhymes**: Advanced Eminem technique - single words rhyming with phrases
- **Flow Pattern Analysis**: Tempo, syllable density, and style classification
- **Artist Profiling**: Complexity scoring and similarity detection

### Phonetic Analysis Patterns

#### ARPA Notation Implementation
- **Vowel Classification System**: Groups similar vowels for assonance detection
- **Consonant Pair Equivalence**: Defines substitutable consonants for slant rhymes
- **Custom Phonetic Dictionary**: Modern slang, contractions, regional variations
- **STOP_WORDS Filtering**: Excludes ubiquitous words to focus on meaningful rhymes

#### Multi-Layer Processing Pipeline
1. **Input Sanitization**: Length limits, type checking, ReDoS prevention
2. **Grapheme-to-Phoneme Conversion**: Pattern-based G2P with fallbacks
3. **Syllabification**: ARPA vowel detection for syllable boundaries
4. **Stress Pattern Analysis**: Primary/secondary stress identification
5. **Multi-Criteria Scoring**: Phonetic similarity + stress alignment + vowel classes

### Security and Performance Considerations
- **Input Validation**: `cleanWord()` method prevents ReDoS with length limits
- **Graceful Fallback**: Hip-hop enhancements optional, core functionality preserved
- **Error Boundaries**: Try/catch blocks prevent feature failures from crashing plugin
- **Performance Limits**: Analysis scope limitation for large texts

### Integration Architecture
- **Multiple Build Strategy**: Core (main.js), Simple (main-simple.js), Hip-Hop (main-hiphop.js)
- **Optional Enhancement Loading**: Hip-hop features loaded conditionally with graceful fallback
- **Settings-Driven Features**: `enableHipHopFeatures` toggle for backward compatibility
- **CM6 Decoration Support**: TypeScript extension for proper CodeMirror 6 integration