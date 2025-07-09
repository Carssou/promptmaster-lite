import { useEffect, useState, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { substituteVariables } from '../../services/variableParser';
import { validatePromptContent } from '../../services/securityService';
import { useDebounce } from '../../hooks/useDebounce';
import { TextSkeleton } from '../ui/Skeleton';

// Cache for security validation to avoid repeated checks
const validationCache = new Map<string, { isValid: boolean; errors: string[]; sanitizedContent: string }>();

// Pre-compiled regex for better performance
const UNDEFINED_VAR_REGEX = /^«\w+»$/;

interface LivePreviewProps {
  content: string;
  variables: Record<string, string>;
  className?: string;
  debounceMs?: number;
}

export function LivePreview({ content, variables = {}, className = '', debounceMs = 200 }: LivePreviewProps) {
  const [processedContent, setProcessedContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Memoize the processing function to avoid recreation
  const processContent = useCallback(async (contentToProcess: string, varsToUse: Record<string, string>) => {
    try {
      // Substitute variables
      const substituted = substituteVariables(contentToProcess, varsToUse);
      
      // Check cache first for security validation
      let validation = validationCache.get(substituted);
      if (!validation) {
        validation = validatePromptContent(substituted);
        validationCache.set(substituted, validation);
        
        // Prevent cache from growing too large
        if (validationCache.size > 50) {
          const firstKey = validationCache.keys().next().value;
          if (firstKey) {
            validationCache.delete(firstKey);
          }
        }
      }
      
      if (!validation.isValid) {
        console.warn('Content validation warnings:', validation.errors);
      }
      
      return validation.sanitizedContent;
    } catch (error) {
      console.error('Error processing content:', error);
      return 'Error processing content';
    }
  }, []);

  // Debounced processing function
  const debouncedProcess = useDebounce(async (contentToProcess: string, varsToUse: Record<string, string>) => {
    setIsProcessing(true);
    const result = await processContent(contentToProcess, varsToUse);
    setProcessedContent(result);
    setIsProcessing(false);
  }, debounceMs);

  // Trigger processing when content or variables change
  useEffect(() => {
    debouncedProcess(content, variables);
  }, [content, variables, debouncedProcess]);

  // Memoize plugins to avoid recreation
  const remarkPlugins = useMemo(() => [remarkGfm], []);
  const rehypePlugins = useMemo(() => [rehypeSanitize], []);

  // Memoize markdown components to avoid recreation
  const markdownComponents = useMemo(() => ({
    // Custom component for undefined variables
    code: ({ node, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;
      
      // Highlight undefined variables in red (using pre-compiled regex)
      if (isInline && typeof children === 'string' && UNDEFINED_VAR_REGEX.test(children)) {
        return (
          <code 
            className="bg-red-100 text-red-800 px-1 py-0.5 rounded font-mono text-sm"
            title="Undefined variable"
            {...props}
          >
            {children}
          </code>
        );
      }
      
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    // Add copy button to code blocks
    pre: ({ node, children, ...props }: any) => (
      <div className="relative group">
        <pre {...props}>{children}</pre>
        <button
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white px-2 py-1 rounded text-xs"
          onClick={() => {
            // Simple fallback for copy functionality
            navigator.clipboard.writeText('Code copied');
          }}
        >
          Copy
        </button>
      </div>
    ),
    // Style links
    a: ({ node, href, children, ...props }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline"
        {...props}
      >
        {children}
      </a>
    ),
    // Style tables
    table: ({ node, children, ...props }: any) => (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300" {...props}>
          {children}
        </table>
      </div>
    ),
    th: ({ node, children, ...props }: any) => (
      <th className="border border-gray-300 bg-gray-50 px-4 py-2 text-left font-semibold" {...props}>
        {children}
      </th>
    ),
    td: ({ node, children, ...props }: any) => (
      <td className="border border-gray-300 px-4 py-2" {...props}>
        {children}
      </td>
    ),
    // Style blockquotes
    blockquote: ({ node, children, ...props }: any) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4" {...props}>
        {children}
      </blockquote>
    )
  }), []);

  return (
    <div className={`relative ${className}`}>
      {isProcessing && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
          Processing...
        </div>
      )}
      
      <div className="h-full overflow-auto p-4 bg-white prose prose-sm max-w-none">
        {isProcessing ? (
          <div className="space-y-4">
            <TextSkeleton lines={8} />
            <div className="border border-gray-200 rounded p-4">
              <TextSkeleton lines={3} />
            </div>
            <TextSkeleton lines={5} />
          </div>
        ) : (
          <ReactMarkdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={markdownComponents}
          >
            {processedContent || '*No content to preview*'}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

