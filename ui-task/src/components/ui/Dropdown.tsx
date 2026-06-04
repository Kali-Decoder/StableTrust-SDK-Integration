"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface DropdownOption {
    value: string;
    label: string;
    icon?: ReactNode;
}

interface DropdownProps {
    options: DropdownOption[];
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    variant?: "primary" | "secondary" | "accent" | "tertiary";
    className?: string;
    disabled?: boolean;
}

export function Dropdown({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    variant = "primary",
    className,
    disabled = false,
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const variants = {
        primary: "bg-[var(--primary)] text-black hover:bg-[#FFC9C9]",
        secondary: "bg-[var(--secondary)] text-black hover:bg-[#D0FAFF]",
        accent: "bg-[var(--accent)] text-black hover:bg-[#FEFFD6]",
        tertiary: "bg-[var(--tertiary)] text-black hover:bg-[#DCD6FF]",
    };

    const handleSelect = (optionValue: string) => {
        onChange?.(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className={twMerge("relative", className)}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={twMerge(
                    "w-full inline-flex items-center justify-between gap-2 px-4 py-3 text-sm font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
                    variants[variant],
                    isOpen && "shadow-[2px_2px_0px_0px_#000] translate-x-[2px] translate-y-[2px]"
                )}
            >
                <span className="flex items-center gap-2">
                    {selectedOption?.icon}
                    <span>{selectedOption?.label || placeholder}</span>
                </span>
                <ChevronDown
                    className={twMerge(
                        "w-4 h-4 transition-transform",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_#000] overflow-hidden">
                    <div className="max-h-60 overflow-auto">
                        {options.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={twMerge(
                                    "w-full text-left px-4 py-3 text-sm font-medium border-b-2 border-black last:border-b-0 flex items-center gap-2 transition-colors cursor-pointer",
                                    value === option.value
                                        ? variants[variant]
                                        : "bg-white text-black hover:bg-gray-100"
                                )}
                            >
                                {option.icon}
                                <span>{option.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
