export interface SkillMetadata {
    name: string;
    description: string; // AI sẽ đọc cái này để quyết định có chọn hay không
    keywords: string[];  // Dùng để fallback hoặc hỗ trợ lọc nhanh
}

export const SKILL_REGISTRY: SkillMetadata[] = [
    {
        name: 'file_operation',
        description: 'Đọc, ghi, sửa, xóa file và tạo thư mục. Dùng khi cần thao tác trực tiếp với mã nguồn hoặc dữ liệu cục bộ.',
        keywords: ['file', 'read', 'write', 'edit', 'save', 'delete', 'mkdir']
    },
    {
        name: 'read_structure',
        description: 'Xem danh sách file và cấu trúc thư mục project. Dùng để khám phá dự án trước khi sửa code.',
        keywords: ['ls', 'tree', 'directory', 'folder', 'structure']
    },
    {
        name: 'web_search',
        description: 'Tra cứu thông tin mới nhất trên Internet, thư viện, hoặc lỗi kỹ thuật.',
        keywords: ['search', 'google', 'brave', 'internet', 'news']
    },
    {
        name: 'search_grep',
        description: 'Tìm kiếm chuỗi văn bản hoặc code cụ thể bên trong đống file hỗn độn.',
        keywords: ['grep', 'find text', 'search inside']
    }
];