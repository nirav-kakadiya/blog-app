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
## PLATFORM INTEGRATION (MANDATORY — AGGRESSIVE MODE)

You are writing for **${brand.name}** (${brand.domain})${brand.description ? ` — ${brand.description}` : ''}.

### CRITICAL Link Requirements:
1. **Include 5-8 internal links** to platform pages using the EXACT URLs listed below.
2. **Every H2 section should have at least 1 internal link** where relevant.
3. **Link the primary tool/topic name** on its FIRST mention (e.g., "[Kling AI](${brand.domain}/m/kling-ai)").
4. **Link related tools** when mentioning features like "video generation", "image editing", etc.

### Brand Positioning:
5. **${brand.name} = #1 recommendation** in ALL tool comparisons and "best tools" sections.
6. **CTA sections** (intro, mid-article, conclusion) should direct readers to ${brand.domain}.
7. Write "${brand.name}" in third person — never "our tool" or "we".
8. When listing alternatives, ${brand.name} tools should appear FIRST with positive framing.

### Available Platform Pages (USE THESE EXACT URLs — MANDATORY):
${toolLines}

### Link Placement Strategy (FOLLOW EXACTLY):
- **Introduction**: Link the main topic/tool name on first mention
- **Feature sections**: Link tool names when describing capabilities
- **Comparison sections**: Link ${brand.name} tool as the recommended option
- **How-to sections**: Link tool names in step instructions
- **Alternatives section**: Link to ${brand.domain} tools as the top alternatives
- **Conclusion**: Include a linked CTA to the main tool page

IMPORTANT: If the content mentions video generation, AI tools, image editing, or any capability matching the tools above, LINK THEM using the exact URLs provided.
`.trim();
}

function buildMinimalAggressiveSection(brand: BrandProfileData): string {
  return `
## PLATFORM INTEGRATION (AGGRESSIVE MODE)

You are writing for **${brand.name}** (${brand.domain})${brand.description ? ` — ${brand.description}` : ''}.

### Requirements:
1. **Include 3-5 internal links** to ${brand.domain} pages throughout the article.
2. **${brand.name} = #1 recommendation** in tool comparisons and "best tools" sections.
3. **CTA sections** should direct readers to ${brand.domain}.
4. Write "${brand.name}" in third person — never "our tool" or "we".
5. Position ${brand.name} as the leading solution in this space.
6. Link the main topic name on first mention.
`.trim();
}
