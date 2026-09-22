import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Select...', disabled = false }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase()) || 
    (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase())) ||
    opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-left text-white focus:border-primary focus:outline-none flex justify-between items-center h-10 disabled:opacity-50"
      >
        <span className="truncate block pr-4">{selectedOption ? selectedOption.label : <span className="text-gray-500">{placeholder}</span>}</span>
        <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl max-h-72 flex flex-col">
          <div className="p-2 border-b border-white/10 shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                className="w-full bg-black/40 rounded px-8 py-1.5 text-sm text-white focus:outline-none focus:border-primary border border-transparent transition-colors"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-sm text-gray-500">No results found</div>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  className={`w-full text-left px-2 py-2 mb-1 rounded text-sm transition-colors flex items-center justify-between ${
                    opt.disabled 
                      ? 'opacity-50 cursor-not-allowed bg-black/20 text-gray-500' 
                      : value === opt.value 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-primary/20 text-gray-300'
                  }`}
                  onClick={() => {
                    if (!opt.disabled) {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }
                  }}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="truncate">{opt.label}</span>
                    {opt.subLabel && <span className="text-[10px] text-gray-500 font-mono truncate">{opt.subLabel}</span>}
                  </div>
                  {value === opt.value && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
