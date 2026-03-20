import React, { useEffect, useMemo, useRef, useState } from "react";

function buildOptionSearchText(option) {
  return [
    option?.fileName,
    option?.label,
    option?.scenario,
    option?.recordId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function TypeaheadDropdown({
  label,
  options,
  value,
  onChange,
  fieldClassName = "field",
  style,
}) {
  const rootRef = useRef(null);
  const selectedOption = options.find((option) => option.fileName === value) ?? null;
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    setQuery(selectedOption ? `${selectedOption.fileName} · ${selectedOption.label}` : "");
  }, [selectedOption]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options.slice(0, 50);
    return options
      .filter((option) => buildOptionSearchText(option).includes(normalizedQuery))
      .slice(0, 50);
  }, [normalizedQuery, options]);

  return (
    <label className={fieldClassName} style={style}>
      <span>{label}</span>
      <div className="typeahead" ref={rootRef}>
        <input
          className="typeahead-input"
          onBlur={() => {
            if (selectedOption) {
              setQuery(`${selectedOption.fileName} · ${selectedOption.label}`);
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedOption ? "" : label}
          type="text"
          value={query}
        />
        {isOpen ? (
          <div className="typeahead-menu">
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  key={option.fileName}
                  className={`typeahead-option ${option.fileName === value ? "active" : ""}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange(option.fileName);
                    setQuery(`${option.fileName} · ${option.label}`);
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  <span className="typeahead-option-label">{option.label}</span>
                  <span className="typeahead-option-meta">
                    {option.scenario || "--"} · {option.fileName}
                  </span>
                </button>
              ))
            ) : (
              <div className="typeahead-empty">No matches</div>
            )}
          </div>
        ) : null}
      </div>
    </label>
  );
}
