import { LinkMatch } from './link-matcher';

interface BrandProfileData {
  name: string;
  domain: string;
  description?: string | null;
}

/**
 * Build a platform context section for the LLM system prompt.
 * This section instructs the LLM to integrate the brand into the blog content.
 */
export function buildPlatformPromptSection(
  brand: BrandProfileData,
  matches: LinkMatch[]
): string {
  if (!matches.length) {
    return buildMinimalBrandSection(brand);
  }

  const toolLines = matches
    .slice(0, 15) // Cap at 15 most relevant tools
    .map((m, i) => {
      const desc = m.tool.description ? ` — ${m.tool.description}` : '';
      return `  ${i + 1}. ${m.tool.name}: ${m.fullUrl}${desc}`;
    })
    .join('\n');

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

function buildMinimalBrandSection(brand: BrandProfileData): string {
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
