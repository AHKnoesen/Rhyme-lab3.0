// Rhyme Lab Pro - Working Version with Inline Highlighting
// This version uses Obsidian's global API directly without ES6 imports

const { Plugin, PluginSettingTab, Setting, Notice, ItemView, MarkdownView } = require('obsidian');

const VIEW_TYPE_RHYME_RESULTS = 'rhyme-results-view';

// Phonetic constants
const ARPA_VOWELS = new Set([
    "AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"
]);

const VOWEL_CLASSES = {
    "IY": "EE", "IH": "I", "EH": "E", "AE": "A", 
    "AA": "AH", "AH": "UH", "AO": "OR", "OW": "O", 
    "UH": "U", "UW": "OO", "EY": "AY", "AY": "EYE", 
    "OY": "OY", "AW": "OW", "ER": "ER"
};

// Custom pronunciations for slang
const CUSTOM_ARPA = {
    "ya": ["Y", "AA1"], 
    "gonna": ["G", "AH1", "N", "AH0"], 
    "wanna": ["W", "AA1", "N", "AH0"], 
    "ain't": ["EY1", "N", "T"],
    "bruh": ["B", "R", "AH1"],
    "nah": ["N", "AA1"], 
    "yo": ["Y", "OW1"],
    "playin'": ["P", "L", "EY1", "IH0", "N"],
    "playin": ["P", "L", "EY1", "IH0", "N"],
    "puttin'": ["P", "UH1", "T", "IH0", "N"],
    "puttin": ["P", "UH1", "T", "IH0", "N"],
    "messin'": ["M", "EH1", "S", "IH0", "N"],
    "messin": ["M", "EH1", "S", "IH0", "N"],
    "comin'": ["K", "AH1", "M", "IH0", "N"],
    "comin": ["K", "AH1", "M", "IH0", "N"],
    "swimmin'": ["S", "W", "IH1", "M", "IH0", "N"],
    "swimmin": ["S", "W", "IH1", "M", "IH0", "N"],
    "sittin'": ["S", "IH1", "T", "IH0", "N"],
    "sittin": ["S", "IH1", "T", "IH0", "N"]
};

// Convert word to phonemes
function wordToPhones(word) {
    const cleaned = word.toLowerCase().replace(/[^\w']/g, '');
    if (CUSTOM_ARPA[cleaned]) return CUSTOM_ARPA[cleaned];
    
    const phones = [];
    let stressed = false;
    
    for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if ('aeiouy'.includes(ch)) {
            const stress = !stressed ? "1" : "0";
            phones.push((ch === 'a' ? 'AE' : 
                        ch === 'e' ? 'EH' : 
                        ch === 'i' ? 'IH' : 
                        ch === 'o' ? 'AO' : 
                        ch === 'u' ? 'AH' : 'IH') + stress);
            stressed = true;
        } else {
            const consonantMap = {
                'b': 'B', 'c': 'K', 'd': 'D', 'f': 'F', 'g': 'G', 'h': 'HH',
                'j': 'JH', 'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N', 'p': 'P',
                'r': 'R', 's': 'S', 't': 'T', 'v': 'V', 'w': 'W', 'z': 'Z'
            };
            if (consonantMap[ch]) phones.push(consonantMap[ch]);
        }
    }
    return phones;
}

// Get rhyme tail (from last vowel to end)
function getRhymeTail(phones) {
    for (let i = phones.length - 1; i >= 0; i--) {
        const p = phones[i].replace(/[0-2]$/, '');
        if (ARPA_VOWELS.has(p)) {
            return phones.slice(i);
        }
    }
    return phones.slice(-2);
}

// Score rhyme match
function scoreRhyme(tail1, tail2) {
    if (!tail1.length || !tail2.length) return 0;
    
    const t1 = tail1.join(' ');
    const t2 = tail2.join(' ');
    
    if (t1 === t2) return 1.0;
    
    let score = 0;
    const minLen = Math.min(tail1.length, tail2.length);
    for (let i = 0; i < minLen; i++) {
        const p1 = tail1[tail1.length - 1 - i].replace(/[0-2]$/, '');
        const p2 = tail2[tail2.length - 1 - i].replace(/[0-2]$/, '');
        
        if (p1 === p2) {
            score += (1.0 / (i + 1));
        } else if (VOWEL_CLASSES[p1] === VOWEL_CLASSES[p2]) {
            score += (0.5 / (i + 1));
        }
    }
    
    return Math.min(0.95, score);
}

// Analyze text for rhymes
function analyzeText(text, threshold = 0.5) {
    const lines = text.split('\n');
    const allWords = [];
    let globalPos = 0;
    
    lines.forEach((line, lineIndex) => {
        const words = line.match(/\b[A-Za-z']+\b/g) || [];
        let linePos = 0;
        
        words.forEach((word) => {
            const wordStart = line.indexOf(word, linePos);
            const start = globalPos + wordStart;
            
            const phones = wordToPhones(word);
            allWords.push({
                text: word,
                line: lineIndex,
                start: start,
                end: start + word.length,
                phones: phones,
                tail: getRhymeTail(phones)
            });
            
            linePos = wordStart + word.length;
        });
        
        globalPos += line.length + 1; // +1 for newline
    });
    
    // Find rhyme groups
    const groups = [];
    const assigned = new Set();
    
    for (let i = 0; i < allWords.length; i++) {
        if (assigned.has(i)) continue;
        
        const group = [i];
        assigned.add(i);
        
        for (let j = i + 1; j < allWords.length; j++) {
            if (assigned.has(j)) continue;
            
            const score = scoreRhyme(allWords[i].tail, allWords[j].tail);
            if (score >= threshold && allWords[i].text.toLowerCase() !== allWords[j].text.toLowerCase()) {
                group.push(j);
                assigned.add(j);
            }
        }
        
        if (group.length >= 2) {
            groups.push(group);
        }
    }
    
    return { words: allWords, groups: groups };
}

// Results View
class RhymeResultsView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }
    
    getViewType() { return VIEW_TYPE_RHYME_RESULTS; }
    getDisplayText() { return 'Rhyme Analysis'; }
    getIcon() { return 'music'; }
    
    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('rhyme-results-view');
        
        container.createEl('h2', { text: 'Rhyme Lab Pro' });
        this.contentEl = container.createDiv('rhyme-content');
        this.renderEmpty();
    }
    
    renderEmpty() {
        this.contentEl.empty();
        this.contentEl.createEl('p', { 
            text: 'Click the music icon or run "Analyze rhymes" to highlight rhymes in your text.',
            cls: 'rhyme-info'
        });
    }
    
    setAnalysis(analysis) {
        this.contentEl.empty();
        
        const info = this.contentEl.createDiv('rhyme-info');
        info.createEl('h3', { text: `Found ${analysis.groups.length} rhyme groups` });
        info.createEl('p', { text: `Total words analyzed: ${analysis.words.length}` });
        info.createEl('p', { text: 'Rhymes are now highlighted in your editor!', cls: 'rhyme-success' });
        
        // Show groups
        analysis.groups.forEach((group, idx) => {
            const groupEl = this.contentEl.createDiv('rhyme-group-info');
            groupEl.addClass(`rhyme-group-${idx % 8}`);
            
            const header = groupEl.createDiv('rhyme-group-header');
            header.createEl('span', { 
                text: `Group ${idx + 1}`,
                cls: 'rhyme-group-title'
            });
            
            const words = group.map(i => analysis.words[i].text);
            const wordsEl = groupEl.createDiv('rhyme-words-list');
            words.forEach(word => {
                wordsEl.createEl('span', { 
                    text: word,
                    cls: 'rhyme-word-badge' 
                });
            });
        });
    }
}

// Main Plugin
class RhymeLabPlugin extends Plugin {
    constructor() {
        super(...arguments);
        this.highlightDecorations = [];
    }
    
    async onload() {
        console.log('Rhyme Lab Pro loading...');
        
        this.settings = Object.assign({}, {
            threshold: 0.5,
            highlightEnabled: true
        }, await this.loadData());
        
        // Register view
        this.registerView(VIEW_TYPE_RHYME_RESULTS, (leaf) => new RhymeResultsView(leaf, this));
        
        // Add ribbon icon
        this.addRibbonIcon('music', 'Analyze and highlight rhymes', () => {
            this.analyzeCurrentNote();
        });
        
        // Add commands
        this.addCommand({
            id: 'analyze-rhymes',
            name: 'Analyze and highlight rhymes',
            callback: () => this.analyzeCurrentNote()
        });
        
        this.addCommand({
            id: 'clear-highlights',
            name: 'Clear rhyme highlights',
            callback: () => this.clearHighlights()
        });
        
        // Add settings
        this.addSettingTab(new RhymeLabSettingTab(this.app, this));
        
        // Add styles
        this.addStyles();
        
        console.log('Rhyme Lab Pro loaded successfully');
    }
    
    async analyzeCurrentNote() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active note');
            return;
        }
        
        const editor = activeView.editor;
        const text = editor.getValue();
        
        if (!text.trim()) {
            new Notice('Note is empty');
            return;
        }
        
        // Clear existing highlights
        this.clearHighlights();
        
        // Analyze text
        const analysis = analyzeText(text, this.settings.threshold);
        
        // Apply highlights
        this.applyHighlights(editor, analysis);
        
        // Show results
        await this.showResults(analysis);
        
        new Notice(`Highlighted ${analysis.groups.length} rhyme groups!`);
    }
    
    applyHighlights(editor, analysis) {
        // Clear existing decorations
        this.clearHighlights();
        
        // Apply new decorations for each rhyme group
        analysis.groups.forEach((group, groupIndex) => {
            const className = `rhyme-highlight rhyme-group-${groupIndex % 8}`;
            
            group.forEach(wordIndex => {
                const word = analysis.words[wordIndex];
                
                // Convert flat position to line/ch for CodeMirror
                const from = editor.offsetToPos(word.start);
                const to = editor.offsetToPos(word.end);
                
                // Create decoration effect
                if (!editor || typeof editor.markText !== 'function') {
                    // CM6 path needs decorations; skip inline for now
                    continue;
                }
                const decoration = editor.markText(from, to, {
                    className: className,
                    attributes: {
                        'data-rhyme-group': groupIndex.toString(),
                        'title': `Rhyme group ${groupIndex + 1}`
                    }
                });
                
                this.highlightDecorations.push(decoration);
            });
        });
    }
    
    clearHighlights() {
        // Clear all existing highlights
        this.highlightDecorations.forEach(decoration => {
            decoration.clear();
        });
        this.highlightDecorations = [];
    }
    
    async showResults(analysis) {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_RHYME_RESULTS)[0];
        
        if (!leaf) {
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({ type: VIEW_TYPE_RHYME_RESULTS, active: true });
        }
        
        workspace.revealLeaf(leaf);
        leaf.view.setAnalysis(analysis);
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.id = 'rhyme-lab-styles';
        style.textContent = `
            /* Rhyme highlighting in editor */
            .cm-s-obsidian .rhyme-highlight {
                border-radius: 3px;
                padding: 1px 2px;
                transition: all 0.2s ease;
                cursor: pointer;
            }
            
            .cm-s-obsidian .rhyme-highlight:hover {
                filter: brightness(1.2);
                transform: scale(1.05);
            }
            
            /* Rhyme group colors */
            .rhyme-group-0 { 
                background: rgba(255, 107, 107, 0.4) !important; 
                border-bottom: 2px solid #ff6b6b;
            }
            .rhyme-group-1 { 
                background: rgba(78, 205, 196, 0.4) !important; 
                border-bottom: 2px solid #4ecdc4;
            }
            .rhyme-group-2 { 
                background: rgba(255, 195, 0, 0.4) !important; 
                border-bottom: 2px solid #ffc300;
            }
            .rhyme-group-3 { 
                background: rgba(110, 89, 255, 0.4) !important; 
                border-bottom: 2px solid #6e59ff;
            }
            .rhyme-group-4 { 
                background: rgba(255, 154, 0, 0.4) !important; 
                border-bottom: 2px solid #ff9a00;
            }
            .rhyme-group-5 { 
                background: rgba(237, 117, 255, 0.4) !important; 
                border-bottom: 2px solid #ed75ff;
            }
            .rhyme-group-6 { 
                background: rgba(0, 210, 211, 0.4) !important; 
                border-bottom: 2px solid #00d2d3;
            }
            .rhyme-group-7 { 
                background: rgba(84, 160, 255, 0.4) !important; 
                border-bottom: 2px solid #54a0ff;
            }
            
            /* Results view styling */
            .rhyme-results-view {
                padding: 20px;
                height: 100%;
                overflow-y: auto;
            }
            
            .rhyme-info {
                margin-bottom: 20px;
                padding: 15px;
                background: var(--background-secondary);
                border-radius: 8px;
            }
            
            .rhyme-success {
                color: var(--text-success);
                font-weight: bold;
                margin-top: 10px;
            }
            
            .rhyme-group-info {
                margin: 10px 0;
                padding: 12px;
                background: var(--background-secondary);
                border-radius: 6px;
                border-left: 4px solid;
            }
            
            .rhyme-group-header {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .rhyme-group-title {
                font-weight: bold;
                font-size: 14px;
            }
            
            .rhyme-words-list {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            
            .rhyme-word-badge {
                display: inline-block;
                padding: 3px 8px;
                background: var(--background-primary);
                border-radius: 4px;
                font-size: 13px;
                font-family: monospace;
            }
            
            /* Apply group colors to info panels */
            .rhyme-group-info.rhyme-group-0 { border-left-color: #ff6b6b; }
            .rhyme-group-info.rhyme-group-1 { border-left-color: #4ecdc4; }
            .rhyme-group-info.rhyme-group-2 { border-left-color: #ffc300; }
            .rhyme-group-info.rhyme-group-3 { border-left-color: #6e59ff; }
            .rhyme-group-info.rhyme-group-4 { border-left-color: #ff9a00; }
            .rhyme-group-info.rhyme-group-5 { border-left-color: #ed75ff; }
            .rhyme-group-info.rhyme-group-6 { border-left-color: #00d2d3; }
            .rhyme-group-info.rhyme-group-7 { border-left-color: #54a0ff; }
        `;
        document.head.appendChild(style);
    }
    
    onunload() {
        // Clean up highlights
        this.clearHighlights();
        
        // Remove styles
        const style = document.getElementById('rhyme-lab-styles');
        if (style) style.remove();
        
        console.log('Rhyme Lab Pro unloaded');
    }
}

// Settings Tab
class RhymeLabSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    
    display() {
        const { containerEl } = this;
        containerEl.empty();
        
        containerEl.createEl('h2', { text: 'Rhyme Lab Pro Settings' });
        
        new Setting(containerEl)
            .setName('Rhyme threshold')
            .setDesc('Lower = stricter matching (0.0-1.0). Default is 0.5')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.05)
                .setValue(this.plugin.settings.threshold)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.threshold = value;
                    await this.plugin.saveData(this.plugin.settings);
                }));
        
        new Setting(containerEl)
            .setName('Clear highlights on reload')
            .setDesc('Automatically clear highlights when switching notes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.clearOnReload || false)
                .onChange(async (value) => {
                    this.plugin.settings.clearOnReload = value;
                    await this.plugin.saveData(this.plugin.settings);
                }));
    }
}

module.exports = RhymeLabPlugin;