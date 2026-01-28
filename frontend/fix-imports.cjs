const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
        } else if (filePath.match(/\.(ts|tsx)$/)) {
            arrayOfFiles.push(filePath);
        }
    });

    return arrayOfFiles;
}

const typeNames = [
    'Teacher', 'Lesson', 'ScheduleGrid', 'TeacherAllocation',
    'ClassId', 'SubjectName', 'Turma', 'Ano'
];

const valueNames = [
    'SUBJECTS', 'WEEKDAYS', 'TIMESLOTS', 'ALL_CLASSES'
];

function fixImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Pattern: import { A, B, C } from '...types'
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*(['"].*types['"])/g;

    content = content.replace(importRegex, (match, imports, fromPath) => {
        const items = imports.split(',').map(i => i.trim());
        const types = [];
        const values = [];

        items.forEach(item => {
            // Ignore empty items from split
            if (!item) return;

            if (typeNames.includes(item)) {
                types.push(item);
            } else if (valueNames.includes(item)) {
                values.push(item);
            } else {
                // Se não sabemos, assume que é tipo
                types.push(item);
            }
        });

        if (types.length === 0 && values.length > 0) {
            // Só valores
            return `import { ${values.join(', ')} } from ${fromPath}`;
        } else if (types.length > 0 && values.length === 0) {
            // Só tipos
            modified = true;
            return `import type { ${types.join(', ')} } from ${fromPath}`;
        } else if (types.length > 0 && values.length > 0) {
            // Ambos - separar em duas linhas
            modified = true;
            return `import type { ${types.join(', ')} } from ${fromPath};\nimport { ${values.join(', ')} } from ${fromPath}`;
        }

        return match;
    });

    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed: ${filePath}`);
    }
}

// Executar
const srcPath = path.join(__dirname, 'src');
const files = getAllFiles(srcPath);

console.log(`🔍 Analisando ${files.length} arquivos...`);
files.forEach(fixImports);
console.log('✅ Concluído!');
