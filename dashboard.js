#!/usr/bin/env node

/**
 * Token Optimizer - Interactive Dashboard
 * Generates visual cost analysis and savings projections
 */

const fs = require('fs');
const path = require('path');
const { TokenAnalyzer } = require('./analyzer');
const { AICompressor } = require('./compressor');

class TokenDashboard {
    constructor() {
        this.analyzer = new TokenAnalyzer();
        this.compressor = new AICompressor();
        this.colors = {
            primary: '#2563eb',
            success: '#059669',
            warning: '#d97706',
            danger: '#dc2626',
            muted: '#6b7280'
        };
    }

    async generateFullReport(workspacePath = process.cwd()) {
        console.log('📊 Generating Token Optimization Dashboard...\n');
        
        const analysis = await this.analyzer.analyzeWorkspace(workspacePath);
        const compressionPreviews = this.generateCompressionPreviews(workspacePath);
        const costProjections = this.calculateCostProjections(analysis);
        
        const dashboard = {
            timestamp: new Date().toISOString(),
            workspace: workspacePath,
            currentUsage: analysis,
            compressionPreviews: compressionPreviews,
            costProjections: costProjections,
            recommendations: this.prioritizeRecommendations(analysis.recommendations)
        };
        
        this.displayDashboard(dashboard);
        return dashboard;
    }

    generateCompressionPreviews(workspacePath) {
        const previews = [];
        
        // Use the same dynamic file discovery as analyzer
        const workspaceFiles = this.analyzer.discoverWorkspaceFiles(workspacePath);
        
        workspaceFiles.forEach(filename => {
            const filePath = path.join(workspacePath, filename);
            try {
                const preview = this.compressor.generateCompressionPreview(filePath);
                previews.push(preview);
            } catch (error) {
                console.log(`⚠️  Could not preview ${filename}: ${error.message}`);
            }
        });
        
        return previews;
    }

    calculateCostProjections(analysis) {
        const models = [
            'anthropic/claude-opus-4-5',
            'anthropic/claude-sonnet-4-20250514', 
            'google/gemini-2.5-pro'
        ];
        
        const projections = {};
        
        models.forEach(model => {
            const current = this.analyzer.calculateMonthlyCosts(analysis, 7, model);
            const optimized = this.analyzer.calculateMonthlyCosts(
                { ...analysis, systemPromptSize: Math.floor(analysis.systemPromptSize * 0.4) }, 
                7, 
                model
            );
            
            projections[model] = {
                current: current,
                optimized: optimized,
                savings: current ? {
                    monthly: current.monthly - (optimized?.monthly || 0),
                    percentage: Math.round(((current.monthly - (optimized?.monthly || 0)) / current.monthly) * 100)
                } : null
            };
        });
        
        return projections;
    }

    prioritizeRecommendations(recommendations) {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        return recommendations.sort((a, b) => {
            return priorityOrder[b.priority] - priorityOrder[a.priority] || b.savings - a.savings;
        });
    }

    displayDashboard(dashboard) {
        this.printHeader();
        this.printCurrentUsage(dashboard.currentUsage);
        this.printCompressionPreviews(dashboard.compressionPreviews);
        this.printCostProjections(dashboard.costProjections);
        this.printRecommendations(dashboard.recommendations);
        this.printSummary(dashboard);
    }

    printHeader() {
        console.log('╭─────────────────────────────────────────────────╮');
        console.log('│           🚀 TOKEN OPTIMIZER DASHBOARD          │');
        console.log('╰─────────────────────────────────────────────────╯\n');
    }

    printCurrentUsage(analysis) {
        console.log('📈 CURRENT USAGE:');
        console.log('─'.repeat(50));
        
        const sortedFiles = Object.entries(analysis.files)
            .sort(([,a], [,b]) => b.tokens - a.tokens);
        
        sortedFiles.forEach(([filename, data]) => {
            const bar = this.createProgressBar(data.tokens, analysis.totalTokens, 20);
            const compression = data.compressionPotential;
            const indicator = compression > 50 ? '🔴' : compression > 25 ? '🟡' : '🟢';
            
            console.log(`${indicator} ${filename.padEnd(12)} ${data.tokens.toString().padStart(6)} ${bar} ${compression}% compressible`);
        });
        
        console.log(`\n📊 Total System Prompt: ${analysis.totalTokens} tokens\n`);
    }

    printCompressionPreviews(previews) {
        console.log('🗜️  COMPRESSION PREVIEW:');
        console.log('─'.repeat(50));
        
        let totalBefore = 0;
        let totalAfter = 0;
        
        previews.forEach(preview => {
            totalBefore += preview.before.tokens;
            totalAfter += preview.after.tokens;
            
            const savingsBar = this.createSavingsBar(preview.savings);
            console.log(`${preview.filename.padEnd(12)} ${preview.before.tokens} → ${preview.after.tokens} ${savingsBar} ${preview.savings}%`);
        });
        
        const totalSavings = Math.round(((totalBefore - totalAfter) / totalBefore) * 100);
        console.log(`\n💾 Total Savings: ${totalBefore} → ${totalAfter} tokens (${totalSavings}%)\n`);
    }

    printCostProjections(projections) {
        console.log('💰 COST PROJECTIONS:');
        console.log('─'.repeat(50));
        
        Object.entries(projections).forEach(([model, data]) => {
            if (!data.current) return;
            
            const modelName = model.split('/')[1];
            console.log(`\n🤖 ${modelName}:`);
            console.log(`   Current:   $${data.current.monthly.toFixed(2)}/month`);
            if (data.optimized) {
                console.log(`   Optimized: $${data.optimized.monthly.toFixed(2)}/month`);
                console.log(`   Savings:   $${data.savings.monthly.toFixed(2)}/month (${data.savings.percentage}%)`);
            }
        });
        console.log();
    }

    printRecommendations(recommendations) {
        console.log('💡 OPTIMIZATION RECOMMENDATIONS:');
        console.log('─'.repeat(50));
        
        recommendations.slice(0, 5).forEach((rec, i) => {
            const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
            console.log(`${i+1}. ${priority} ${rec.description}`);
            console.log(`   💾 Save ~${rec.savings} tokens (~$${(rec.savings * 0.003).toFixed(2)}/month)`);
        });
        console.log();
    }

    printSummary(dashboard) {
        const totalCurrentTokens = dashboard.currentUsage.totalTokens;
        const totalOptimizedTokens = dashboard.compressionPreviews.reduce((sum, p) => sum + p.after.tokens, 0);
        const totalSavings = Math.round(((totalCurrentTokens - totalOptimizedTokens) / totalCurrentTokens) * 100);
        
        // Get best cost projection (usually Sonnet)
        const bestProjection = Object.values(dashboard.costProjections)
            .filter(p => p.current && p.optimized)
            .sort((a, b) => b.savings.monthly - a.savings.monthly)[0];
        
        console.log('🎯 OPTIMIZATION SUMMARY:');
        console.log('─'.repeat(50));
        console.log(`📊 Token reduction: ${totalCurrentTokens} → ${totalOptimizedTokens} (${totalSavings}%)`);
        if (bestProjection) {
            console.log(`💰 Best monthly savings: $${bestProjection.savings.monthly.toFixed(2)} (${bestProjection.savings.percentage}%)`);
        }
        console.log(`🏆 Estimated annual savings: $${(bestProjection?.savings.monthly * 12 || 0).toFixed(2)}`);
        console.log(`\n✅ Ready to optimize! Run: /optimize apply\n`);
    }

    createProgressBar(value, max, width = 20) {
        const percentage = value / max;
        const filled = Math.round(width * percentage);
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    createSavingsBar(savings) {
        const width = 10;
        const normalized = Math.min(savings / 100, 1);
        const filled = Math.round(width * normalized);
        const empty = width - filled;
        return '▓'.repeat(filled) + '░'.repeat(empty);
    }

    exportHtmlDashboard(dashboard, outputPath) {
        const html = this.generateHtmlDashboard(dashboard);
        fs.writeFileSync(outputPath, html);
        console.log(`📄 HTML dashboard saved to: ${outputPath}`);
    }

    generateHtmlDashboard(dashboard) {
        // This would generate a full HTML dashboard with charts
        // For now, returning a basic template
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Token Optimizer Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; }
        .chart { width: 100%; height: 400px; margin: 20px 0; }
        .metric { display: inline-block; margin: 10px 20px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #059669; }
        .metric-label { color: #6b7280; }
    </style>
</head>
<body>
    <h1>🚀 Token Optimizer Dashboard</h1>
    
    <div class="metrics">
        <div class="metric">
            <div class="metric-value">${dashboard.currentUsage.totalTokens}</div>
            <div class="metric-label">Current Tokens</div>
        </div>
        <div class="metric">
            <div class="metric-value">${dashboard.compressionPreviews.reduce((sum, p) => sum + (p.before.tokens - p.after.tokens), 0)}</div>
            <div class="metric-label">Tokens Saved</div>
        </div>
    </div>
    
    <canvas id="savingsChart" class="chart"></canvas>
    
    <script>
        // Chart.js implementation would go here
        const ctx = document.getElementById('savingsChart').getContext('2d');
        // Implementation details...
    </script>
</body>
</html>`;
    }
}

// CLI usage
if (require.main === module) {
    const dashboard = new TokenDashboard();
    
    const command = process.argv[2] || 'show';
    const workspacePath = process.argv[3] || process.cwd();
    
    switch(command) {
        case 'show':
            dashboard.generateFullReport(workspacePath);
            break;
            
        case 'html':
            dashboard.generateFullReport(workspacePath).then(data => {
                const outputPath = path.join(workspacePath, 'token-optimizer-report.html');
                dashboard.exportHtmlDashboard(data, outputPath);
            });
            break;
            
        default:
            console.log('Usage: node dashboard.js [show|html] [workspace-path]');
    }
}

module.exports = { TokenDashboard };