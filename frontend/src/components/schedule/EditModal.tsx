import { useState } from 'react';
import { useScheduleStore } from '../../hooks/useScheduleStore';
import type { SubjectName, Lesson } from '../../types';
import { Button } from '../ui/Button';
import { Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    day: number;
    slot: number;
    classId: string; // The context of the click
    currentLesson: Lesson | null; // The existing lesson if any
}

export function EditModal({ isOpen, onClose, day, slot, classId, currentLesson }: EditModalProps) {
    const { teachers, schedule, setSchedule } = useScheduleStore();
    const [selectedTeacherId, setSelectedTeacherId] = useState(currentLesson?.teacherId || '');
    const [selectedSubject, setSelectedSubject] = useState<string>(currentLesson?.subject || '');

    if (!isOpen) return null;

    const handleSave = () => {
        // 1. Validate inputs
        if (!selectedTeacherId || !selectedSubject) {
            toast.error("Selecione professor e disciplina");
            return;
        }

        // 2. Perform the update
        // We are replacing whatever is at schedule[day][slot][classId] with new lesson
        // TODO: Ideally we re-validate rules here or offering "force" option.
        // For now, we just edit it.

        // We need to construct the new schedule object deeply
        const newSchedule = JSON.parse(JSON.stringify(schedule)); // Deep clone simple way

        if (!newSchedule[day]) newSchedule[day] = {};
        if (!newSchedule[day][slot]) newSchedule[day][slot] = {};

        newSchedule[day][slot][classId] = {
            ...currentLesson,
            id: currentLesson?.id || crypto.randomUUID(),
            teacherId: selectedTeacherId,
            subject: selectedSubject as SubjectName,
            classId,
            day,
            timeSlot: slot
        };

        setSchedule(newSchedule);
        toast.success("Aula atualizada com sucesso");
        onClose();
    };

    const handleRemove = () => {
        if (!confirm("Remover esta aula?")) return;

        const newSchedule = JSON.parse(JSON.stringify(schedule));
        if (newSchedule[day]?.[slot]?.[classId]) {
            delete newSchedule[day][slot][classId];
        }
        setSchedule(newSchedule);
        toast.success("Aula removida");
        onClose();
    };

    const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
    // Filter subjects for the selected teacher from their allocations? 
    // Or allow any subject they teach?
    const teacherSubjects = selectedTeacher
        ? Array.from(new Set(selectedTeacher.allocations.map(a => a.subject)))
        : [];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">
                        Editar Aula: {classId}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Professor</label>
                        <select
                            className="w-full h-10 rounded border border-gray-300 px-3"
                            value={selectedTeacherId}
                            onChange={e => {
                                setSelectedTeacherId(e.target.value);
                                // Reset subject if teacher changes
                                setSelectedSubject('');
                            }}
                        >
                            <option value="">Selecione...</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                        <select
                            className="w-full h-10 rounded border border-gray-300 px-3"
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                            disabled={!selectedTeacherId}
                        >
                            <option value="">Selecione...</option>
                            {teacherSubjects.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 flex justify-between">
                    <Button variant="danger" onClick={handleRemove} disabled={!currentLesson}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                    </Button>
                    <div className="space-x-2">
                        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
