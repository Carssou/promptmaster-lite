interface ParsedQuery {
  text: string;
  filters: {
    tags?: string[];
    models?: string[];
    category?: string;
  };
  ftsQuery: string;
}

/**
 * Parse search query with filters like:
 * - "tag:marketing prompt ideas"
 * - "model:gpt-4 creative writing"
 * - "category:coding tag:javascript functions"
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const filters: ParsedQuery["filters"] = {};
  let remainingText = query.trim();

  // Extract tag filters: tag:marketing, tag:"social media"
  const tagMatches = remainingText.match(/tag:(?:"([^"]+)"|(\S+))/g);
  if (tagMatches) {
    filters.tags = tagMatches.map((match) => {
      const quoted = match.match(/tag:"([^"]+)"/);
      return quoted ? quoted[1] : match.replace("tag:", "");
    });
    // Remove tag filters from text
    remainingText = remainingText.replace(/tag:(?:"[^"]+"|\S+)/g, "").trim();
  }

  // Extract model filters: model:gpt-4, model:"claude-3"
  const modelMatches = remainingText.match(/model:(?:"([^"]+)"|(\S+))/g);
  if (modelMatches) {
    filters.models = modelMatches.map((match) => {
      const quoted = match.match(/model:"([^"]+)"/);
      return quoted ? quoted[1] : match.replace("model:", "");
    });
    // Remove model filters from text
    remainingText = remainingText.replace(/model:(?:"[^"]+"|\S+)/g, "").trim();
  }

  // Extract category filter: category:coding, category:"data analysis"
  const categoryMatch = remainingText.match(/category:(?:"([^"]+)"|(\S+))/);
  if (categoryMatch) {
    filters.category = categoryMatch[1] || categoryMatch[2];
    // Remove category filter from text
    remainingText = remainingText
      .replace(/category:(?:"[^"]+"|\S+)/g, "")
      .trim();
  }

  // Clean up remaining text
  const text = remainingText.replace(/\s+/g, " ").trim();

  // Build FTS5 query
  const ftsQuery = buildFtsQuery(text, filters);

  return {
    text,
    filters,
    ftsQuery,
  };
}

/**
 * Build FTS5 query from parsed components
 */
function buildFtsQuery(text: string, filters: ParsedQuery["filters"]): string {
  const queryParts: string[] = [];

  // Add text search if present - simple approach that works across all fields
  if (text) {
    // For basic text search, let FTS5 search all fields automatically with prefix matching
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    if (words.length > 1) {
      // For multiple words, add prefix matching to each
      const prefixWords = words.map((word) => `${word}*`);
      queryParts.push(`(${prefixWords.join(" OR ")})`);
    } else if (words.length === 1) {
      // For single word, add prefix matching
      queryParts.push(`${words[0]}*`);
    }
  }

  // Add tag filters - search in tags field with prefix matching
  if (filters.tags?.length) {
    const tagQueries = filters.tags.map((tag) => `tags:${tag}*`);
    queryParts.push(`(${tagQueries.join(" OR ")})`);
  }

  // Add model filters - search in notes field with prefix matching
  if (filters.models?.length) {
    const modelQueries = filters.models.map((model) => `notes:${model}*`);
    queryParts.push(`(${modelQueries.join(" OR ")})`);
  }

  // Combine all parts with AND
  let finalQuery = queryParts.join(" AND ");

  // If no query parts, return a safe fallback
  if (!finalQuery) {
    finalQuery = "*"; // FTS5 match-all query
  }

  return finalQuery;
}

/**
 * Format filters for display
 */
export function formatFilters(filters: ParsedQuery["filters"]): string[] {
  const formatted: string[] = [];

  if (filters.tags?.length) {
    formatted.push(`Tags: ${filters.tags.join(", ")}`);
  }

  if (filters.models?.length) {
    formatted.push(`Models: ${filters.models.join(", ")}`);
  }

  if (filters.category) {
    formatted.push(`Category: ${filters.category}`);
  }

  return formatted;
}

/**
 * Examples of supported query syntax
 */
export const SEARCH_EXAMPLES = [
  "marketing ideas",
  "tag:coding functions",
  "model:gpt-5 creative writing",
  "tag:marketing tag:social-media",
  "category:coding tag:javascript",
  'tag:"data analysis" python',
  'model:"claude-sonnet-4" storytelling',
];

/**
 * Help text for search syntax
 */
export const SEARCH_HELP = {
  title: "Search Syntax Help",
  examples: [
    {
      query: "marketing ideas",
      description: "Search for text in titles and content",
    },
    {
      query: "tag:coding",
      description: "Find prompts with specific tags",
    },
    {
      query: "model:gpt-4",
      description: "Find prompts mentioning specific models",
    },
    {
      query: "tag:marketing model:claude",
      description: "Combine multiple filters",
    },
    {
      query: 'tag:"social media"',
      description: "Use quotes for multi-word filters",
    },
  ],
};
