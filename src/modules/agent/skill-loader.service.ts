// src/modules/agent/skill-loader.service.ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SkillLoaderService {
    private readonly skillsDir = path.join(process.cwd(), 'src/skills');

    getRelevantSkills(prompt: string): string {
        const p = prompt.toLowerCase();
        const activeSkills: string[] = [];

        if (p.includes('hỏi') || p.includes('ask') || p.includes('confirm')) activeSkills.push('ask_human');
        if (p.includes('folder') || p.includes('cấu trúc') || p.includes('tree')) activeSkills.push('read_structure');
        if (p.includes('tìm') || p.includes('search') || p.includes('mạng')) activeSkills.push('web_search');
        if (p.includes('nội dung') || p.includes('grep')) activeSkills.push('search_grep');
        if (p.includes('file') || p.includes('đọc') || p.includes('ghi') || p.includes('tạo')) activeSkills.push('file_handle');

        // Nếu không khớp từ khóa nào, load mặc định file_handle và read_structure
        if (activeSkills.length === 0) activeSkills.push('file_handle', 'read_structure');

        return activeSkills
            .map(name => {
                const content = fs.readFileSync(path.join(this.skillsDir, `${name}.md`), 'utf8');
                return `[SKILL: ${name}]\n${content}`;
            })
            .join('\n\n');
    }
}