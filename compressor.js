#!/usr/bin/env node

/**
 * Token Optimizer - File Compressor
 * Converts workspace files to AI-efficient notation while preserving meaning
 */

const fs = require('fs');
const path = require('path');

class AICompressor {
    constructor() {
        this.compressionPatterns = [
            // Common verbose patterns → compressed equivalents
            { 
                pattern: /When\s+([^,]+),\s*(.+)/gi, 
                replacement: '$1 → $2',
                description: 'Conditional statements'
            },
            {
                pattern: /In order to\s+([^,]+),\s*(.+)/gi,
                replacement: 'GOAL: $1 → $2',
                description: 'Purpose statements'
            },
            {
                pattern: /It is important to\s+(.+)/gi,
                replacement: 'CRITICAL: $1',
                description: 'Importance markers'
            },
            {
                pattern: /You should\s+(.+)/gi,
                replacement: 'DO: $1',
                description: 'Instructions'
            },
            {
                pattern: /Please\s+(.+)/gi,
                replacement: '$1',
                description: 'Remove politeness padding'
            },
            {
                pattern: /\b(very|quite|rather|really|actually|basically|essentially)\s+/gi,
                replacement: '',
                description: 'Remove filler words'
            }
        ];

        this.aiNotationTemplates = {
            business: {
                context: '{{roles: ["$1"], priorities: ["$2"], urgency: "$3"}}',
                status: 'projects: {$1: "$2", $3: "$4"}',
                goals: 'GOALS: [$1] → timeline: $2'
            },
            communication: {
                preferences: '{style: "$1", help: "$2", delegate: "$3"}',
                rules: 'RULES: $1>$2, $3-ready, $4-$5'
            },
            workflow: {
                process: '$1 → $2 → $3 → $4',
                conditional: '$1 ? $2 : $3',
                schedule: 'WHEN: $1 → DO: $2'
            }
        };
    }

    compressFile(inputPath, outputPath = null) {
        if (!fs.existsSync(inputPath)) {
            throw new Error(`File not found: ${inputPath}`);
        }

        const originalContent = fs.readFileSync(inputPath, 'utf8');
        const filename = path.basename(inputPath);
        
        console.log(`🔄 Compressing ${filename}...`);
        
        let compressed = this.applyCompressionRules(originalContent, filename);
        compressed = this.convertToAINotation(compressed, filename);
        
        // Calculate savings
        const originalTokens = this.estimateTokens(originalContent);
        const compressedTokens = this.estimateTokens(compressed);
        const savings = Math.round(((originalTokens - compressedTokens) / originalTokens) * 100);
        
        console.log(`   Original:   ${originalTokens} tokens`);
        console.log(`   Compressed: ${compressedTokens} tokens`);
        console.log(`   Savings:    ${savings}%`);
        
        // Save compressed version
        if (outputPath) {
            fs.writeFileSync(outputPath, compressed);
            console.log(`   Saved to:   ${outputPath}`);
        }
        
        return {
            original: originalContent,
            compressed: compressed,
            originalTokens: originalTokens,
            compressedTokens: compressedTokens,
            savings: savings
        };
    }

    applyCompressionRules(content, filename) {
        let compressed = content;
        
        // Apply general compression patterns
        this.compressionPatterns.forEach(rule => {
            compressed = compressed.replace(rule.pattern, rule.replacement);
        });
        
        // File-specific compression
        if (filename.includes('USER.md')) {
            compressed = this.compressUserFile(compressed);
        } else if (filename.includes('MEMORY.md')) {
            compressed = this.compressMemoryFile(compressed);
        } else if (filename.includes('AGENTS.md')) {
            compressed = this.compressAgentsFile(compressed);
        }
        
        return compressed;
    }

    compressUserFile(content) {
        // Compress business context
        content = content.replace(
            /Senior IT engineer.*Missing Pieces Psychology.*ORO Homes LLC.*/gs,
            'ROLES: IT-eng + COO(MPP) + owner(ORO)\nCONTEXT: day-job + 2businesses, ORO-priority, time-limited'
        );
        
        // Compress problem-solving style
        content = content.replace(
            /Forward momentum.*Select the path that gets closest.*/gs,
            'APPROACH: momentum→brainstorm→optimize→data-backed→simulate-unknowns'
        );
        
        return content;
    }

    compressMemoryFile(content) {
        // Compress preferences section
        content = content.replace(
            /When Ruben greets me in the morning.*Check if there's anything urgent/gs,
            'MORNING: greeting → review(todos,pending,urgent)'
        );
        
        // Compress communication style
        content = content.replace(
            /Direct, practical.*Have research and data ready BEFORE Ruben asks.*/gs,
            'STYLE: direct,practical,proactive\nRULE: research-ready pre-ask, delegate>30s'
        );
        
        return content;
    }

    compressAgentsFile(content) {
        // Compress best practices into rules
        content = content.replace(
            /Ground every claim.*check data, don't assume/gs,
            'PRINCIPLES: ground-claims, express-uncertainty, verify-first, confidence-thresholds'
        );
        
        return content;
    }

    convertToAINotation(content, filename) {
        // Convert lists to structured format
        content = content.replace(/^[\s]*[-•\*]\s*(.+)$/gm, '• $1');
        
        // Convert headers to more compact format
        content = content.replace(/^## (.+)$/gm, '### $1');
        content = content.replace(/^# (.+)$/gm, '## $1');
        
        // Compress long explanations into key-value pairs
        content = content.replace(
            /(.+?): (.{100,}?)(\n|$)/g,
            (match, key, value) => {
                const compressed = value
                    .replace(/\s+/g, ' ')
                    .replace(/\b(the|and|or|but|with|from|into|during|including)\b\s*/gi, '')
                    .substring(0, 50);
                return `${key}: ${compressed}...\n`;
            }
        );
        
        return content;
    }

    generateCompressionPreview(inputPath) {
        const result = this.compressFile(inputPath);
        
        return {
            filename: path.basename(inputPath),
            before: {
                content: result.original.substring(0, 500) + '...',
                tokens: result.originalTokens
            },
            after: {
                content: result.compressed.substring(0, 500) + '...',
                tokens: result.compressedTokens
            },
            savings: result.savings
        };
    }

    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
}

// CLI usage
if (require.main === module) {
    const compressor = new AICompressor();
    
    const command = process.argv[2];
    const inputFile = process.argv[3];
    
    switch(command) {
        case 'compress':
            if (!inputFile) {
                console.log('Usage: node compressor.js compress <input-file> [output-file]');
                process.exit(1);
            }
            const outputFile = process.argv[4] || inputFile.replace(/\.md$/, '.compressed.md');
            compressor.compressFile(inputFile, outputFile);
            break;
            
        case 'preview':
            if (!inputFile) {
                console.log('Usage: node compressor.js preview <input-file>');
                process.exit(1);
            }
            const preview = compressor.generateCompressionPreview(inputFile);
            console.log(`\n📄 ${preview.filename}`);
            console.log(`\nBEFORE (${preview.before.tokens} tokens):`);
            console.log(preview.before.content);
            console.log(`\nAFTER (${preview.after.tokens} tokens):`);
            console.log(preview.after.content);
            console.log(`\n💾 Savings: ${preview.savings}%`);
            break;
            
        default:
            console.log('Usage: node compressor.js [compress|preview] <input-file>');
    }
}

module.exports = { AICompressor };