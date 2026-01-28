import { useState } from 'react';
import { ALL_CLASSES } from '../../types';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ClassesFilterProps {
    selectedClasses: string[];
    onChange: (classes: string[]) => void;
    subjectName?: string;
}

export function ClassesFilter({ selectedClasses, onChange, subjectName }: ClassesFilterProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Agrupar turmas por ano
    const classesByYear = {
        '6': ALL_CLASSES.filter(c => c.startsWith('6')),
        '7': ALL_CLASSES.filter(c => c.startsWith('7')),
        '8': ALL_CLASSES.filter(c => c.startsWith('8')),
        '9': ALL_CLASSES.filter(c => c.startsWith('9')),
    };

    const handleToggleYear = (year: string) => {
        const yearClasses = classesByYear[year as keyof typeof classesByYear];
        const allYearSelected = yearClasses.every(c => selectedClasses.includes(c));

        if (allYearSelected) {
            // Desmarcar todas do ano
            onChange(selectedClasses.filter(c => !yearClasses.includes(c)));
        } else {
            // Marcar todas do ano
            const newClasses = [...selectedClasses];
            yearClasses.forEach(c => {
                if (!newClasses.includes(c)) {
                    newClasses.push(c);
                }
            });
            onChange(newClasses);
        }
    };

    const handleToggleClass = (classId: string) => {
        if (selectedClasses.includes(classId)) {
            onChange(selectedClasses.filter(c => c !== classId));
        } else {
            onChange([...selectedClasses, classId]);
        }
    };

    const handleSelectAll = () => {
        if (selectedClasses.length === ALL_CLASSES.length) {
            onChange([]);
        } else {
            onChange([...ALL_CLASSES]);
        }
    };

    const yearIsFullySelected = (year: string) => {
        const yearClasses = classesByYear[year as keyof typeof classesByYear];
        return yearClasses.every(c => selectedClasses.includes(c));
    };

    const yearIsPartiallySelected = (year: string) => {
        const yearClasses = classesByYear[year as keyof typeof classesByYear];
        const selectedCount = yearClasses.filter(c => selectedClasses.includes(c)).length;
        return selectedCount > 0 && selectedCount < yearClasses.length;
    };

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {subjectName ? `Turmas para ${subjectName}` : 'Filtrar Turmas Permitidas'}
                    </span>
                    {selectedClasses.length > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                            {selectedClasses.length} selecionada{selectedClasses.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* Selecionar Todas */}
                    <div className="pb-3 border-b dark:border-gray-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedClasses.length === ALL_CLASSES.length}
                                onChange={handleSelectAll}
                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Selecionar Todas as Turmas
                            </span>
                        </label>
                    </div>

                    {/* Por Ano */}
                    <div className="space-y-3">
                        {Object.entries(classesByYear).map(([year, classes]) => {
                            const isFullySelected = yearIsFullySelected(year);
                            const isPartiallySelected = yearIsPartiallySelected(year);

                            return (
                                <div key={year} className="space-y-2">
                                    {/* Ano Header */}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isFullySelected}
                                            ref={(el) => {
                                                if (el) el.indeterminate = isPartiallySelected && !isFullySelected;
                                            }}
                                            onChange={() => handleToggleYear(year)}
                                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-semibold text-gray-800 dark:text-white">
                                            {year}º Ano ({classes.length} turmas)
                                        </span>
                                    </label>

                                    {/* Turmas do Ano */}
                                    <div className="ml-6 flex flex-wrap gap-2">
                                        {classes.map(classId => (
                                            <label
                                                key={classId}
                                                className={`
                                                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-all
                                                    ${selectedClasses.includes(classId)
                                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600'
                                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                                                    }
                                                `}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedClasses.includes(classId)}
                                                    onChange={() => handleToggleClass(classId)}
                                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    {classId}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Aviso */}
                    {selectedClasses.length === 0 && (
                        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                ⚠️  Nenhuma turma selecionada. O professor poderá dar aula em TODAS as turmas.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
