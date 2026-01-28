import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={twMerge(
                        "flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                        error ? "border-error focus:ring-error" : "",
                        className
                    )}
                    {...props}
                />
                {error && <p className="mt-1 text-sm text-error dark:text-red-400">{error}</p>}
            </div>
        );
    }
);

Input.displayName = "Input";
