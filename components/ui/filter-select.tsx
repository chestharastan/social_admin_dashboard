'use client';

import { useEffect, useRef, useState } from 'react';

type Option = { value: string; label: string };

type FilterListboxProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  name?: string;
  ariaLabel?: string;
};

export function FilterListbox({
  options,
  value,
  onChange,
  className = '',
  name,
  ariaLabel,
}: FilterListboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div
      className={`relative w-full sm:w-48 ${isOpen ? 'z-30' : ''} ${className}`}
      ref={containerRef}
    >
      {name && <input name={name} type="hidden" value={value} />}
      <button
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex h-10 w-full items-center justify-between rounded-full border bg-white/80 px-4 text-sm text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition hover:border-[var(--line-strong)] focus-visible:border-[var(--line-strong)] focus-visible:ring-4 focus-visible:ring-black/[0.05] ${
          isOpen
            ? 'border-[#a1a1aa] ring-4 ring-black/[0.05]'
            : 'border-[var(--line)]'
        }`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronIcon rotated={isOpen} />
      </button>

      {isOpen && (
        <div
          className="glass-modal absolute left-0 z-50 mt-2 max-h-72 w-full min-w-[180px] overflow-y-auto overscroll-contain p-1.5"
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                aria-selected={isSelected}
                className={`flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition ${
                  isSelected
                    ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent-strong)]'
                    : 'text-[#59564f] hover:bg-[#f4f2ed] hover:text-[#23221f]'
                }`}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {isSelected && <CheckIcon />}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ rotated }: { rotated: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-[#99958d] transition-transform ${rotated ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-[var(--accent-strong)]" fill="none" viewBox="0 0 24 24">
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
  );
}
