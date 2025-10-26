import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { normalizeHex } from "@/lib/theme-utils";
import { useState, useEffect } from "react";

interface ThemeColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
}

export default function ThemeColorPicker({ label, value, onChange, id }: ThemeColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    
    // Auto-add # if missing
    if (newValue && !newValue.startsWith('#')) {
      newValue = '#' + newValue;
    }
    
    // Validate hex format
    const hexRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
    const valid = hexRegex.test(newValue);
    setIsValid(valid);
    
    if (valid) {
      const normalized = normalizeHex(newValue);
      onChange(normalized);
    }
  };

  const handleColorPickerChange = (newValue: string) => {
    setInputValue(newValue);
    setIsValid(true);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => handleColorPickerChange(e.target.value)}
          className="w-12 h-12 rounded border border-[#E6EDF2] cursor-pointer"
          title="Sélectionner une couleur"
        />
        <Input
          id={id}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="#ffffff"
          className={`font-mono text-sm ${!isValid ? 'border-red-500' : ''}`}
        />
      </div>
      {!isValid && (
        <p className="text-xs text-red-500">
          Format invalide. Utilisez le format HEX (ex: #ffffff)
        </p>
      )}
    </div>
  );
}
