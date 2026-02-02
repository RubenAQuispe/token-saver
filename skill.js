#!/usr/bin/env node

/**
 * Token Optimizer Skill - Main Handler
 * OpenClaw skill for analyzing and optimizing token usage
 */

const { TokenAnalyzer } = require('./analyzer');
const { AICompressor } = require('./compressor');
const { TokenDashboard } = require('./dashboard');
const fs = require('fs');
const path = require('path');

class TokenOptimizerSkill {
    constructor() {
        this.analyzer = new TokenAnalyzer();
        this.compressor = new AICompressor();
        this.dashboard = new TokenDashboard();
        
        this.commands = {
            'analyze': this.analyzeCommand.bind(this),
            'models': this.modelsCommand.bind(this),
            'compress': this.compressCommand.bind(this),
            'preview': this.previewCommand.bind(this),
            'apply': this.applyCommand.bind(this),
            'revert': this.revertCommand.bind(this),
            'dashboard': this.dashboardCommand.bind(this),
            'templates': this.templatesCommand.bind(this),
            'menu': this.menuCommand.bind(this),
            'help': this.helpCommand.bind(this)
        };
    }

    async handleCommand(command, args = [], context = {}) {
        let workspacePath = context.workspace || process.cwd();
        
        // If we're in the skills subdirectory, go up to workspace root
        if (workspacePath.includes('skills' + path.sep + 'token-optimizer')) {
            workspacePath = path.resolve(workspacePath, '..', '..');
        }
        
        if (!this.commands[command]) {
            return this.helpCommand();
        }
        
        try {
            return await this.commands[command](args, workspacePath, context);
        } catch (error) {
            return {
                success: false,
                message: `❌ Error executing ${command}: ${error.message}`,
                error: error
            };
        }
    }

    async analyzeCommand(args, workspacePath, context) {
        const analysis = await this.analyzer.analyzeWorkspace(workspacePath);
        const costs = this.analyzer.calculateMonthlyCosts(analysis);
        
        let result = `📊 **Token Usage Analysis**\n\n`;
        result += `**Workspace Files:**\n`;
        
        Object.entries(analysis.files).forEach(([filename, data]) => {
            const compression = data.compressionPotential;
            const indicator = compression > 50 ? '🔴' : compression > 25 ? '🟡' : '🟢';
            result += `${indicator} ${filename}: ${data.tokens} tokens (${compression}% compressible)\n`;
        });
        
        result += `\n**System Prompt Total:** ${analysis.systemPromptSize} tokens\n`;
        
        if (costs) {
            result += `**Monthly Cost Estimate:** $${costs.monthly.toFixed(2)}\n`;
        }
        
        if (analysis.recommendations.length > 0) {
            result += `\n**Top Recommendations:**\n`;
            analysis.recommendations.slice(0, 3).forEach((rec, i) => {
                result += `${i+1}. ${rec.description} (save ~${rec.savings} tokens)\n`;
            });
        }
        
        return {
            success: true,
            message: result,
            data: analysis
        };
    }

    async compressCommand(args, workspacePath, context) {
        const filename = args[0];
        if (!filename) {
            return {
                success: false,
                message: `❌ Please specify a file to compress.\nUsage: /optimize compress FILENAME`
            };
        }
        
        const inputPath = path.join(workspacePath, filename);
        if (!fs.existsSync(inputPath)) {
            return {
                success: false,
                message: `❌ File not found: ${filename}`
            };
        }
        
        const result = this.compressor.compressFile(inputPath);
        const outputPath = inputPath.replace(/\.md$/, '.compressed.md');
        fs.writeFileSync(outputPath, result.compressed);
        
        return {
            success: true,
            message: `✅ **File Compressed Successfully**\n\n` +
                    `📄 **File:** ${filename}\n` +
                    `📊 **Original:** ${result.originalTokens} tokens\n` +
                    `🗜️ **Compressed:** ${result.compressedTokens} tokens\n` +
                    `💾 **Savings:** ${result.savings}%\n\n` +
                    `💾 **Saved to:** ${path.basename(outputPath)}`,
            data: result
        };
    }

    async previewCommand(args, workspacePath, context) {
        const filename = args[0] || 'all';
        
        if (filename === 'all') {
            const previews = this.dashboard.generateCompressionPreviews(workspacePath);
            let result = `🔍 **Compression Preview - All Files**\n\n`;
            
            let totalBefore = 0;
            let totalAfter = 0;
            
            previews.forEach(preview => {
                totalBefore += preview.before.tokens;
                totalAfter += preview.after.tokens;
                result += `📄 **${preview.filename}:** ${preview.before.tokens} → ${preview.after.tokens} tokens (${preview.savings}% saved)\n`;
            });
            
            const totalSavings = Math.round(((totalBefore - totalAfter) / totalBefore) * 100);
            result += `\n💾 **Total Savings:** ${totalBefore} → ${totalAfter} tokens (${totalSavings}%)`;
            
            return {
                success: true,
                message: result,
                data: { previews, totalSavings }
            };
        } else {
            const inputPath = path.join(workspacePath, filename);
            if (!fs.existsSync(inputPath)) {
                return {
                    success: false,
                    message: `❌ File not found: ${filename}`
                };
            }
            
            const preview = this.compressor.generateCompressionPreview(inputPath);
            
            let result = `🔍 **Compression Preview - ${preview.filename}**\n\n`;
            result += `**BEFORE (${preview.before.tokens} tokens):**\n`;
            result += `\`\`\`\n${preview.before.content}\n\`\`\`\n\n`;
            result += `**AFTER (${preview.after.tokens} tokens):**\n`;
            result += `\`\`\`\n${preview.after.content}\n\`\`\`\n\n`;
            result += `💾 **Savings:** ${preview.savings}%`;
            
            return {
                success: true,
                message: result,
                data: preview
            };
        }
    }

    async applyCommand(args, workspacePath, context) {
        const confirmFlag = args.includes('--confirm');
        
        if (!confirmFlag) {
            return {
                success: false,
                message: `⚠️ **Apply Optimizations**\n\n` +
                        `This will replace your workspace files with compressed versions.\n` +
                        `**Original files will be backed up** with \`.backup\` extension.\n\n` +
                        `To proceed, run: \`/optimize apply --confirm\``
            };
        }
        
        const analysis = await this.analyzer.analyzeWorkspace(workspacePath);
        const results = [];
        let totalSaved = 0;
        
        for (const [filename, data] of Object.entries(analysis.files)) {
            if (data.compressionPotential > 20) { // Only compress if significant savings
                const inputPath = path.join(workspacePath, filename);
                const backupPath = inputPath + '.backup';
                
                // Backup original
                fs.copyFileSync(inputPath, backupPath);
                
                // Compress and replace
                const result = this.compressor.compressFile(inputPath);
                fs.writeFileSync(inputPath, result.compressed);
                
                results.push({
                    filename,
                    savings: result.savings,
                    tokensSaved: result.originalTokens - result.compressedTokens
                });
                
                totalSaved += result.originalTokens - result.compressedTokens;
            }
        }
        
        let message = `✅ **Optimization Applied Successfully**\n\n`;
        message += `📁 **Files Optimized:**\n`;
        
        results.forEach(r => {
            message += `   • ${r.filename}: ${r.savings}% saved (${r.tokensSaved} tokens)\n`;
        });
        
        message += `\n💾 **Total Tokens Saved:** ${totalSaved}\n`;
        message += `💰 **Estimated Monthly Savings:** $${(totalSaved * 0.003 * 4.33).toFixed(2)}\n\n`;
        message += `🛡️ **Backups created** with \`.backup\` extension`;
        
        return {
            success: true,
            message: message,
            data: { results, totalSaved }
        };
    }

    async dashboardCommand(args, workspacePath, context) {
        const format = args[0] || 'text';
        
        if (format === 'html') {
            const dashboard = await this.dashboard.generateFullReport(workspacePath);
            const htmlPath = path.join(workspacePath, 'token-optimizer-dashboard.html');
            this.dashboard.exportHtmlDashboard(dashboard, htmlPath);
            
            return {
                success: true,
                message: `📊 **Interactive Dashboard Created**\n\n` +
                        `🌐 **HTML Report:** \`${path.basename(htmlPath)}\`\n` +
                        `Open in your browser for interactive charts and detailed analysis.`,
                data: { htmlPath, dashboard }
            };
        } else {
            // Capture console output for text dashboard
            let output = '';
            const originalConsoleLog = console.log;
            console.log = (...args) => {
                output += args.join(' ') + '\n';
            };
            
            await this.dashboard.generateFullReport(workspacePath);
            console.log = originalConsoleLog;
            
            return {
                success: true,
                message: `\`\`\`\n${output}\n\`\`\``,
                data: { output }
            };
        }
    }

    async templatesCommand(args, workspacePath, context) {
        const templateType = args[0];
        const templatesDir = path.join(__dirname, 'templates');
        
        if (!templateType) {
            // List available templates
            const templates = fs.readdirSync(templatesDir)
                .filter(f => f.endsWith('.md'))
                .map(f => f.replace('.md', ''));
            
            let message = `📚 **Available AI Language Templates**\n\n`;
            templates.forEach(template => {
                message += `• \`${template}\` - Use: \`/optimize templates ${template}\`\n`;
            });
            
            return {
                success: true,
                message: message,
                data: { templates }
            };
        } else {
            const templatePath = path.join(templatesDir, `${templateType}.md`);
            if (!fs.existsSync(templatePath)) {
                return {
                    success: false,
                    message: `❌ Template not found: ${templateType}`
                };
            }
            
            const content = fs.readFileSync(templatePath, 'utf8');
            
            return {
                success: true,
                message: content,
                data: { templateType, content }
            };
        }
    }

    async modelsCommand(args, workspacePath, context) {
        const analysis = await this.analyzer.analyzeWorkspace(workspacePath);
        const currentModel = this.analyzer.detectCurrentModel();
        const modelComparisons = this.analyzer.calculateModelSavings(analysis, currentModel);
        
        let result = `🤖 **Model Usage & Cost Analysis**\n\n`;
        result += `**Current Model:** ${this.analyzer.getModelDisplayName(currentModel)}\n`;
        const monthlyCost = this.analyzer.calculateMonthlyCosts(analysis, 7, currentModel);
        result += `**Current Monthly Cost:** $${monthlyCost?.monthly?.toFixed(2) || 'Unknown'}\n\n`;
        
        result += `**💰 Cost Comparison (per month):**\n`;
        modelComparisons.forEach(comparison => {
            const emoji = comparison.monthlySavings > 0 ? '💚' : comparison.monthlySavings < 0 ? '🔴' : '⚪';
            const sign = comparison.monthlySavings > 0 ? '+' : '';
            result += `${emoji} **${this.analyzer.getModelDisplayName(comparison.toModel)}:** `;
            result += `$${comparison.toModelCost.toFixed(2)} (${sign}$${comparison.monthlySavings.toFixed(2)})\n`;
        });
        
        result += `\n**🎯 Recommended Model Strategy:**\n`;
        result += `• **Main sessions:** Claude Sonnet (balance of cost/quality)\n`;
        result += `• **Background/cron jobs:** Gemini Pro (nearly free)\n`;
        result += `• **Complex reasoning:** Claude Opus (spawn sub-agent only when needed)\n\n`;
        
        result += `💡 **To switch default model:** Edit your OpenClaw config's \`agents.defaults.model.primary\``;
        
        return {
            success: true,
            message: result,
            data: { currentModel, modelComparisons, analysis }
        };
    }

    async revertCommand(args, workspacePath, context) {
        const target = args[0]; // 'all' or specific filename
        
        if (!target) {
            return {
                success: false,
                message: `❌ **Revert Optimizations**\n\n` +
                        `Specify what to revert:\n` +
                        `• \`/optimize revert all\` - Restore all backed up files\n` +
                        `• \`/optimize revert [filename]\` - Restore specific file\n` +
                        `• \`/optimize revert --list\` - Show available backups`
            };
        }
        
        if (args.includes('--list')) {
            const backups = this.findBackupFiles(workspacePath);
            if (backups.length === 0) {
                return {
                    success: true,
                    message: `📁 **Available Backups:** None found\n\nNo .backup files detected in workspace.`
                };
            }
            
            let result = `📁 **Available Backups:**\n\n`;
            backups.forEach(backup => {
                const original = backup.replace('.backup', '');
                const stats = fs.statSync(backup);
                result += `• ${path.basename(original)} (backed up: ${stats.mtime.toLocaleString()})\n`;
            });
            
            return {
                success: true,
                message: result,
                data: { backups }
            };
        }
        
        const reverted = [];
        
        if (target === 'all') {
            const backups = this.findBackupFiles(workspacePath);
            backups.forEach(backupPath => {
                const originalPath = backupPath.replace('.backup', '');
                fs.copyFileSync(backupPath, originalPath);
                fs.unlinkSync(backupPath); // Remove backup after successful restore
                reverted.push(path.basename(originalPath));
            });
        } else {
            const backupPath = path.join(workspacePath, `${target}.backup`);
            const originalPath = path.join(workspacePath, target);
            
            if (!fs.existsSync(backupPath)) {
                return {
                    success: false,
                    message: `❌ Backup not found: ${target}.backup`
                };
            }
            
            fs.copyFileSync(backupPath, originalPath);
            fs.unlinkSync(backupPath);
            reverted.push(target);
        }
        
        let message = `✅ **Files Reverted Successfully**\n\n`;
        message += `📁 **Restored:**\n`;
        reverted.forEach(file => {
            message += `   • ${file}\n`;
        });
        message += `\n🗑️ **Backup files removed** (originals restored)`;
        
        return {
            success: true,
            message: message,
            data: { reverted }
        };
    }

    findBackupFiles(workspacePath) {
        const files = fs.readdirSync(workspacePath);
        return files
            .filter(file => file.endsWith('.backup'))
            .map(file => path.join(workspacePath, file));
    }

    async menuCommand(args, workspacePath, context) {
        const menu = `🎛️ **Token Optimizer - Interactive Menu**

**🔍 Analysis Commands:**
• \`/optimize analyze\` - See token usage breakdown and costs
• \`/optimize models\` - Compare models and get switching recommendations

**⚡ Quick Actions:**  
• \`/optimize preview all\` - Preview potential savings across all files
• \`/optimize compress [filename]\` - Compress single file with backup

**🛡️ Safe Operations:**
• \`/optimize apply --confirm\` - Apply all optimizations (auto-backup)
• \`/optimize revert all\` - Restore all files from backups
• \`/optimize revert --list\` - Show available backup files

**📊 Visualization:**
• \`/optimize dashboard\` - Text-based cost breakdown  
• \`/optimize dashboard html\` - Interactive charts in browser

**📚 Learning:**
• \`/optimize templates\` - Browse AI language compression patterns
• \`/optimize help\` - Full command reference

**💡 New to token optimization?** Start with: \`/optimize analyze\``;

        return {
            success: true,
            message: menu
        };
    }

    async helpCommand() {
        const help = `🚀 **Token Optimizer Skill**

**Commands:**
• \`/optimize menu\` - Interactive command menu (START HERE!)
• \`/optimize analyze\` - Analyze current token usage and costs
• \`/optimize models\` - Compare models and switching recommendations
• \`/optimize compress [file]\` - Compress a specific file using AI notation  
• \`/optimize preview [file|all]\` - Preview compression results
• \`/optimize apply --confirm\` - Apply optimizations (creates backups)
• \`/optimize revert [all|file]\` - Restore from backups
• \`/optimize dashboard [html]\` - Generate cost analysis dashboard
• \`/optimize templates [type]\` - Browse AI language templates

**Features:**
✅ Analyze workspace token usage & model costs
✅ Convert files to AI-efficient notation  
✅ Model switching recommendations for max savings
✅ Visual cost projections and savings
✅ Template library for proven patterns
✅ Safe application with automatic backups
✅ One-click revert functionality

**Typical Savings:** 60-80% token reduction while preserving full meaning

**👆 TIP:** Run \`/optimize menu\` for an interactive guide!`;

        return {
            success: true,
            message: help
        };
    }
}

// CLI usage
if (require.main === module) {
    const skill = new TokenOptimizerSkill();
    
    const command = process.argv[2] || 'menu';
    const args = process.argv.slice(3);
    
    let workspacePath = process.cwd();
    // If we're in the skills subdirectory, go up to workspace root
    if (workspacePath.includes('skills' + path.sep + 'token-optimizer')) {
        workspacePath = path.resolve(workspacePath, '..', '..');
    }
    
    const context = { workspace: workspacePath };
    
    skill.handleCommand(command, args, context).then(result => {
        console.log(result.message);
        if (!result.success) {
            process.exit(1);
        }
    });
}

module.exports = { TokenOptimizerSkill };