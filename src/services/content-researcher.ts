import { openai } from '@/lib/openai';
import { BlogType } from '@/types';
import { logger } from '@/lib/logger';

// ============================================================================
// Research Data Types
// ============================================================================

export interface ResearchStatistic {
  stat: string;
  source: string;
}

export interface ResearchPricing {
  name: string;
  price: string;
  details: string;
}

export interface ResearchCompetitor {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
}

export interface ResearchQuote {
  quote: string;
  source: string;
}

export interface ResearchData {
  topic: string;
  summary: string;
  keyFacts: string[];
  statistics: ResearchStatistic[];
  pricing: ResearchPricing[];
  competitors: ResearchCompetitor[];
  expertQuotes: ResearchQuote[];
  recentDevelopments: string[];
  commonQuestions: string[];
  toolsAndResources: string[];
}

// ============================================================================
// Blog-type specific search queries
// ============================================================================

function getSearchQueries(keyword: string, blogType: BlogType, title: string): string[] {
  const baseQueries = [
    `${keyword} latest information 2025 2026`,
    `${keyword} statistics data facts`,
  ];

  const typeQueries: Record<BlogType, string[]> = {
    guide: [
      `${keyword} step by step tutorial guide`,
      `${keyword} best practices tips`,
      `${keyword} common mistakes problems`,
    ],
    comparison: [
      `${keyword} vs alternatives comparison`,
      `${keyword} pricing plans cost`,
      `${keyword} pros cons review`,
    ],
    tips: [
      `${keyword} tips tricks shortcuts`,
      `${keyword} best settings configuration`,
      `${keyword} workflow optimization`,
    ],
    review: [
      `${keyword} honest review 2025 2026`,
      `${keyword} pricing plans features`,
      `${keyword} alternatives competitors`,
    ],
    troubleshoot: [
      `${keyword} fix solution error`,
      `${keyword} common causes problems`,
      `${keyword} troubleshooting steps`,
    ],
    api: [
      `${keyword} API documentation endpoints`,
      `${keyword} API pricing rate limits`,
      `${keyword} API code examples integration`,
    ],
    usecase: [
      `${keyword} use cases examples`,
      `${keyword} ROI results metrics`,
      `${keyword} industry applications`,
    ],
    prompt: [
      `${keyword} best prompts examples`,
      `${keyword} prompt tips settings`,
      `${keyword} prompt techniques styles`,
    ],
    tools: [
      `${keyword} features capabilities`,
      `${keyword} pricing free plan`,
      `${keyword} alternatives comparison`,
    ],
    upcoming: [
      `${keyword} release date announcement`,
      `${keyword} new features expected`,
      `${keyword} rumors confirmed leaks`,
    ],
  };

  return [...baseQueries, ...(typeQueries[blogType] || [])];
}

// ============================================================================
// Research synthesis prompt
// ============================================================================

function getSynthesisPrompt(keyword: string, blogType: BlogType, title: string): string {
  return `You are a research analyst. Analyze the search results about "${keyword}" for an article titled "${title}" (type: ${blogType}).

Extract and organize the following as ACCURATE, VERIFIED information only. Do NOT invent or hallucinate any data.

Return a JSON object with this exact structure:
{
  "topic": "${keyword}",
  "summary": "2-3 sentence overview of what ${keyword} is and its current state",
  "keyFacts": ["8-12 specific, verified facts with numbers where possible"],
  "statistics": [
    {"stat": "specific statistic with number", "source": "source name and year"}
  ],
  "pricing": [
    {"name": "plan/product name", "price": "exact price", "details": "what's included"}
  ],
  "competitors": [
    {"name": "competitor name", "description": "one line description", "strengths": ["str1"], "weaknesses": ["weak1"]}
  ],
  "expertQuotes": [
    {"quote": "exact or paraphrased expert statement", "source": "person name, title, or organization"}
  ],
  "recentDevelopments": ["what changed in 2025-2026 about this topic"],
  "commonQuestions": ["real questions people ask about ${keyword}"],
  "toolsAndResources": ["real tools, websites, and resources related to ${keyword}"]
}

CRITICAL RULES:
- Every statistic MUST have a real source (company name, report name, year)
- Every quote MUST be attributed to a real person or organization
- Pricing must be EXACT current prices, not estimates
- If you're not sure about a fact, OMIT it rather than guess
- Include at least 5 statistics, 2 expert quotes, and 8 key facts
- For ${blogType} content, focus especially on: ${getBlogTypeFocus(blogType)}

IMPORTANT - DO NOT INCLUDE:
- NO competitor website URLs or links (e.g., "visit example.com")
- NO promotional calls-to-action for third-party tools
- NO affiliate or tracking links (utm_source, etc.)
- NO "Sign up at..." or "Try at..." instructions for competitor products
- ONLY include competitor names and factual capabilities, NOT promotional content
- Source attributions should be organization/study names only, NOT clickable URLs

- Return ONLY valid JSON, no markdown code blocks`;
}

function getBlogTypeFocus(blogType: BlogType): string {
  const focus: Record<BlogType, string> = {
    guide: 'step-by-step processes, prerequisites, tools needed, time estimates',
    comparison: 'pricing differences, feature comparisons, winner per category, user type recommendations',
    tips: 'actionable tips with measurable impact, settings, shortcuts, workflows',
    review: 'testing methodology, pros/cons with evidence, pricing value analysis, alternatives',
    troubleshoot: 'error messages, root causes, fix steps, prevention methods',
    api: 'endpoints, authentication, rate limits, pricing tiers, code examples',
    usecase: 'ROI metrics, industry-specific examples, implementation steps, tools needed',
    prompt: 'prompt techniques, model-specific settings, example outputs, common mistakes',
    tools: 'features, pricing tiers, free plan limits, alternatives, version history',
    upcoming: 'confirmed vs rumored features, release dates, comparison to current version',
  };
  return focus[blogType] || 'comprehensive factual coverage';
}

// ============================================================================
// Main Research Function
// ============================================================================

export async function conductResearch(
  keyword: string,
  blogType: BlogType,
  title: string
): Promise<ResearchData> {
  logger.info('Starting topic research', { keyword, blogType });

  const queries = getSearchQueries(keyword, blogType, title);

  // Stage 1: Run web searches in parallel (3-5 queries)
  const searchPromises = queries.map((query) =>
    searchSingle(query).catch((err) => {
      logger.warn('Individual search failed', { query, error: String(err) });
      return '';
    })
  );

  const searchResults = await Promise.all(searchPromises);
  const combinedResults = searchResults.filter(Boolean).join('\n\n---\n\n');

  if (!combinedResults.trim()) {
    logger.warn('All web searches returned empty, using fallback research');
    return conductFallbackResearch(keyword, blogType, title);
  }

  logger.info('Web search complete', {
    keyword,
    queryCount: queries.length,
    resultLength: combinedResults.length,
  });

  // Stage 2: Synthesize research into structured data
  const synthesisPrompt = getSynthesisPrompt(keyword, blogType, title);

  try {
    const synthesized = await openai.generateJSON<ResearchData>({
      prompt: `Here are web search results about "${keyword}":\n\n${combinedResults.slice(0, 30000)}\n\n${synthesisPrompt}`,
      model: 'gpt-4o-mini',
      maxTokens: 4096,
      temperature: 0.3,
    });

    // Validate and sanitize
    const research = validateResearch(synthesized, keyword);

    logger.info('Research synthesis complete', {
      keyword,
      factCount: research.keyFacts.length,
      statCount: research.statistics.length,
      quoteCount: research.expertQuotes.length,
    });

    return research;
  } catch (synthError) {
    logger.warn('Research synthesis failed, using fallback', { error: String(synthError) });
    return conductFallbackResearch(keyword, blogType, title);
  }
}

// ============================================================================
// Web Search (Single Query)
// ============================================================================

async function searchSingle(query: string): Promise<string> {
  const instructions = `Search the web for current, factual information. Focus on:
- Specific numbers, statistics, and data points
- Official pricing and features
- Expert opinions and quotes
- Recent developments (2025-2026)
- Real tools, resources, and links

Return a comprehensive summary of what you find. Include source names for every fact.`;

  return openai.searchWeb(query, instructions);
}

// ============================================================================
// Fallback: Use LLM knowledge when web search fails
// ============================================================================

async function conductFallbackResearch(
  keyword: string,
  blogType: BlogType,
  title: string
): Promise<ResearchData> {
  logger.info('Using fallback research (LLM knowledge)', { keyword });

  const prompt = `You are a research analyst preparing data for an article about "${keyword}" (title: "${title}", type: ${blogType}).

Provide the BEST factual information you know. For anything you're not confident about, clearly mark it as "[approximate]" or "[estimated]".

${getSynthesisPrompt(keyword, blogType, title)}`;

  try {
    const result = await openai.generateJSON<ResearchData>({
      prompt,
      model: 'gpt-4o',
      maxTokens: 4096,
      temperature: 0.3,
    });

    return validateResearch(result, keyword);
  } catch {
    // Return minimal research data so generation can still proceed
    return getEmptyResearch(keyword);
  }
}

// ============================================================================
// Validation & Sanitization
// ============================================================================

function validateResearch(data: unknown, keyword: string): ResearchData {
  const raw = data as Record<string, unknown>;

  return {
    topic: typeof raw.topic === 'string' ? raw.topic : keyword,
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    keyFacts: Array.isArray(raw.keyFacts)
      ? raw.keyFacts.filter((f): f is string => typeof f === 'string').slice(0, 15)
      : [],
    statistics: Array.isArray(raw.statistics)
      ? raw.statistics
          .filter(
            (s): s is ResearchStatistic =>
              typeof s === 'object' && s !== null && typeof (s as ResearchStatistic).stat === 'string' && typeof (s as ResearchStatistic).source === 'string'
          )
          .slice(0, 10)
      : [],
    pricing: Array.isArray(raw.pricing)
      ? raw.pricing
          .filter(
            (p): p is ResearchPricing =>
              typeof p === 'object' && p !== null && typeof (p as ResearchPricing).name === 'string'
          )
          .slice(0, 8)
      : [],
    competitors: Array.isArray(raw.competitors)
      ? raw.competitors
          .filter(
            (c): c is ResearchCompetitor =>
              typeof c === 'object' && c !== null && typeof (c as ResearchCompetitor).name === 'string'
          )
          .slice(0, 6)
      : [],
    expertQuotes: Array.isArray(raw.expertQuotes)
      ? raw.expertQuotes
          .filter(
            (q): q is ResearchQuote =>
              typeof q === 'object' && q !== null && typeof (q as ResearchQuote).quote === 'string' && typeof (q as ResearchQuote).source === 'string'
          )
          .slice(0, 5)
      : [],
    recentDevelopments: Array.isArray(raw.recentDevelopments)
      ? raw.recentDevelopments.filter((d): d is string => typeof d === 'string').slice(0, 8)
      : [],
    commonQuestions: Array.isArray(raw.commonQuestions)
      ? raw.commonQuestions.filter((q): q is string => typeof q === 'string').slice(0, 10)
      : [],
    toolsAndResources: Array.isArray(raw.toolsAndResources)
      ? raw.toolsAndResources.filter((t): t is string => typeof t === 'string').slice(0, 8)
      : [],
  };
}

function getEmptyResearch(keyword: string): ResearchData {
  return {
    topic: keyword,
    summary: '',
    keyFacts: [],
    statistics: [],
    pricing: [],
    competitors: [],
    expertQuotes: [],
    recentDevelopments: [],
    commonQuestions: [],
    toolsAndResources: [],
  };
}

// ============================================================================
// Format research data for injection into content generation prompt
// ============================================================================

export function formatResearchForPrompt(research: ResearchData): string {
  if (!research || (!research.keyFacts.length && !research.statistics.length)) {
    return '';
  }

  // Helper to strip URLs from text
  const stripUrls = (text: string): string => {
    return text
      .replace(/https?:\/\/[^\s)\]]+/gi, '') // Remove URLs
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links, keep text
      .replace(/visit\s+[a-z0-9.-]+\.(com|io|ai|org|net)/gi, '') // Remove "visit example.com"
      .replace(/\butm_[a-z_]+=[^\s&]+/gi, '') // Remove UTM params
      .replace(/\s{2,}/g, ' ') // Clean up extra spaces
      .trim();
  };

  const sections: string[] = [
    `\n## VERIFIED RESEARCH DATA — Use These Facts, Do NOT Hallucinate\n`,
    `The following data was gathered from web research on "${research.topic}" as of ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`,
    `Use ONLY these facts, statistics, and quotes in your article. Do NOT invent additional statistics or attribute quotes to sources not listed here. If you need to supplement, use general knowledge but NEVER fabricate specific numbers.\n`,
    `IMPORTANT: Do NOT include any competitor website URLs, affiliate links, or "visit/try at" calls-to-action in the article. Focus on YOUR platform's value. Mention competitor names factually only when comparing features.\n`,
  ];

  if (research.summary) {
    sections.push(`### Topic Overview\n${stripUrls(research.summary)}\n`);
  }

  if (research.keyFacts.length > 0) {
    sections.push(`### Key Facts\n${research.keyFacts.map((f) => `- ${stripUrls(f)}`).join('\n')}\n`);
  }

  if (research.statistics.length > 0) {
    sections.push(
      `### Statistics (Use These Exact Numbers)\n${research.statistics.map((s) => `- ${stripUrls(s.stat)} — Source: ${stripUrls(s.source)}`).join('\n')}\n`
    );
  }

  if (research.expertQuotes.length > 0) {
    sections.push(
      `### Expert Statements (Attribute Correctly)\n${research.expertQuotes.map((q) => `- "${stripUrls(q.quote)}" — ${stripUrls(q.source)}`).join('\n')}\n`
    );
  }

  // NOTE: Pricing data should use evergreen language in content, not exact tables
  if (research.pricing && research.pricing.length > 0) {
    sections.push(
      `### Pricing Data (Reference Only — Use Evergreen Language in Article)\n${research.pricing.map((p) => `- **${p.name}**: ${p.price} — ${p.details}`).join('\n')}\nNOTE: When writing about pricing, use qualitative descriptions (e.g., "designed for growing creators") rather than exact dollar amounts. Suggest readers check official pricing pages for current rates.\n`
    );
  }

  // NOTE: Competitors should be mentioned factually, without promotional links
  if (research.competitors && research.competitors.length > 0) {
    sections.push(
      `### Competitors & Alternatives (Factual Comparison Only — NO URLs)\n${research.competitors
        .map(
          (c) =>
            `- **${c.name}**: ${stripUrls(c.description)}${c.strengths?.length ? `\n  Strengths: ${c.strengths.map(s => stripUrls(s)).join(', ')}` : ''}${c.weaknesses?.length ? `\n  Weaknesses: ${c.weaknesses.map(w => stripUrls(w)).join(', ')}` : ''}`
        )
        .join('\n')}\nIMPORTANT: Do NOT include any links to competitors. Do NOT recommend users "visit" or "try" competitor products. Focus on factual capability comparisons only.\n`
    );
  }

  if (research.recentDevelopments.length > 0) {
    sections.push(
      `### Recent Developments (2025-2026)\n${research.recentDevelopments.map((d) => `- ${stripUrls(d)}`).join('\n')}\n`
    );
  }

  if (research.commonQuestions.length > 0) {
    sections.push(
      `### Real Questions People Ask (Use in FAQ Section)\n${research.commonQuestions.map((q) => `- ${stripUrls(q)}`).join('\n')}\n`
    );
  }

  if (research.toolsAndResources.length > 0) {
    // Filter out competitor tools, keep only general resources
    const filteredResources = research.toolsAndResources
      .map(t => stripUrls(t))
      .filter(t => t.length > 5); // Remove empty/tiny entries after stripping
    if (filteredResources.length > 0) {
      sections.push(
        `### Tools & Resources (General References Only)\n${filteredResources.map((t) => `- ${t}`).join('\n')}\n`
      );
    }
  }

  return sections.join('\n');
}
