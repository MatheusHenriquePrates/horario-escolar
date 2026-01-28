import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Teacher, ScheduleGrid } from '../types';
import { WEEKDAYS, TIMESLOTS, ALL_CLASSES } from '../types';

export const generatePDF = (teachers: Teacher[], schedule: ScheduleGrid) => {
    const doc = new jsPDF();

    // COVER PAGE
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("HORÁRIO ESCOLAR", 105, 100, { align: "center" });

    doc.setFontSize(16);
    doc.text("ENSINO FUNDAMENTAL II", 105, 115, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Tempo Integral", 105, 125, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 105, 280, { align: "center" });

    // CLASS PAGES
    ALL_CLASSES.forEach((classId) => {
        // Check if class has any lessons, if empty maybe skip? No, better show empty grid.
        doc.addPage();

        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text(`TURMA: ${classId.slice(0, 1)}º ANO ${classId.slice(1)}`, 14, 20);

        const tableData = [];

        // Rows: 1..7
        // Cols: Time, Mon, Tue, Wed, Thu, Fri

        // We treat breaks as rows too to match visual grid, or just ignore?
        // User requested: "Tabela igual à visualização (Segunda a Sexta, 1ª a 7ª aula). Células coloridas para RECREIO".

        // Let's flatten slots including breaks
        for (const slot of TIMESLOTS) {
            const row: any[] = [];
            // Col 0: Time
            row.push(`${slot.label}\n${slot.type === 'break' ? slot.name : (Number(slot.id) + 1) + 'ª Aula'}`);

            if (slot.type === 'break') {
                // Spans 5 columns? autoTable supports colSpan in hooks or distinct cells
                // Simplest is to just replicate
                for (let i = 0; i < 5; i++) {
                    row.push(slot.name);
                }
            } else {
                const slotIdx = slot.id as number;
                for (let day = 0; day < 5; day++) {
                    const lesson = schedule[day]?.[slotIdx]?.[classId];
                    if (lesson) {
                        // Find teacher name
                        const tName = teachers.find(t => t.id === lesson.teacherId)?.name || "?";
                        row.push(`${lesson.subject}\n(${tName})`);
                    } else {
                        row.push("-");
                    }
                }
            }
            tableData.push(row);
        }

        autoTable(doc, {
            startY: 30,
            head: [['Horário', ...WEEKDAYS]],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 2, valign: 'middle', halign: 'center' },
            headStyles: { fillColor: [74, 144, 226], textColor: 255 }, // Primary color
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 30 },
            },
            didParseCell: (data) => {
                // Style breaks
                const isBreak = String((data.row.raw as any)[0]).includes("RECREIO") || String((data.row.raw as any)[0]).includes("ALMOÇO") || String((data.row.raw as any)[0]).includes("LANCHE");
                if (isBreak) {
                    data.cell.styles.fillColor = [240, 240, 240];
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [100, 100, 100];
                }
            }
        });
    });

    // TEACHER PAGES
    teachers.forEach((teacher) => {
        doc.addPage();
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text(`PROFESSOR(A): ${teacher.name.toUpperCase()}`, 14, 20);
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Carga Horária: ${teacher.workloadMonthly}h`, 14, 28);

        const tableData = [];
        for (const slot of TIMESLOTS) {
            const row: any[] = [];
            row.push(`${slot.label}\n${slot.type === 'break' ? slot.name : (Number(slot.id) + 1) + 'ª Aula'}`);

            if (slot.type === 'break') {
                for (let i = 0; i < 5; i++) row.push(slot.name);
            } else {
                const slotIdx = slot.id as number;
                for (let day = 0; day < 5; day++) {
                    // Find lesson for this teacher
                    // Inefficient search again, but fine for PDF generation event
                    let foundLesson = null;
                    const classesAtSlot = schedule[day]?.[slotIdx];
                    if (classesAtSlot) {
                        for (const [, l] of Object.entries(classesAtSlot)) {
                            if (l && l.teacherId === teacher.id) {
                                foundLesson = l;
                                break;
                            }
                        }
                    }

                    if (foundLesson) {
                        row.push(`${foundLesson.subject}\n(${foundLesson.classId})`);
                    } else {
                        row.push("-");
                    }
                }
            }
            tableData.push(row);
        }

        autoTable(doc, {
            startY: 35,
            head: [['Horário', ...WEEKDAYS]],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 2, valign: 'middle', halign: 'center' },
            headStyles: { fillColor: [245, 166, 35], textColor: 255 }, // Secondary color
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 30 },
            },
            didParseCell: (data) => {
                const isBreak = String((data.row.raw as any)[0]).includes("RECREIO") || String((data.row.raw as any)[0]).includes("ALMOÇO") || String((data.row.raw as any)[0]).includes("LANCHE");
                if (isBreak) {
                    data.cell.styles.fillColor = [240, 240, 240];
                }
            }
        });

        // Summary
        const totalLessons = teacher.allocations.reduce((acc, a) => acc + (a.classes.length * a.lessonsPerWeek), 0);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Total de Aulas Semanais: ${totalLessons}`, 14, (doc as any).lastAutoTable.finalY + 15);
    });

    doc.save('horario-escolar.pdf');
};
