import PDFDocument from 'pdfkit';

const WEEKDAYS = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA'];
const TURMAS = [
    '6A', '6B', '6C', '6D', '6E',
    '7A', '7B', '7C', '7D', '7E',
    '8A', '8B', '8C', '8D',
    '9A', '9B', '9C', '9D'
];

const HORARIOS = [
    { slot: 0, nome: '1ª AULA', hora: '07:30 - 08:20' },
    { slot: 1, nome: '2ª AULA', hora: '08:20 - 09:10' },
    { slot: 2, nome: '3ª AULA', hora: '09:30 - 10:20' },
    { slot: 3, nome: '4ª AULA', hora: '10:20 - 11:10' },
    { slot: 4, nome: '5ª AULA', hora: '11:10 - 12:00' },
    { slot: 5, nome: '6ª AULA', hora: '13:30 - 14:20' },
    { slot: 6, nome: '7ª AULA', hora: '14:20 - 15:10' },
];

const SUBJECT_ABBR: Record<string, string> = {
    'Português': 'LP', 'Matemática': 'MT', 'História': 'HIST',
    'Geografia': 'GF', 'Ciências': 'CFB', 'Educação Física': 'EF',
    'Inglês': 'ING', 'Artes': 'ART', 'Educação Digital': 'ED',
    'Educação Financeira': 'EFI', 'Educação Ambiental': 'EA',
    'Ensino Religioso': 'ER', 'Projeto de Vida': 'PV', 'Estudo Orientado': 'EO',
};

interface Teacher {
    id: string;
    name: string;
    color: string;
}

export async function generatePDF(schedule: any, teachers: Teacher[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margins: { top: 20, bottom: 20, left: 20, right: 20 }
        });

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = 841.89;
        const pageHeight = 595.28;
        const margin = 20;

        const getTeacherName = (id: string) => {
            const t = teachers.find(x => x.id === id);
            if (!t) return '';
            const parts = t.name.split(' ');
            return parts[0].substring(0, 8);
        };

        const getAbbr = (s: string) => SUBJECT_ABBR[s] || s.substring(0, 3).toUpperCase();

        // ============================================
        // PÁGINA 1: CAPA
        // ============================================
        doc.rect(0, 0, pageWidth, 80).fill('#2563EB');
        doc.fontSize(32).fillColor('#FFFFFF').font('Helvetica-Bold')
            .text('GRADE DE HORÁRIOS', 0, 25, { align: 'center', width: pageWidth });

        doc.fillColor('#000000');
        doc.fontSize(16).font('Helvetica')
            .text('Ensino Fundamental II - Tempo Integral', 0, 100, { align: 'center', width: pageWidth });

        doc.fontSize(12)
            .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
                0, 130, { align: 'center', width: pageWidth });

        // Lista de professores
        doc.fontSize(14).font('Helvetica-Bold')
            .text('PROFESSORES CADASTRADOS', margin, 180);

        let y = 205;
        teachers.forEach((t, i) => {
            if (y > pageHeight - 40) {
                doc.addPage();
                y = 50;
            }
            doc.fontSize(11).font('Helvetica')
                .text(`${i + 1}. ${t.name}`, margin + 20, y);
            y += 18;
        });

        // Legenda
        const legendX = margin + 350;
        doc.fontSize(14).font('Helvetica-Bold')
            .text('LEGENDA DE DISCIPLINAS', legendX, 180);

        let ly = 205;
        Object.entries(SUBJECT_ABBR).forEach(([nome, sigla]) => {
            doc.fontSize(9).font('Helvetica')
                .text(`${sigla} = ${nome}`, legendX + 20, ly);
            ly += 14;
            if (ly > pageHeight - 40) {
                ly = 50;
            }
        });

        // ============================================
        // PÁGINAS 2-6: UM DIA POR PÁGINA
        // ============================================
        WEEKDAYS.forEach((dia, dayIdx) => {
            doc.addPage();

            const maxSlots = dayIdx === 4 ? 6 : 7;

            // Header colorido
            const headerColor = dayIdx === 4 ? '#EA580C' : '#2563EB';
            doc.rect(0, 0, pageWidth, 50).fill(headerColor);
            doc.fontSize(24).fillColor('#FFFFFF').font('Helvetica-Bold')
                .text(dia, 0, 15, { align: 'center', width: pageWidth });

            if (dayIdx === 4) {
                doc.fontSize(10).font('Helvetica')
                    .text('(Término às 14:20 - Sem 7ª aula)', 0, 38, { align: 'center', width: pageWidth });
            }

            doc.fillColor('#000000');

            // Configuração da tabela
            const tableTop = 60;
            const headerColWidth = 70;
            const availableTableWidth = pageWidth - margin * 2 - headerColWidth;
            const cellWidth = availableTableWidth / TURMAS.length;
            const cellHeight = 55;
            const headerHeight = 25;

            // Desenhar header das turmas
            doc.rect(margin, tableTop, headerColWidth, headerHeight).fill('#374151').stroke('#CBD5E1');
            doc.fontSize(8).fillColor('#FFFFFF').font('Helvetica-Bold')
                .text('HORÁRIO', margin, tableTop + 8, { width: headerColWidth, align: 'center' });

            TURMAS.forEach((turma, i) => {
                const x = margin + headerColWidth + (i * cellWidth);
                const bgColor = turma.startsWith('6') ? '#DBEAFE' :
                    turma.startsWith('7') ? '#D1FAE5' :
                        turma.startsWith('8') ? '#FEF3C7' : '#F3E8FF';
                doc.rect(x, tableTop, cellWidth, headerHeight).fill(bgColor).stroke('#CBD5E1');
                doc.fillColor('#1F2937').fontSize(9).font('Helvetica-Bold')
                    .text(turma, x, tableTop + 8, { width: cellWidth, align: 'center' });
            });

            // Desenhar linhas de horário
            HORARIOS.slice(0, maxSlots).forEach((horario, slotIdx) => {
                const rowY = tableTop + headerHeight + (slotIdx * cellHeight);

                // Adicionar linha de intervalo
                if (slotIdx === 2) {
                    // RECREIO entre 2ª e 3ª
                    // Use a slightly different approach for the break line to not overlap cells too much
                }

                // Coluna do horário
                doc.rect(margin, rowY, headerColWidth, cellHeight).fill('#F3F4F6').stroke('#CBD5E1');
                doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold')
                    .text(horario.nome, margin, rowY + 15, { width: headerColWidth, align: 'center' });
                doc.fontSize(7).font('Helvetica').fillColor('#6B7280')
                    .text(horario.hora, margin, rowY + 30, { width: headerColWidth, align: 'center' });

                // Células das turmas
                TURMAS.forEach((turma, turmaIdx) => {
                    const x = margin + headerColWidth + (turmaIdx * cellWidth);
                    const lesson = schedule[dayIdx]?.[horario.slot]?.[turma];

                    if (lesson) {
                        // Célula com aula
                        doc.rect(x, rowY, cellWidth, cellHeight).fill('#E0F2FE').stroke('#CBD5E1');

                        // Sigla da disciplina
                        doc.fillColor('#1E40AF').fontSize(11).font('Helvetica-Bold')
                            .text(getAbbr(lesson.subject), x, rowY + 12, { width: cellWidth, align: 'center' });

                        // Nome do professor
                        doc.fillColor('#64748B').fontSize(7).font('Helvetica')
                            .text(getTeacherName(lesson.teacherId), x, rowY + 30, { width: cellWidth, align: 'center' });
                    } else {
                        // Célula vazia
                        doc.rect(x, rowY, cellWidth, cellHeight).fill('#FFFFFF').stroke('#E5E7EB');
                    }
                });
            });

            // Se for sexta-feira, marcar a área da 7ª aula como vazia ou explicada
            if (dayIdx === 4) {
                // ... sextas handled by maxSlots slice
            }
        });

        doc.end();
    });
}
