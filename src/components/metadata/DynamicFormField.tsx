import React from "react";
import { MetadataFieldSchema } from "../../services/metadataSchema";
import { TagsInput } from "./TagsInput";
import { ModelsMultiSelect } from "./ModelsMultiSelect";
import { CategoryPicker } from "./CategoryPicker";
import { NotesEditor } from "./NotesEditor";
import {
  FileText,
  Hash,
  ToggleLeft,
  List,
  Settings,
  AlignLeft,
  Edit3,
} from "lucide-react";

interface DynamicFormFieldProps {
  field: MetadataFieldSchema;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function DynamicFormField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  className = "",
}: DynamicFormFieldProps) {
  const fieldId = `dynamic-field-${field.key}`;

  const getFieldIcon = () => {
    if (field.icon) {
      // You could implement a dynamic icon resolver here
      return <FileText size={16} className="mr-2" />;
    }

    switch (field.type) {
      case "string":
        return <FileText size={16} className="mr-2" />;
      case "number":
        return <Hash size={16} className="mr-2" />;
      case "boolean":
        return <ToggleLeft size={16} className="mr-2" />;
      case "array":
      case "multiselect":
        return <List size={16} className="mr-2" />;
      case "select":
        return <Settings size={16} className="mr-2" />;
      case "textarea":
        return <AlignLeft size={16} className="mr-2" />;
      case "markdown":
        return <Edit3 size={16} className="mr-2" />;
      default:
        return <FileText size={16} className="mr-2" />;
    }
  };

  const renderField = () => {
    const baseInputClasses = `w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

    switch (field.type) {
      case "string":
        return (
          <input
            id={fieldId}
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseInputClasses}
            aria-describedby={error ? `${fieldId}-error` : undefined}
          />
        );

      case "number":
        return (
          <input
            id={fieldId}
            type="number"
            value={value || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={field.placeholder}
            disabled={disabled}
            min={field.validation?.min}
            max={field.validation?.max}
            className={baseInputClasses}
            aria-describedby={error ? `${fieldId}-error` : undefined}
          />
        );

      case "boolean":
        return (
          <label className="flex items-center space-x-2">
            <input
              id={fieldId}
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              {field.description || "Enable this option"}
            </span>
          </label>
        );

      case "select":
        return (
          <select
            id={fieldId}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={baseInputClasses}
            aria-describedby={error ? `${fieldId}-error` : undefined}
          >
            {field.placeholder && <option value="">{field.placeholder}</option>}
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "textarea":
        return (
          <textarea
            id={fieldId}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={4}
            className={baseInputClasses}
            aria-describedby={error ? `${fieldId}-error` : undefined}
          />
        );

      case "array":
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {(value || []).map((item: any, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {typeof item === "object"
                    ? JSON.stringify(item)
                    : String(item)}
                  <button
                    type="button"
                    onClick={() => {
                      const newArray = [...(value || [])];
                      newArray.splice(index, 1);
                      onChange(newArray);
                    }}
                    disabled={disabled}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder={field.placeholder || "Add item and press Enter"}
              disabled={disabled}
              className={baseInputClasses}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const input = e.target as HTMLInputElement;
                  const newValue = input.value.trim();
                  if (newValue) {
                    onChange([...(value || []), newValue]);
                    input.value = "";
                  }
                }
              }}
            />
          </div>
        );

      case "multiselect":
        // Use existing components for specialized multiselect fields
        if (field.key === "tags") {
          return (
            <TagsInput
              tags={value || []}
              onChange={onChange}
              placeholder={field.placeholder}
              maxTags={field.validation?.max || 10}
              maxTagLength={25}
              error={error}
            />
          );
        }

        if (field.key === "models") {
          return (
            <ModelsMultiSelect
              selectedModels={value || []}
              onChange={onChange}
              placeholder={field.placeholder}
            />
          );
        }

        // Generic multiselect
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {(value || []).map((selectedValue: any, index: number) => {
                const option = field.options?.find(
                  (opt) => opt.value === selectedValue
                );
                return (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                  >
                    {option?.label || String(selectedValue)}
                    <button
                      type="button"
                      onClick={() => {
                        const newArray = [...(value || [])];
                        newArray.splice(index, 1);
                        onChange(newArray);
                      }}
                      disabled={disabled}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
            <select
              value=""
              onChange={(e) => {
                const selectedValue = e.target.value;
                if (selectedValue && !(value || []).includes(selectedValue)) {
                  onChange([...(value || []), selectedValue]);
                }
              }}
              disabled={disabled}
              className={baseInputClasses}
            >
              <option value="">
                {field.placeholder || "Select options..."}
              </option>
              {field.options?.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={(value || []).includes(option.value)}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case "markdown":
        // Use existing NotesEditor for markdown fields
        if (field.key === "notes") {
          return (
            <NotesEditor
              content={value || ""}
              onChange={onChange}
              placeholder={field.placeholder}
            />
          );
        }

        // Generic markdown editor (simplified)
        return (
          <textarea
            id={fieldId}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={6}
            className={baseInputClasses}
            aria-describedby={error ? `${fieldId}-error` : undefined}
          />
        );

      case "object":
        // For now, render as JSON text area
        return (
          <textarea
            id={fieldId}
            value={value ? JSON.stringify(value, null, 2) : ""}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                // Invalid JSON, don't update
              }
            }}
            placeholder={field.placeholder || "Enter JSON object..."}
            disabled={disabled}
            rows={6}
            className={baseInputClasses}
            aria-describedby={error ? `${fieldId}-error` : undefined}
          />
        );

      default:
        return (
          <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded">
            Unknown field type: {field.type}
          </div>
        );
    }
  };

  // Handle special case for category picker
  if (field.key === "categoryPath") {
    return (
      <div className={`space-y-2 ${className}`}>
        <label
          htmlFor={fieldId}
          className="flex items-center text-sm font-medium text-gray-700"
        >
          {getFieldIcon()}
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <CategoryPicker
          categoryPath={value || field.default || "Uncategorized"}
          onChange={onChange}
          placeholder={field.placeholder}
        />
        {error && (
          <p id={`${fieldId}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
        {field.description && !error && (
          <p className="text-xs text-gray-500">{field.description}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor={fieldId}
        className="flex items-center text-sm font-medium text-gray-700"
      >
        {getFieldIcon()}
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
      {field.description && !error && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}
    </div>
  );
}
