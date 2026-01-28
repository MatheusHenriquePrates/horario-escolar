// Paleta de 20 cores distintas para professores
export const CORES_PROFESSORES = [
    '#FF6B6B', // Vermelho
    '#4ECDC4', // Azul turquesa
    '#45B7D1', // Azul claro
    '#FFA07A', // Salmão
    '#98D8C8', // Verde água
    '#F7DC6F', // Amarelo
    '#BB8FCE', // Roxo claro
    '#85C1E2', // Azul céu
    '#F8B739', // Laranja
    '#52B788', // Verde
    '#E63946', // Vermelho escuro
    '#A8DADC', // Azul pastel
    '#F4A261', // Laranja queimado
    '#2A9D8F', // Verde escuro
    '#E9C46A', // Amarelo mostarda
    '#264653', // Azul marinho
    '#E76F51', // Terracota
    '#8AB4F8', // Azul Google
    '#81C995', // Verde menta
    '#F28B82', // Vermelho coral
];

// Função para pegar cor de um professor
export function getCorProfessor(professorNome: string | undefined): string {
    if (!professorNome) return '#ccc';
    // Gerar índice baseado no nome (sempre a mesma cor pro mesmo professor)
    let hash = 0;
    for (let i = 0; i < professorNome.length; i++) {
        hash = professorNome.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % CORES_PROFESSORES.length;
    return CORES_PROFESSORES[index];
}

// Função para deixar a cor mais clara (para o background)
export function lightenColor(hex: string, percent: number = 30): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) + percent));
    const g = Math.min(255, (((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, ((num & 0x0000FF) + percent));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
