#!/usr/bin/env node

/**
 * Token Optimizer - Usage Analyzer
 * Analyzes OpenClaw workspace files and session data for token optimization
 */

const fs = require('fs');
const path = require('path');

class TokenAnalyzer {
    constructor(configPath = null) {
        // Load configuration
        this.config = this.loadConfig(configPath);
        
        this.modelCosts = {
            'anthropic/claude-opus-4-5': { input: 15, output: 75 },
            'anthropic/claude-sonnet-4-20250514': { input: 3, output: 15 },
            'google/gemini-2.5-pro': { input: 1.25, output: 10 }
        };
    }

    loadConfig(configPath = null) {
        const defaultConfig = {
            workspaceFiles: {
                common: ['SOUL.md', 'USER.md', 'AGENTS.md', 'MEMORY.md', 'HEARTBEAT.md', 'TOOLS.md', 'IDENTITY.md'],
                patterns: ['*.md'],
                exclude: ['README.md', 'CHANGELOG.md', 'LICENSE.md', '*.backup', '*.compressed.md']
            },
            compression: {
                minSizeBytes: 100,
                minTokens: 25,
                minCompressionPotential: 10
            },
            analysis: {
                sessionsPerWeek: 7,
                avgApiCallsPerSession: 20,
                avgOutputTokensPerSession: 15000
            }
        };

        if (!configPath) {
            configPath = path.join(__dirname, 'config.json');
        }

        try {
            if (fs.existsSync(configPath)) {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                return { ...defaultConfig, ...configData };
            }
        } catch (error) {
            console.log(`⚠️  Could not load config: ${error.message}, using defaults`);
        }

        return defaultConfig;
    }

    async analyzeWorkspace(workspacePath = process.cwd()) {
        const analysis = {
            files: {},
            totalTokens: 0,
            systemPromptSize: 0,
            recommendations: []
        };

        console.log('🔍 Analyzing workspace files...\n');

        // Discover workspace files dynamically
        const workspaceFiles = this.discoverWorkspaceFiles(workspacePath);
        
        for (const filename of workspaceFiles) {
            const filePath = path.join(workspacePath, filename);
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const tokens = this.estimateTokens(content);
                
                analysis.files[filename] = {
                    path: filePath,
                    size: content.length,
                    tokens: tokens,
                    compressionPotential: this.assessCompressionPotential(content)
                };
                analysis.totalTokens += tokens;
                analysis.systemPromptSize += tokens;

                console.log(`📄 ${filename.padEnd(12)} ${tokens.toString().padStart(6)} tokens`);
            } catch (error) {
                console.log(`⚠️  Could not read ${filename}: ${error.message}`);
            }
        }

        console.log(`\n📊 System Prompt Total: ${analysis.systemPromptSize} tokens`);
        
        this.generateRecommendations(analysis);
        return analysis;
    }

    discoverWorkspaceFiles(workspacePath) {
        const workspaceFiles = [];
        
        try {
            // Get all files in the workspace root
            const files = fs.readdirSync(workspacePath);
            
            for (const file of files) {
                const filePath = path.join(workspacePath, file);
                const stat = fs.statSync(filePath);
                
                // Skip directories and non-markdown files
                if (stat.isDirectory()) continue;
                if (!file.endsWith('.md')) continue;
                
                // Skip excluded patterns
                if (this.shouldExcludeFile(file)) continue;
                
                // Include if it looks like a workspace file
                if (this.isWorkspaceFile(file, filePath)) {
                    workspaceFiles.push(file);
                }
            }
            
            // Sort by priority (common files first)
            workspaceFiles.sort((a, b) => {
                const priority = {
                    'SOUL.md': 1, 'USER.md': 2, 'AGENTS.md': 3, 'MEMORY.md': 4,
                    'HEARTBEAT.md': 5, 'TOOLS.md': 6, 'IDENTITY.md': 7
                };
                return (priority[a] || 99) - (priority[b] || 99);
            });
            
        } catch (error) {
            console.log(`⚠️  Could not scan workspace: ${error.message}`);
        }
        
        return workspaceFiles;
    }

    shouldExcludeFile(filename) {
        const excludeList = this.config.workspaceFiles.exclude || [];
        
        return excludeList.some(pattern => {
            // Convert glob patterns to regex
            if (pattern.includes('*')) {
                const regexPattern = pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
                return new RegExp(regexPattern).test(filename);
            }
            return filename === pattern;
        });
    }

    isWorkspaceFile(filename, filePath) {
        // Check if it's a known workspace file
        const knownFiles = this.config.workspaceFiles.common || [];
        
        if (knownFiles.includes(filename)) {
            return true;
        }
        
        // Check file content for workspace indicators
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Look for workspace file patterns
            const workspaceIndicators = [
                /# (SOUL|USER|AGENTS|MEMORY|HEARTBEAT|TOOLS|IDENTITY)\.md/i,
                /workspace.*context/i,
                /system.*prompt/i,
                /agent.*config/i
            ];
            
            const hasWorkspaceContent = workspaceIndicators.some(pattern => 
                pattern.test(content)
            );
            
            // Include files that are substantial and look like config/prompt files
            const isSubstantial = content.length > 500; // At least 500 chars
            const looksLikeConfig = /^[A-Z_]+\.md$/i.test(filename) || 
                                   /config|prompt|context|instruction/i.test(filename);
            
            return hasWorkspaceContent || (isSubstantial && looksLikeConfig);
            
        } catch (error) {
            return false; // If we can't read it, don't include it
        }
    }

    estimateTokens(text) {
        // Rough approximation: 4 chars per token for English
        // More accurate for actual usage would use tiktoken or similar
        return Math.ceil(text.length / 4);
    }

    assessCompressionPotential(content) {
        const indicators = {
            verbose: /\b(When|Please|In order to|It is important|You should|This is|That is)\b/gi,
            repetitive: /\b(the|and|or|but|with|from|into|during|including)\b/gi,
            filler: /\b(very|quite|rather|really|actually|basically|essentially)\b/gi,
            longSentences: content.split('.').filter(s => s.length > 100).length,
            bulletPoints: (content.match(/^[\s]*[-•\*]/gm) || []).length
        };

        const verboseMatches = (content.match(indicators.verbose) || []).length;
        const repetitiveMatches = (content.match(indicators.repetitive) || []).length;
        const fillerMatches = (content.match(indicators.filler) || []).length;
        
        // Calculate compression potential (0-100%)
        const score = Math.min(100, 
            (verboseMatches * 2) + 
            (repetitiveMatches * 0.5) + 
            (fillerMatches * 3) + 
            (indicators.longSentences * 5) +
            Math.max(0, 20 - indicators.bulletPoints) // Penalty for already structured content
        );

        return Math.floor(score);
    }

    generateRecommendations(analysis) {
        analysis.recommendations = [];

        // File-specific recommendations
        Object.entries(analysis.files).forEach(([filename, data]) => {
            if (data.compressionPotential > 30) {
                const tokenSavings = Math.floor(data.tokens * (data.compressionPotential / 100));
                analysis.recommendations.push({
                    type: 'compression',
                    priority: 'high',
                    target: filename,
                    potential: `${data.compressionPotential}%`,
                    savings: tokenSavings,
                    monthlySavings: this.calculateMonthlySavings(tokenSavings),
                    description: `Compress ${filename} using AI notation`
                });
            }
        });

        // Model switching recommendations
        this.addModelSwitchingRecommendations(analysis);

        // System-wide recommendations
        if (analysis.systemPromptSize > 10000) {
            const tokenSavings = Math.floor(analysis.systemPromptSize * 0.4);
            analysis.recommendations.push({
                type: 'system',
                priority: 'medium',
                target: 'system-prompt',
                potential: '40%',
                savings: tokenSavings,
                monthlySavings: this.calculateMonthlySavings(tokenSavings),
                description: 'System prompt is large - consider aggressive compression'
            });
        }

        // Sort by potential monthly savings
        analysis.recommendations.sort((a, b) => (b.monthlySavings || 0) - (a.monthlySavings || 0));

        console.log('\n💡 Recommendations:');
        analysis.recommendations.forEach((rec, i) => {
            const savingsText = rec.monthlySavings ? 
                `save ~${rec.savings} tokens (~$${rec.monthlySavings.toFixed(2)}/month)` :
                `save ~${rec.savings} tokens`;
            console.log(`   ${i+1}. ${rec.description} (${savingsText})`);
        });
    }

    addModelSwitchingRecommendations(analysis) {
        const currentModel = this.detectCurrentModel();
        const modelComparisons = this.calculateModelSavings(analysis, currentModel);
        
        modelComparisons.forEach(comparison => {
            if (comparison.monthlySavings > 5) { // Only recommend if saves >$5/month
                analysis.recommendations.push({
                    type: 'model-switch',
                    priority: comparison.monthlySavings > 50 ? 'high' : 'medium',
                    target: comparison.toModel,
                    fromModel: comparison.fromModel,
                    potential: `${Math.round(comparison.savingsPercentage)}%`,
                    savings: null, // Not token-based
                    monthlySavings: comparison.monthlySavings,
                    annualSavings: comparison.monthlySavings * 12,
                    description: `Switch from ${this.getModelDisplayName(comparison.fromModel)} to ${this.getModelDisplayName(comparison.toModel)}`
                });
            }
        });
    }

    detectCurrentModel() {
        // Try to detect current model from session status or config
        // For now, assume Opus if no detection (worst case for recommendations)
        return 'anthropic/claude-opus-4-5';
    }

    calculateModelSavings(analysis, currentModel) {
        const comparisons = [];
        const currentCosts = this.calculateMonthlyCosts(analysis, 7, currentModel);
        
        if (!currentCosts) return comparisons;

        // Compare with other models
        Object.keys(this.modelCosts).forEach(model => {
            if (model === currentModel) return;
            
            const modelCosts = this.calculateMonthlyCosts(analysis, 7, model);
            if (modelCosts && modelCosts.monthly < currentCosts.monthly) {
                const savings = currentCosts.monthly - modelCosts.monthly;
                const savingsPercentage = (savings / currentCosts.monthly) * 100;
                
                comparisons.push({
                    fromModel: currentModel,
                    toModel: model,
                    monthlySavings: savings,
                    savingsPercentage: savingsPercentage,
                    currentCost: currentCosts.monthly,
                    newCost: modelCosts.monthly
                });
            }
        });

        // Sort by savings amount
        return comparisons.sort((a, b) => b.monthlySavings - a.monthlySavings);
    }

    getModelDisplayName(modelId) {
        const displayNames = {
            'anthropic/claude-opus-4-5': 'Claude Opus',
            'anthropic/claude-sonnet-4-20250514': 'Claude Sonnet',
            'google/gemini-2.5-pro': 'Gemini Pro'
        };
        return displayNames[modelId] || modelId.split('/').pop();
    }

    calculateMonthlySavings(tokenSavings, model = 'anthropic/claude-sonnet-4-20250514') {
        const costs = this.modelCosts[model];
        if (!costs || !tokenSavings) return 0;
        
        // Estimate monthly savings based on typical usage
        const sessionsPerWeek = this.config.analysis.sessionsPerWeek;
        const apiCallsPerSession = this.config.analysis.avgApiCallsPerSession;
        
        // System prompt is sent with every API call
        const monthlySystemPromptTokens = tokenSavings * apiCallsPerSession * sessionsPerWeek * 4.33;
        const monthlySavings = (monthlySystemPromptTokens * costs.input) / 1000000;
        
        return monthlySavings;
    }

    calculateMonthlyCosts(analysis, sessionsPerWeek = 7, model = 'anthropic/claude-sonnet-4-20250514') {
        const costs = this.modelCosts[model];
        if (!costs) {
            console.log(`❌ Unknown model: ${model}`);
            return null;
        }

        const avgSessionTokens = 150000; // Based on user's typical sessions
        const systemPromptRepeats = 20; // Avg API calls per session
        
        const systemPromptCost = (analysis.systemPromptSize * systemPromptRepeats * costs.input) / 1000000;
        const sessionCost = (avgSessionTokens * costs.input) / 1000000 + 
                           (15000 * costs.output) / 1000000; // Avg output
        
        const weeklySystemCost = systemPromptCost * sessionsPerWeek;
        const weeklySessionCost = sessionCost * sessionsPerWeek;
        const monthlyCost = (weeklySystemCost + weeklySessionCost) * 4.33;

        return {
            systemPromptPerSession: systemPromptCost,
            sessionCost: sessionCost,
            weekly: weeklySystemCost + weeklySessionCost,
            monthly: monthlyCost,
            model: model
        };
    }
}

// CLI usage
if (require.main === module) {
    const analyzer = new TokenAnalyzer();
    
    const command = process.argv[2] || 'analyze';
    const workspacePath = process.argv[3] || process.cwd();

    switch(command) {
        case 'analyze':
            analyzer.analyzeWorkspace(workspacePath).then(analysis => {
                console.log('\n💰 Cost Analysis:');
                const costs = analyzer.calculateMonthlyCosts(analysis);
                if (costs) {
                    console.log(`   Current monthly cost: $${costs.monthly.toFixed(2)}`);
                    console.log(`   System prompt: $${(costs.systemPromptPerSession * 30).toFixed(2)}/month`);
                }
            });
            break;
        
        default:
            console.log('Usage: node analyzer.js [analyze] [workspace-path]');
    }
}

module.exports = { TokenAnalyzer };