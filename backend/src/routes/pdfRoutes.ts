import express from 'express';
import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/gerar', async (req, res) => {
    try {
        console.log('📄 Gerando PDF...');

        // Buscar professores
        const professores = await prisma.teacher.findMany();

        if (!professores || professores.length === 0) {
            return res.status(400).json({
                error: 'Nenhum professor cadastrado. Cadastre professores primeiro.'
            });
        }

        // Buscar grade (última criada)
        const grade = await prisma.schedule.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                lessons: true // Ensure lessons are included if relational
            }
        });

        if (!grade) {
            return res.status(400).json({
                error: 'Nenhuma grade gerada. Clique em "Gerar Horários" primeiro.'
            });
        }

        // Support both JSON stored in 'data' string OR relational 'lessons'
        let lessons: any[] = [];
        if ((grade as any).lessons && (grade as any).lessons.length > 0) {
            lessons = (grade as any).lessons;
        } else if ((grade as any).data) { // Fallback if user uses 'data' field
            try {
                lessons = typeof (grade as any).data === 'string'
                    ? JSON.parse((grade as any).data).lessons
                    : (grade as any).data.lessons;
            } catch (e) { }
        }

        if (!lessons || lessons.length === 0) {
            return res.status(400).json({
                error: 'Grade vazia. Gere os horários primeiro.'
            });
        }

        console.log(`✅ ${lessons.length} aulas encontradas`);

        // Criar PDF
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margin: 30
        });

        // Headers para download
        const dataHoje = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=grade-escolar-${dataHoje}.pdf`);

        // Pipe PDF para response
        doc.pipe(res);

        // ==================== PÁGINA 1: CAPA ====================
        doc.fontSize(32).fillColor('#2563EB').text('HORÁRIO ESCOLAR', 100, 200, {
            align: 'center',
            width: 600
        });
        doc.moveDown();
        doc.fontSize(20).fillColor('#000').text('Ensino Fundamental II', {
            align: 'center',
            width: 600
        });
        doc.fontSize(16).fillColor('#666').text('Tempo Integral', {
            align: 'center',
            width: 600
        });
        doc.moveDown(3);
        doc.fontSize(12).fillColor('#999').text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, {
            align: 'center',
            width: 600
        });
        doc.fontSize(10).text(`Total de professores: ${professores.length}`, {
            align: 'center',
            width: 600
        });
        doc.text(`Total de aulas: ${lessons.length}`, {
            align: 'center',
            width: 600
        });

        // ==================== PÁGINA 2: LEGENDA ====================
        doc.addPage();
        doc.fontSize(20).fillColor('#2563EB').text('Legenda de Professores', 50, 50);
        doc.moveDown(2);

        const CORES = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

        professores.forEach((prof, index) => {
            const cor = CORES[index % CORES.length];
            const y = doc.y;

            // Desenhar círculo
            doc.circle(60, y + 8, 10).fillAndStroke(cor, cor);

            // Nome do professor
            doc.fillColor('#000').fontSize(12).text(prof.name, 80, y + 2);
            doc.moveDown(1.5);
        });

        // ==================== PÁGINAS 3+: GRADES POR TURMA ====================
        const turmas = [
            '6A', '6B', '6C', '6D', '6E',
            '7A', '7B', '7C', '7D', '7E',
            '8A', '8B', '8C', '8D', '8E',
            '9A', '9B', '9C', '9D', '9E'
        ];

        const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
        const horarios = [
            { nome: '1ª Aula', hora: '07:30-08:20', tipo: 'aula', periodo: 0 },
            { nome: '2ª Aula', hora: '08:20-09:10', tipo: 'aula', periodo: 1 },
            { nome: 'RECREIO', hora: '09:10-09:30', tipo: 'intervalo' },
            { nome: '3ª Aula', hora: '09:30-10:20', tipo: 'aula', periodo: 2 },
            { nome: '4ª Aula', hora: '10:20-11:10', tipo: 'aula', periodo: 3 },
            { nome: '5ª Aula', hora: '11:10-12:00', tipo: 'aula', periodo: 4 },
            { nome: 'ALMOÇO', hora: '12:00-13:30', tipo: 'intervalo' },
            { nome: '6ª Aula', hora: '13:30-14:20', tipo: 'aula', periodo: 5 },
            { nome: '7ª Aula', hora: '14:20-15:10', tipo: 'aula', periodo: 6 },
        ];

        turmas.forEach(turma => {
            doc.addPage();

            // Título
            doc.fontSize(22).fillColor('#2563EB').text(`TURMA ${turma}`, 50, 40);
            doc.moveDown();

            // Tabela
            const startX = 40;
            let startY = 90;
            const colWidth = 140;
            const rowHeight = 50;

            // CABEÇALHO
            doc.fontSize(11).fillColor('#FFF');
            doc.rect(startX, startY, 80, rowHeight).fill('#2563EB');
            doc.text('HORÁRIO', startX + 10, startY + 18);

            diasSemana.forEach((dia, i) => {
                doc.rect(startX + 80 + (i * colWidth), startY, colWidth, rowHeight).fill('#2563EB');
                doc.text(dia, startX + 80 + (i * colWidth) + 10, startY + 18);
            });

            startY += rowHeight;

            // LINHAS
            horarios.forEach((slot) => {
                if (slot.tipo === 'intervalo') {
                    // RECREIO/ALMOÇO
                    doc.fontSize(10).fillColor('#000');
                    doc.rect(startX, startY, 80, rowHeight).stroke();
                    doc.text(slot.nome, startX + 10, startY + 15);
                    doc.fontSize(8).text(slot.hora, startX + 10, startY + 28);

                    doc.rect(startX + 80, startY, colWidth * 5, rowHeight).fill('#F3F4F6').stroke();
                    doc.fontSize(12).fillColor('#666').text(slot.nome, startX + 320, startY + 18, { align: 'center' });

                    startY += rowHeight;
                    return;
                }

                // AULA NORMAL
                doc.fontSize(9).fillColor('#000');
                doc.rect(startX, startY, 80, rowHeight).stroke();
                doc.text(slot.nome, startX + 10, startY + 15);
                doc.fontSize(7).text(slot.hora, startX + 10, startY + 28);

                // Colunas dos dias
                diasSemana.forEach((dia, dIndex) => {
                    const x = startX + 80 + (dIndex * colWidth);
                    doc.rect(x, startY, colWidth, rowHeight).stroke();

                    // Buscar aula
                    // Adapt to DB schema: lessons have 'classId' not 'class'
                    // And 'timeSlot' not 'period'
                    const aula = lessons.find((a: any) =>
                        a.classId === turma &&
                        a.day === dIndex &&
                        a.timeSlot === slot.periodo
                    );

                    if (aula) {
                        const professorIndex = professores.findIndex(p => p.id === aula.teacherId);
                        const cor = CORES[professorIndex % CORES.length];

                        // Fundo colorido
                        doc.rect(x, startY, colWidth, rowHeight).fillOpacity(0.15).fill(cor).fillOpacity(1).stroke();

                        // Disciplina
                        doc.fontSize(10).fillColor('#000').font('Helvetica-Bold');
                        doc.text(aula.subject, x + 5, startY + 10, { width: colWidth - 10, align: 'center' });

                        // Professor
                        doc.fontSize(8).fillColor('#555').font('Helvetica');
                        const professor = professores.find(p => p.id === aula.teacherId);
                        doc.text(professor?.name || 'N/A', x + 5, startY + 28, { width: colWidth - 10, align: 'center' });
                    }
                });

                startY += rowHeight;

                // Nova página se acabou espaço
                if (startY > 500) {
                    doc.addPage();
                    startY = 50;
                }
            });
        });

        // Finalizar
        doc.end();
        console.log('✅ PDF gerado com sucesso');

    } catch (error: any) {
        console.error('❌ Erro ao gerar PDF:', error);
        res.status(500).json({
            error: 'Erro ao gerar PDF',
            details: error.message
        });
    }
});

export default router;
