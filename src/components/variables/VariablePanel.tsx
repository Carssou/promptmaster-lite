import { useState, useEffect } from 'react';
import { Variable, parseVariables, getVariablesWithSources } from '../../services/variableParser';

interface VariablePanelProps {
  content: string;
  variables: Record<string, string>;
  onChange: (variables: Record<string, string>) => void;
  className?: string;
}

export function VariablePanel({ content, variables, onChange, className = '' }: VariablePanelProps) {
  const [detectedVariables, setDetectedVariables] = useState<Variable[]>([]);
  const [showOnlyUsed, setShowOnlyUsed] = useState(true);

  // Update detected variables when content changes
  useEffect(() => {
    const vars = getVariablesWithSources(content, variables);
    setDetectedVariables(vars);
  }, [content, variables]);

  const handleVariableChange = (name: string, value: string) => {
    onChange({
      ...variables,
      [name]: value
    });
  };

  const handleRemoveVariable = (name: string) => {
    const newVariables = { ...variables };
    delete newVariables[name];
    onChange(newVariables);
  };

  const handleAddVariable = () => {
    const name = prompt('Enter variable name:');
    if (name && name.match(/^[a-zA-Z0-9_]+$/)) {
      onChange({
        ...variables,
        [name]: ''
      });
    } else if (name) {
      alert('Variable names must contain only letters, numbers, and underscores');
    }
  };

  const usedVariables = detectedVariables.filter(v => parseVariables(content).includes(v.name));
  // const unusedVariables = detectedVariables.filter(v => !parseVariables(content).includes(v.name));
  const manualVariables = Object.keys(variables).filter(name => 
    !parseVariables(content).includes(name)
  );

  const displayVariables = showOnlyUsed ? usedVariables : detectedVariables;

  return (
    <div className={`bg-gray-50 border-l border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">Preview Variables</h3>
        
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={showOnlyUsed}
              onChange={(e) => setShowOnlyUsed(e.target.checked)}
              className="mr-2"
            />
            Show only used variables
          </label>
          
          <button
            onClick={handleAddVariable}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            + Add Variable
          </button>
        </div>

        {displayVariables.length === 0 ? (
          <p className="text-gray-500 text-sm">No variables detected</p>
        ) : (
          <div className="space-y-3">
            {displayVariables.map((variable) => (
              <VariableInput
                key={variable.name}
                variable={variable}
                value={variables[variable.name] || ''}
                onChange={(value) => handleVariableChange(variable.name, value)}
                onRemove={() => handleRemoveVariable(variable.name)}
                canRemove={variable.source === 'manual'}
              />
            ))}
          </div>
        )}

        {/* Manual variables not used in content */}
        {manualVariables.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-700 mb-2 text-sm">Unused Variables</h4>
            <div className="space-y-2">
              {manualVariables.map((name) => (
                <VariableInput
                  key={name}
                  variable={{ name, value: variables[name], source: 'manual' }}
                  value={variables[name] || ''}
                  onChange={(value) => handleVariableChange(name, value)}
                  onRemove={() => handleRemoveVariable(name)}
                  canRemove={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Variable Statistics */}
      <div className="p-4 bg-gray-100 text-xs text-gray-600">
        <div className="space-y-1">
          <div>Variables found: {usedVariables.length}</div>
          <div>User defined: {Object.keys(variables).length}</div>
        </div>
      </div>
    </div>
  );
}

interface VariableInputProps {
  variable: Variable;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function VariableInput({ variable, value, onChange, onRemove, canRemove }: VariableInputProps) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleBlur = () => {
    onChange(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  const getSourceBadge = () => {
    switch (variable.source) {
      case 'manual':
        return <span className="text-blue-600 text-xs">Defined</span>;
      case 'fallback':
        return <span className="text-red-600 text-xs">Undefined</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm text-gray-900">{variable.name}</span>
          {getSourceBadge()}
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-red-600 hover:text-red-800 text-xs"
            title="Remove variable"
          >
            ×
          </button>
        )}
      </div>
      
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Enter value..."
        className="w-full px-2 py-1 border rounded text-sm bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}