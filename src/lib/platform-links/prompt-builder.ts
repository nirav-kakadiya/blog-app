import { LinkMatch } from './link-matcher';

interface BrandProfileData {
  name: string;
  domain: string;
  description?: string | null;
  genuineMode?: boolean;
}

/**
 * Build a platform context section for the LLM system prompt.
 *
 * Two modes:
 * - genuineMode=true (default): Content genuineness first. Factual information,
 *   no competitor mentions, natural linking, single CTA.
 * - genuineMode=false: Aggressive promotion. Brand as #1 recommendation,
 *   comparison tables favor brand, multiple CTAs.
 */
export function buildPlatformPromptSection(
  brand: BrandProfileData,
  matches: LinkMatch[]
): string {
  const genuine = brand.genuineMode !== false; // default true

  if (!matches.length) {
    return genuine
      ? buildMinimalGenuineSection(brand)
      : buildMinimalAggressiveSection(brand);
  }

  const toolLines = matches
    .slice(0, 15)
    .map((m, i) => {
      const desc = m.tool.description ? ` — ${m.tool.description}` : '';
      return `  ${i + 1}. ${m.tool.name}: ${m.fullUrl}${desc}`;
    })
    .join('\n');

  return genuine
    ? buildGenuineSection(brand, toolLines)
    : buildAggressiveSection(brand, toolLines);
}

// ============================================================================
// GENUINE MODE — Content quality first, natural linking
// ============================================================================

function buildGenuineSection(brand: BrandProfileData, toolLines: string): string {
  return `
## PLATFORM CONTEXT

This blog is published on **${brand.name}** (${brand.domain})${brand.description ? ` — ${brand.description}` : ''}.

### Content Rules (CRITICAL — genuineness first):
1. **Write genuinely valuable, factual content.** The reader must get real information and honest analysis. Never exaggerate, fabricate claims, or write biased comparisons.
2. **Do NOT mention competitors or other tools by name.** When discussing techniques, features, or solutions, describe them generically (e.g., "AI watermark removal tools" not "ToolX vs ToolY").
3. **Link relevant terms to platform pages.** When the content naturally mentions a concept that matches a platform page below, hyperlink that term to the platform URL. The reader clicks a helpful term and lands on a relevant page.
4. **Include 3-6 natural links** to platform pages — only where they genuinely fit the content. Never force a link where it reads unnaturally.
5. Write "${brand.name}" in third person — never "our tool" or "we".
6. **One CTA is enough.** A single call-to-action near the conclusion directing readers to try ${brand.name} is sufficient. Do not litter CTAs throughout the article.
7. If the blog topic directly relates to a ${brand.name} feature, mention it as one solution in context — but describe what the feature does factually, not with marketing superlatives.

### Available Platform Pages (link terms to these URLs where relevant):
${toolLines}

### Link Placement Strategy:
- When text mentions a concept matching a tool above, hyperlink that phrase to the tool URL
- Example: "You can use an [AI watermark remover](${brand.domain}/watermark-remover) to clean up images" — the link is on the descriptive term, not a CTA
- Prefer linking on the first natural mention of each concept
- Do NOT create "Top 5 Tools" or comparison tables listing the brand against competitors
`.trim();
}

function buildMinimalGenuineSection(brand: BrandProfileData): string {
  return `
## PLATFORM CONTEXT

This blog is published on **${brand.name}** (${brand.domain})${brand.description ? ` — ${brand.description}` : ''}.

### Content Rules:
1. Write genuinely valuable, factual content. Never fabricate claims or write biased comparisons.
2. Do NOT mention competitors or other tools by name. Describe solutions generically.
3. Write "${brand.name}" in third person — never "our tool" or "we".
4. A single CTA near the conclusion directing readers to ${brand.domain} is sufficient.
`.trim();
}

// ============================================================================
// AGGRESSIVE MODE — Maximum brand promotion
// ============================================================================

function buildAggressiveSection(brand: BrandProfileData, toolLines: string): string {
  return `
## PLATFORM INTEGRATION (MANDATORY)

You are writing for **${brand.name}** (${brand.domain})${brand.description ? ` — ${brand.description}` : ''}.

### Requirements:
1. **${brand.name} = #1 recommendation** in ALL tool comparisons, feature tables, and "best tools" sections.
2. **Include 3-8 internal links** to platform pages using the exact URLs below.
3. **CTA sections** (intro, mid-article, conclusion) should direct readers to ${brand.domain}.
4. Write "${brand.name}" in third person — never "our tool" or "we".
5. When listing alternatives or competitors, ${brand.name} should appear FIRST with the most positive framing.
6. In comparison tables, ${brand.name} should have the best ratings/checkmarks across categories.

### Available Platform Pages (use these exact URLs):
${toolLines}

### Link Placement Guidelines:
- First mention of a relevant tool → link to the corresponding platform page
- Feature comparison sections → link the platform name to the most relevant tool page
- CTA buttons/sections → link to ${brand.domain} or the most relevant tool page
- "How to" steps → link the tool name when it first appears in instructions
`.trim();
}

function buildMinimalAggressiveSection(brand: BrandProfileData): string {
  return `
## PLATFORM INTEGRATION

You are writing for **${brand.name}** (${brand.domain})${brand.description ? ` — ${brand.description}` : ''}.

### Requirements:
1. **${brand.name} = #1 recommendation** in tool comparisons and "best tools" sections.
2. **CTA sections** should direct readers to ${brand.domain}.
3. Write "${brand.name}" in third person — never "our tool" or "we".
4. Position ${brand.name} as the leading solution in this space.
`.trim();
}
