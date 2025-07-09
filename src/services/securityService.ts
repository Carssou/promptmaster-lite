/**
 * Security service for AI prompt content validation
 * AI prompts should only contain: plain text, Markdown, and XML tags
 */

/**
 * Results of security validation
 */
export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedContent: string;
}

/**
 * Validate prompt content - only allow text, Markdown, and XML tags
 */
export function validatePromptContent(content: string): SecurityValidationResult {
  const errors: string[] = [];
  let sanitizedContent = content;

  // Check for HTML tags that aren't XML-style tags
  const htmlTagPattern = /<(?:script|style|iframe|object|embed|form|input|button|link|meta|base|head|html|body)[^>]*>/gi;
  const htmlMatches = content.match(htmlTagPattern);
  if (htmlMatches) {
    errors.push('Prompt contains HTML tags. Only plain text, Markdown, and XML tags are allowed.');
  }

  // Check for JavaScript/script content
  if (content.toLowerCase().includes('javascript:') || content.toLowerCase().includes('vbscript:')) {
    errors.push('Prompt contains script URLs which are not allowed.');
  }

  // Check for data URLs
  if (content.includes('data:')) {
    errors.push('Prompt contains data URLs which are not allowed.');
  }

  // Check for event handlers
  const eventHandlerPattern = /on\w+\s*=/gi;
  if (eventHandlerPattern.test(content)) {
    errors.push('Prompt contains event handlers which are not allowed.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedContent,
  };
}

/**
 * Clean content for logging (just truncate if too long)
 */
export function cleanContentForLogging(content: string): string {
  if (content.length > 500) {
    return content.substring(0, 500) + '... [truncated]';
  }
  return content;
}