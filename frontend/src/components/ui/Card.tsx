import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps {
    children: ReactNode;
    className?: string;
    title?: string;
    action?: ReactNode;
}

export function Card({ children, className, title, action }: CardProps) {
    return (
        <div className={twMerge("bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden", className)}>
            {(title || action) && (
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50">
                    {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="p-6">{children}</div>
        </div>
    );
}
