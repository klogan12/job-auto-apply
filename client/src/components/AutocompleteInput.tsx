import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Loader2 } from "lucide-react";

interface AutocompleteInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  getSuggestions: (query: string) => string[];
  onApiSearch?: (query: string) => Promise<string[]>;
  disabled?: boolean;
  className?: string;
}

export function AutocompleteInput({
  placeholder,
  value,
  onChange,
  onAdd,
  getSuggestions,
  onApiSearch,
  disabled = false,
  className,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get suggestions when value changes
  const updateSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // First, get local suggestions
    const localSuggestions = getSuggestions(query);
    setSuggestions(localSuggestions);
    setIsOpen(localSuggestions.length > 0);
    setSelectedIndex(-1);

    // If we have few local results and API search is available, try API
    if (onApiSearch && localSuggestions.length < 5) {
      setIsLoading(true);
      try {
        const apiSuggestions = await onApiSearch(query);
        // Merge and deduplicate
        const merged = Array.from(new Set([...localSuggestions, ...apiSuggestions]));
        setSuggestions(merged.slice(0, 10));
        setIsOpen(merged.length > 0);
      } catch (error) {
        console.error("API search failed:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [getSuggestions, onApiSearch]);

  // Debounced update
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateSuggestions(value);
    }, 150);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, updateSuggestions]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "Enter") {
        e.preventDefault();
        onAdd();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          onChange(suggestions[selectedIndex]);
          setIsOpen(false);
          setSelectedIndex(-1);
          // Auto-add after selection
          setTimeout(() => onAdd(), 50);
        } else {
          onAdd();
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      case "Tab":
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          onChange(suggestions[selectedIndex]);
          setIsOpen(false);
          setSelectedIndex(-1);
        }
        break;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
    // Auto-add after selection
    setTimeout(() => onAdd(), 50);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="text-violet-400 font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className={cn("relative flex gap-2", className)}>
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 2 && suggestions.length > 0 && setIsOpen(true)}
          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
          disabled={disabled}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        )}
        
        {/* Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                className={cn(
                  "px-3 py-2 cursor-pointer text-sm transition-colors",
                  index === selectedIndex
                    ? "bg-violet-600/30 text-white"
                    : "text-slate-300 hover:bg-slate-700/50"
                )}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {highlightMatch(suggestion, value)}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <Button
        type="button"
        onClick={onAdd}
        variant="outline"
        size="icon"
        className="border-slate-700 hover:bg-slate-800 shrink-0"
        disabled={disabled}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
