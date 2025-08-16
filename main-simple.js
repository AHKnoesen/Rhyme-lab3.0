// Simplified Rhyme Lab Pro Plugin - Core functionality without TypeScript build
const { Plugin, PluginSettingTab, Setting, Notice, ItemView, MarkdownView } = require('obsidian');

const VIEW_TYPE_RHYME_RESULTS = 'rhyme-results-view';

// ARPAbet vowel phonemes
const ARPA_VOWELS = new Set([
    "AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"
]);

// Vowel classes for similarity grouping
const VOWEL_CLASSES = {
    "IY": "EE", "IH": "I", "EH": "E", "AE": "A", 
    "AA": "AH", "AH": "UH", "AO": "OR", "OW": "O", 
    "UH": "U", "UW": "OO", "EY": "AY", "AY": "EYE", 
    "OY": "OY", "AW": "OW", "ER": "ER"
};

// Custom ARPA for slang and contractions
const CUSTOM_ARPA = {
    "ya": ["Y", "AA1"], "gonna": ["G", "AH1", "N", "AH0"], 
    "wanna": ["W", "AA1", "N", "AH0"], "bruh": ["B", "R", "AH1"],
    "nah": ["N", "AA1"], "yo": ["Y", "OW1"], "lekker": ["L", "EH1", "K", "ER0"]
};

// Simple phonetic conversion
function wordToPhones(word) {
    const cleaned = word.toLowerCase().replace(/[^\w']/g, '');
    if (CUSTOM_ARPA[cleaned]) return CUSTOM_ARPA[cleaned];
    
    // Basic heuristic conversion
    const phones = [];
    let stressed = false;
    
    for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if ('aeiouy'.includes(ch)) {
            const stress = !stressed ? "1" : "0";
            phones.push((ch === 'a' ? 'AE' : ch === 'e' ? 'EH' : ch === 'i' ? 'IH' : 
                        ch === 'o' ? 'AO' : ch === 'u' ? 'AH' : 'IH') + stress);
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

// Rhyme analysis
function analyzeRhymes(text) {
    const lines = text.split('\n');
    const words = [];
    
    // Extract words
    lines.forEach((line, lineIndex) => {
        const matches = line.match(/[A-Za-z']+/g) || [];
        matches.forEach((word, pos) => {
            const phones = wordToPhones(word);
            words.push({
                text: word,
                line: lineIndex,
                phones: phones,
                position: pos
            });
        });
    });
    
    // Simple rhyme detection based on ending sounds
    const rhymeGroups = [];
    const used = new Set();
    
    for (let i = 0; i < words.length; i++) {
        if (used.has(i)) continue;
        
        const group = [i];
        used.add(i);
        
        for (let j = i + 1; j < words.length; j++) {
            if (used.has(j)) continue;
            
            // Check if words rhyme (simplified: last 2 phonemes match)
            const phones1 = words[i].phones;
            const phones2 = words[j].phones;
            
            if (phones1.length >= 2 && phones2.length >= 2) {
                const end1 = phones1.slice(-2).join('');
                const end2 = phones2.slice(-2).join('');
                
                if (end1 === end2 && words[i].text !== words[j].text) {
                    group.push(j);
                    used.add(j);
                }
            }
        }
        
        if (group.length >= 2) {
            rhymeGroups.push(group);
        }
    }
    
    return {
        words: words,
        groups: rhymeGroups,
        metrics: {
            totalWords: words.length,
            rhymeGroups: rhymeGroups.length,
            density: rhymeGroups.length / Math.max(1, words.length)
        }
    };
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
        
        const header = container.createEl('h2', { text: 'Rhyme Analysis Results' });
        this.contentEl = container.createDiv('rhyme-content');
        this.renderEmpty();
    }
    
    renderEmpty() {
        this.contentEl.empty();
        const empty = this.contentEl.createDiv('rhyme-empty-state');
        empty.createEl('div', { text: '🎵', cls: 'rhyme-empty-icon' });
        empty.createEl('h3', { text: 'No Analysis Yet', cls: 'rhyme-empty-title' });
        empty.createEl('p', { text: 'Run "Analyze rhymes" to see results here.' });
    }
    
    setAnalysis(analysis) {
        this.contentEl.empty();
        
        // Metrics
        const metrics = this.contentEl.createDiv('rhyme-metrics');
        metrics.createEl('h3', { text: 'Metrics' });
        const grid = metrics.createDiv('rhyme-metrics-grid');
        
        this.createMetricCard(grid, 'Total Words', analysis.metrics.totalWords);
        this.createMetricCard(grid, 'Rhyme Groups', analysis.metrics.rhymeGroups);
        this.createMetricCard(grid, 'Density', `${(analysis.metrics.density * 100).toFixed(1)}%`);
        
        // Groups
        if (analysis.groups.length > 0) {
            const groups = this.contentEl.createDiv('rhyme-groups');
            groups.createEl('h3', { text: `Rhyme Groups (${analysis.groups.length})` });
            
            analysis.groups.forEach((group, index) => {
                const groupEl = groups.createDiv('rhyme-group');
                const header = groupEl.createDiv('rhyme-group-header');
                
                header.createSpan('rhyme-group-indicator').addClass(`rhyme-group-${index % 8}`);
                header.createSpan('rhyme-group-title').setText(`Group ${index + 1}`);
                
                const wordsList = groupEl.createDiv('rhyme-words-list');
                group.forEach(wordIndex => {
                    const word = analysis.words[wordIndex];
                    const wordEl = wordsList.createSpan('rhyme-word');
                    wordEl.setText(word.text);
                    wordEl.addClass(`rhyme-group-${index % 8}`);
                });
            });
        }
    }
    
    createMetricCard(parent, label, value) {
        const card = parent.createDiv('rhyme-metric-card');
        card.createDiv('rhyme-metric-label').setText(label);
        card.createDiv('rhyme-metric-value').setText(value.toString());
    }
}

// Main Plugin
class RhymeLabPlugin extends Plugin {
    async onload() {
        this.settings = Object.assign({}, {
            perfectThreshold: 0.10,
            slantThreshold: 0.25,
            highlightAssonance: true
        }, await this.loadData());
        
        // Register view
        this.registerView(VIEW_TYPE_RHYME_RESULTS, (leaf) => new RhymeResultsView(leaf, this));
        
        // Add ribbon icon
        this.addRibbonIcon('music', 'Analyze Rhymes', () => {
            this.analyzeCurrentNote();
        });
        
        // Add commands
        this.addCommand({
            id: 'analyze-rhymes',
            name: 'Analyze rhymes in current note',
            editorCallback: (editor) => {
                const text = editor.getSelection() || editor.getValue();
                this.analyzeText(text);
            }
        });
        
        this.addCommand({
            id: 'show-rhyme-results',
            name: 'Show rhyme analysis panel',
            callback: () => this.activateResultsView()
        });
        
        // Settings
        this.addSettingTab(new RhymeLabSettingTab(this.app, this));
        
        console.log('Rhyme Lab Pro loaded (simplified version)');
    }
    
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
    
    async analyzeText(text) {
        try {
            const analysis = analyzeRhymes(text);
            await this.showResults(analysis);
            new Notice(`Analysis complete: ${analysis.metrics.rhymeGroups} rhyme groups found`);
        } catch (error) {
            console.error('Rhyme analysis failed:', error);
            new Notice('Analysis failed: ' + error.message);
        }
    }
    
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
    
    async showResults(analysis) {
        await this.activateResultsView();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_RHYME_RESULTS);
        if (leaves.length > 0) {
            const view = leaves[0].view;
            view.setAnalysis(analysis);
        }
    }
    
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
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
            .setName('Perfect rhyme threshold')
            .setDesc('Lower values = stricter matching (0.0-1.0)')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.05)
                .setValue(this.plugin.settings.perfectThreshold)
                .onChange(async (value) => {
                    this.plugin.settings.perfectThreshold = value;
                    await this.plugin.saveSettings();
                }));
    }
}

module.exports = RhymeLabPlugin;