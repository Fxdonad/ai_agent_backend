import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { SKILL_REGISTRY } from 'src/skills/registry';

@Injectable()
export class SkillLoaderService {
    private readonly skillsDir = path.join(process.cwd(), 'src/skills');

    /**
     * Cung cấp cho Agent bản danh sách rút gọn để nó "biết mình là ai"
     */
    getCapabilitiesSummary(): string {
        return SKILL_REGISTRY.map(s => `- ${s.name}: ${s.description}`).join('\n');
    }

    /**
     * Logic chọn lọc kỹ năng thông minh
     */
    getRelevantSkills(prompt: string): string {
        const p = prompt.toLowerCase();
        
        // 1. Lọc ra các kỹ năng cần thiết dựa trên Registry
        const selectedSkills = SKILL_REGISTRY.filter(skill => 
            // Check mô tả hoặc từ khóa có liên quan đến yêu cầu không
            skill.keywords.some(k => p.includes(k)) || 
            this.isSemanticallyRelated(p, skill.description)
        ).map(s => s.name);

        // 2. Luôn mặc định load các kỹ năng sinh tồn
        const finalSkills = [...new Set([...selectedSkills, 'read_structure', 'file_operation'])];

        return this.loadSkillsFromFiles(finalSkills);
    }

    private isSemanticallyRelated(prompt: string, description: string): boolean {
        // Sau này có thể dùng Embeddings để so sánh độ tương đồng
        // Hiện tại dùng logic đơn giản là check một vài từ khóa chung của ngành dev
        return false; 
    }

    private loadSkillsFromFiles(names: string[]): string {
        return names.map(name => {
            const filePath = path.join(this.skillsDir, `${name}.md`);
            if (fs.existsSync(filePath)) {
                return `[DETAILED_SKILL_MANUAL: ${name}]\n${fs.readFileSync(filePath, 'utf8')}`;
            }
            return '';
        }).join('\n\n');
    }
}