/**
 * API search service for extended company and job role suggestions
 * Uses external APIs when local static lists don't have enough matches
 */

// Clearbit Company Autocomplete API (free, no auth required for basic use)
const CLEARBIT_AUTOCOMPLETE_URL = "https://autocomplete.clearbit.com/v1/companies/suggest";

/**
 * Search for companies using Clearbit's autocomplete API
 * This is a free API that doesn't require authentication
 * @param query - The search query
 * @returns Array of company names
 */
export async function searchCompaniesApi(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];

  try {
    const response = await fetch(
      `${CLEARBIT_AUTOCOMPLETE_URL}?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn("Clearbit API returned non-OK status:", response.status);
      return [];
    }

    const data = await response.json();
    
    // Clearbit returns an array of company objects with name, domain, logo
    if (Array.isArray(data)) {
      return data.map((company: { name: string }) => company.name).slice(0, 10);
    }

    return [];
  } catch (error) {
    console.error("Failed to fetch from Clearbit API:", error);
    return [];
  }
}

/**
 * Extended job role search using a simple fuzzy matching approach
 * Since there's no free job title API, we use enhanced local search
 * with common variations and synonyms
 */
const jobRoleSynonyms: Record<string, string[]> = {
  "dev": ["developer", "development"],
  "eng": ["engineer", "engineering"],
  "mgr": ["manager", "management"],
  "sr": ["senior"],
  "jr": ["junior"],
  "swe": ["software engineer"],
  "sde": ["software development engineer"],
  "pm": ["product manager", "project manager", "program manager"],
  "ux": ["user experience", "ux designer", "ux researcher"],
  "ui": ["user interface", "ui designer"],
  "qa": ["quality assurance", "qa engineer", "qa analyst"],
  "ml": ["machine learning", "ml engineer"],
  "ai": ["artificial intelligence", "ai engineer"],
  "fe": ["frontend", "front-end", "front end"],
  "be": ["backend", "back-end", "back end"],
  "fs": ["full stack", "fullstack", "full-stack"],
  "devops": ["dev ops", "development operations"],
  "sre": ["site reliability engineer", "site reliability"],
  "tpm": ["technical program manager"],
  "em": ["engineering manager"],
  "vp": ["vice president"],
  "cto": ["chief technology officer"],
  "ceo": ["chief executive officer"],
  "cfo": ["chief financial officer"],
  "coo": ["chief operating officer"],
  "hr": ["human resources"],
  "ops": ["operations"],
  "biz": ["business"],
  "mktg": ["marketing"],
};

/**
 * Expand abbreviations and synonyms in the query
 * @param query - The search query
 * @returns Array of expanded query terms
 */
function expandQuery(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  const expansions = [normalizedQuery];

  // Check if query matches any abbreviation
  for (const [abbrev, synonyms] of Object.entries(jobRoleSynonyms)) {
    if (normalizedQuery === abbrev || normalizedQuery.includes(abbrev)) {
      expansions.push(...synonyms);
    }
  }

  return Array.from(new Set(expansions));
}

/**
 * Search for job roles with expanded query matching
 * @param query - The search query
 * @param allRoles - Array of all available job roles
 * @returns Array of matching job role names
 */
export function searchJobRolesExpanded(query: string, allRoles: string[]): string[] {
  if (!query || query.length < 2) return [];

  const expandedQueries = expandQuery(query);
  const matches = new Set<string>();

  for (const expandedQuery of expandedQueries) {
    for (const role of allRoles) {
      const normalizedRole = role.toLowerCase();
      if (normalizedRole.includes(expandedQuery)) {
        matches.add(role);
      }
    }
  }

  // Sort by relevance (exact matches first, then starts with, then contains)
  const normalizedQuery = query.toLowerCase().trim();
  const matchesArray = Array.from(matches);
  const sortedMatches = matchesArray.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    // Exact match
    if (aLower === normalizedQuery) return -1;
    if (bLower === normalizedQuery) return 1;
    
    // Starts with
    if (aLower.startsWith(normalizedQuery) && !bLower.startsWith(normalizedQuery)) return -1;
    if (bLower.startsWith(normalizedQuery) && !aLower.startsWith(normalizedQuery)) return 1;
    
    // Alphabetical
    return a.localeCompare(b);
  });

  return sortedMatches.slice(0, 10);
}
