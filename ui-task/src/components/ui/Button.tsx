import { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: "primary" | "secondary" | "accent" | "tertiary";
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function Button({
    children,
    variant = "primary",
    size = "md",
    className,
    ...props
}: ButtonProps) {
    const baseStyles =
        "inline-flex items-center justify-center neo-button disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-[var(--primary)] text-black hover:bg-[#FFC9C9]",
        secondary: "bg-[var(--secondary)] text-black hover:bg-[#D0FAFF]",
        accent: "bg-[var(--accent)] text-black hover:bg-[#FEFFD6]",
        tertiary: "bg-[var(--tertiary)] text-black hover:bg-[#DCD6FF]",
    };

    const sizes = {
        sm: "px-4 py-2 text-xs rounded-lg",
        md: "px-6 py-3 text-sm rounded-xl",
        lg: "px-8 py-4 text-base rounded-2xl",
    };

    return (
        <button
            className={twMerge(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            {children}
        </button>
    );
}
