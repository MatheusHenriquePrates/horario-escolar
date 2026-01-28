import type { ClassId, Lesson } from '../../types';
import { TIMESLOTS, WEEKDAYS } from '../../types';
import { useScheduleStore } from '../../hooks/useScheduleStore';

interface ScheduleGridProps {
    viewMode: 'class' | 'teacher';
    targetId: string; // ClassId or TeacherId
    onCellClick: (day: number, slot: number, classId: string, currentLesson: Lesson | null) => void;
}

export function ScheduleGridDisplay({ viewMode, targetId, onCellClick }: ScheduleGridProps) {
    const { schedule, teachers } = useScheduleStore();

    const getCellContent = (day: number, slot: number): Lesson | null => {
        if (viewMode === 'class') {
            const classId = targetId as ClassId;
            return schedule[day]?.[slot]?.[classId] || null;
        } else {
            // Find lesson where teacherId matches targetId
            const classesAtSlot = schedule[day]?.[slot];
            if (!classesAtSlot) return null;

            for (const [, lesson] of Object.entries(classesAtSlot)) {
                if (lesson && lesson.teacherId === targetId) {
                    return lesson;
                }
            }
            return null;
        }
    };

    const getTeacherName = (tId: string) => teachers.find(t => t.id === tId)?.name || "N/A";
    const getTeacherColor = (tId: string) => teachers.find(t => t.id === tId)?.color || "#ddd";

    return (
        <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-100 w-32 border-b border-gray-300">
                            Horário
                        </th>
                        {WEEKDAYS.map((day) => (
                            <th key={day} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5 border-b border-gray-300">
                                {day}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {TIMESLOTS.map((slot, index) => {
                        if (slot.type === 'break') {
                            const isAlmoco = slot.id === 'almoco';
                            const isRecreio = slot.id === 'recreio';

                            return (
                                <tr key={slot.id} className={isAlmoco ? 'bg-green-100' : 'bg-amber-100'}>
                                    <td className={`px-3 py-2 text-center font-bold border-r border-gray-300 sticky left-0 ${isAlmoco ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                        <div className="text-xs">{slot.name}</div>
                                        <div className="text-[10px] font-normal">{slot.label.split(' - ')[0]} - {slot.label.split(' - ')[1]}</div>
                                    </td>
                                    <td colSpan={5} className={`px-3 py-1 text-center text-sm font-bold tracking-widest border-t border-b border-gray-300 ${isAlmoco ? 'text-green-700' : 'text-amber-700'}`}>
                                        {isAlmoco ? '🍽️ ALMOÇO 🍽️' : (isRecreio ? '☕ RECREIO ☕' : '🥪 LANCHE 🥪')}
                                    </td>
                                </tr>
                            );
                        }

                        // It's a lesson slot
                        const slotIdx = slot.id as number;

                        return (
                            <tr key={slot.id}>
                                <td className="px-3 py-4 text-xs font-bold text-gray-500 border-r border-gray-200 sticky left-0 bg-white">
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <span>{slot.name}</span>
                                        <span className="text-[10px] font-normal mt-1">{slot.label}</span>
                                        {/* @ts-ignore */}
                                        <span className="text-[9px] text-gray-400 mt-0.5 uppercase">{slot.periodo}</span>
                                    </div>
                                </td>
                                {WEEKDAYS.map((_, dayIdx) => {
                                    // SEXTA-FEIRA (index 4) só tem 6 aulas (ids 0-5)
                                    // Então slot 6 deve ser bloqueado na sexta
                                    const isFriday = dayIdx === 4;
                                    const isBlockedSlot = isFriday && slotIdx >= 6; // Slot id 6 is 7th lesson

                                    if (isBlockedSlot) {
                                        return (
                                            <td key={dayIdx} className="px-2 py-2 border-r border-gray-100 h-24 bg-gray-100/50">
                                                <div className="h-full w-full flex items-center justify-center text-xs text-gray-300 select-none">
                                                    —
                                                </div>
                                            </td>
                                        );
                                    }

                                    const lesson = getCellContent(dayIdx, slotIdx);

                                    return (
                                        <td key={dayIdx} className="px-2 py-2 border-r border-gray-100 h-24 align-top relative hover:bg-gray-50 transition-colors group">
                                            {lesson ? (
                                                <div
                                                    className="h-full rounded p-2 flex flex-col justify-between shadow-sm cursor-pointer hover:shadow-md transition-all"
                                                    style={{ backgroundColor: viewMode === 'class' ? getTeacherColor(lesson.teacherId) + '40' : '#e0f2fe' }}
                                                    onClick={() => onCellClick(dayIdx, slotIdx, viewMode === 'class' ? targetId : lesson.classId, lesson)}
                                                >
                                                    <div className="font-bold text-sm text-gray-900 leading-tight">
                                                        {lesson.subject}
                                                    </div>
                                                    <div className="text-xs text-gray-600 mt-1">
                                                        {viewMode === 'class' ? getTeacherName(lesson.teacherId) : `${lesson.classId} (${lesson.classId.substring(0, 1)}º ${lesson.classId.substring(1)})`}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="h-full w-full flex items-center justify-center text-xs text-gray-300 hover:bg-gray-100 cursor-pointer rounded"
                                                    onClick={() => viewMode === 'class' && onCellClick(dayIdx, slotIdx, targetId, null)}
                                                >
                                                    -
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
