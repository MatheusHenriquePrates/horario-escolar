import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className,
    ...props
}: ButtonProps) {
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
        primary: "bg-primary text-white hover:bg-blue-600 focus:ring-primary dark:bg-primary dark:hover:bg-blue-700",
        secondary: "bg-secondary text-white hover:bg-yellow-600 focus:ring-secondary dark:hover:bg-yellow-700",
        success: "bg-success text-white hover:bg-green-600 focus:ring-success dark:hover:bg-green-700",
        danger: "bg-error text-white hover:bg-red-700 focus:ring-error dark:hover:bg-red-800",
        outline: "border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-gray-500",
        ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300",
    };

    const sizes = {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-lg",
    };

    return (
        <button
            className={twMerge(
                baseStyles,
                variants[variant],
                sizes[size],
                fullWidth ? "w-full" : "",
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}
