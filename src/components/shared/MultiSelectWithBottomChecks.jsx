import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

export default function MultiSelectWithBottomChecks({
  label,
  options,
  value: selected,
  onChange: setSelected,
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (option) =>
      option.toLowerCase().includes(search.toLowerCase()) &&
      !selected.includes(option),
  );

  const handleSelect = (option) => {
    setSelected([...selected, option]);
    setSearch("");
    setOpen(false);
  };

  const removeTag = (option) => {
    setSelected(selected.filter((item) => item !== option));
  };

  return (
    <div className="w-full" ref={dropdownRef}>
      {/* Label */}
      <label className="block text-sm font-medium mb-2">{label}</label>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Select one or multiple"
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Dropdown */}
        {open && filteredOptions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filteredOptions.map((option) => (
              <div
                key={option}
                onClick={() => handleSelect(option)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
              >
                {option}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Tags Below */}
      <div className="flex flex-wrap gap-2 mt-3">
        {selected.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-sm"
          >
            {item}
            <X
              size={14}
              className="cursor-pointer"
              onClick={() => removeTag(item)}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
