import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { substituteVariables } from '../../services/variableParser';
import { validatePromptContent } from '../../services/securityService';

interface LivePreviewProps {
  content: string;
  variables: Record<string, string>;
  className?: string;
}

export function LivePreview({ content, variables = {}, className = '' }: LivePreviewProps) {
  const [processedContent, setProcessedContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Process content with debouncing
  useEffect(() => {
    setIsProcessing(true);
    
    const timer = setTimeout(() => {
      try {
        // Substitute variables
        const substituted = substituteVariables(content, variables);
        
        // Validate security (just check for HTML/script content)
        const validation = validatePromptContent(substituted);
        if (!validation.isValid) {
          console.warn('Content validation warnings:', validation.errors);
        }
        
        setProcessedContent(validation.sanitizedContent);
      } catch (error) {
        console.error('Error processing content:', error);
        setProcessedContent('Error processing content');
      } finally {
        setIsProcessing(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [content, variables]);

  return (
    <div className={`relative ${className}`}>
      {isProcessing && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
          Processing...
        </div>
      )}
      
      <div className="h-full overflow-auto p-4 bg-white prose prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={{
            // Custom component for undefined variables
            code: ({ node, className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match;
              
              // Highlight undefined variables in red
              if (isInline && typeof children === 'string' && children.match(/^«\w+»$/)) {
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
            pre: ({ node, children, ...props }) => (
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
            a: ({ node, href, children, ...props }) => (
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
            table: ({ node, children, ...props }) => (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300" {...props}>
                  {children}
                </table>
              </div>
            ),
            th: ({ node, children, ...props }) => (
              <th className="border border-gray-300 bg-gray-50 px-4 py-2 text-left font-semibold" {...props}>
                {children}
              </th>
            ),
            td: ({ node, children, ...props }) => (
              <td className="border border-gray-300 px-4 py-2" {...props}>
                {children}
              </td>
            ),
            // Style blockquotes
            blockquote: ({ node, children, ...props }) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4" {...props}>
                {children}
              </blockquote>
            )
          }}
        >
          {processedContent || '*No content to preview*'}
        </ReactMarkdown>
      </div>
    </div>
  );
}

