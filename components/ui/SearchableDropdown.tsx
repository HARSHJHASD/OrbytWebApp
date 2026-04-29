import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

interface SearchableDropdownProps {
  label?: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string | null;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select an option",
  icon,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt =>
      opt.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full space-y-2 relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-semibold text-slate-300 ml-1">
          {label}
        </label>
      )}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full rounded-2xl border-2 px-4 py-4 flex items-center justify-between cursor-pointer transition-all duration-200
          ${isOpen ? 'border-primary-500 ring-4 ring-primary-500/10 bg-slate-800' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}
          ${error ? 'border-red-500 focus:border-red-500' : ''}
        `}
      >
        <div className="flex items-center gap-3 flex-1">
          {icon && <div className="text-slate-500 shrink-0">{icon}</div>}
          <span className={`text-sm font-medium leading-tight ${value ? 'text-white' : 'text-slate-500'}`}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border-2 border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {search && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-700 rounded-md transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(option);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`
                    px-4 py-3 text-sm cursor-pointer transition-colors flex items-start justify-between gap-3
                    ${value === option ? 'bg-primary-500/10 text-primary-400 font-bold' : 'text-slate-300 hover:bg-slate-800'}
                  `}
                >
                  <span className="flex-1 min-w-0 break-words">{option}</span>
                  {value === option && <Check className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />}
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No professions found
              </div>
            )}
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{error}</p>
      )}
    </div>
  );
};

export default SearchableDropdown;
