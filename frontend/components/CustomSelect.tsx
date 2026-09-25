"use client";

import { useEffect, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  className = "",
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Local keyframes — self-contained */}
      <style jsx global>{`
        @keyframes selectPopIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-select-pop-in {
          animation: selectPopIn 0.15s ease-out both;
          transform-origin: top;
        }
      `}</style>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-lg border border-[#E2DACB] bg-white px-3 py-2 text-sm text-left
                   focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors"
      >
        <span className={selected ? "text-[#2A2420]" : "text-[#8A8175]"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8A8175"
          strokeWidth="2"
          className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-[#E2DACB] shadow-lg overflow-hidden animate-select-pop-in"
        >
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map((o) => {
              const isSelected = o.value === value;
              return (
                <button
                  key={o.value || "__empty__"}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    isSelected
                      ? "bg-[#EAF2EA] text-forest font-medium"
                      : "text-[#2A2420] hover:bg-[#F3F0E8]"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
