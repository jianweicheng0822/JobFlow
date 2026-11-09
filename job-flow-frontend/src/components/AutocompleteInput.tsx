import { useState, useRef, useEffect } from 'react';
import { matchesSuggestion } from '../utils/suggestions';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  // Extra search terms per suggestion, e.g. { '北京': ['beijing'] }
  aliases?: Record<string, string[]>;
  placeholder?: string;
  className?: string;
}

const MAX_VISIBLE = 8;

export default function AutocompleteInput({
  value,
  onChange,
  suggestions,
  aliases,
  placeholder,
  className = 'app-form-input',
}: AutocompleteInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = suggestions.filter((s) => matchesSuggestion(s, value, aliases));

  const visible = filtered.slice(0, MAX_VISIBLE);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        className={className}
        style={{ width: '100%', boxSizing: 'border-box' }}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={(e) => {
          // First Escape closes the suggestions, not the whole modal
          if (e.key === 'Escape' && showDropdown && visible.length > 0) {
            e.preventDefault();
            setShowDropdown(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDropdown && visible.length > 0 && (
        <div className="autocomplete-dropdown">
          {visible.map((item) => (
            <div
              key={item}
              className="autocomplete-dropdown-item"
              onMouseDown={() => {
                onChange(item);
                setShowDropdown(false);
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
