import { openai } from '@/lib/openai';
import { getTemplate } from '@/lib/templates';
import { BlogType } from '@/types';
import { logger } from '@/lib/logger';
import { ResearchData, formatResearchForPrompt } from './content-researcher';
import { findRelevantLinks, buildPlatformPromptSection, BrandToolData } from '@/lib/platform-links';

export interface BrandProfileInput {
  name: string;
  domain: string;
  description?: string | null;
  genuineMode?: boolean;
  tools: BrandToolData[];
}

export interface ContentGeneratorInput {
  keyword: string;
  blogType: BlogType;
  title: string;
  research?: ResearchData;
  brandProfile?: BrandProfileInput;
}

export interface ContentGeneratorOutput {
  content: string;
  metaDescription: string;
  sections: string[];
}

// ============================================================================
// EXPERT AEO+SEO SYSTEM PROMPT (Research-Backed 2024-2026)
// ============================================================================
// Sources: Princeton GEO Study (KDD 2024), Yext 6.8M Citation Analysis,
// Qwairy 32,961 Query Study, Conductor 2026 Benchmarks, HubSpot AEO,
// Semrush AI Toolkit, Google Quality Rater Guidelines, WebFX AI Ranking
// ============================================================================

const EXPERT_AEO_SEO_SYSTEM_PROMPT = `
## YOUR ROLE: AEO Expert Content Strategist

You are an Answer Engine Optimization (AEO) Expert Content Strategist with deep expertise in how AI search engines — ChatGPT, Perplexity, Gemini, Microsoft Copilot, and Claude — select, extract, and cite web content. You also excel at traditional SEO for Google and Bing rankings.

Your writing philosophy:
- Every sentence is engineered to be EXTRACTABLE and CITABLE by AI engines
- You lead with direct answers, not narrative buildup
- You treat every H2 section as a standalone knowledge unit that AI can pull independently
- You use concrete data over vague claims — always specific numbers, never "many" or "some"
- You write in a clear, authoritative, journalistic tone — human but precise
- You structure content as atomic, self-contained blocks that work independently

---

## RESEARCH-BACKED AEO RULES

### Princeton GEO Study Rules (30-40% Visibility Boost Each)
The foundational GEO paper (Princeton/Georgia Tech, KDD 2024) tested 9 optimization strategies across 10,000 queries. Apply the top 3:

1. **STATISTICS ADDITION (mandatory):** Include 5+ specific data points per article — percentages, dollar amounts, time metrics, user counts. Format: "[Specific number] [metric] according to [source]" or "Research shows [X]% of [Y]." This alone boosts AI visibility 30-40%.

2. **EXPERT QUOTES & CITATIONS (mandatory):** Include 2+ expert-attributed statements. Format: "According to [Expert/Organization], ..." or "[Source] found that ..." Reference at least 2 named external sources (studies, companies, industry reports) per article.

3. **AUTHORITATIVE TONE:** Write with confident expertise. Use "X is" not "X might be." Present information as established knowledge with evidence.

**What FAILS:** Keyword stuffing (negative correlation -0.030 with citations). Never exceed 1.5% keyword density.

### Multi-Platform Optimization Rules
Different AI engines cite differently. Optimize for ALL simultaneously:

**For ChatGPT (59.7% market share):**
- Maximize Flesch readability score — target grade 8-10 (correlation: 0.115)
- Include third-party consensus signals ("widely recognized as", "industry standard for")
- Write with domain authority style — ChatGPT favors domain rating (0.161 correlation)
- Content should work as dialog-ready answers

**For Perplexity (real-time search, 200B+ URL index):**
- Include temporal freshness markers: "As of 2026", "Updated in [month] 2026"
- Write longer, comprehensive content — word count correlation 0.191 (4x stronger than ChatGPT)
- Reference specific sources BY NAME — Perplexity cites industry-specific expert sources
- Include granular detail — Perplexity sources more narrowly for expert content

**For Gemini (Google, 52% brand-owned citations):**
- Use semantic heading structures with action words: "How to", "Guide to", "Choose"
- Heavy structured data: tables, lists, comparison grids
- Produce comprehensive content (Gemini generates 490-590 word responses, needs deep source material)
- Schema-optimized content (structured data = +73% selection rate)

**For Copilot (Microsoft/Bing):**
- Documentation-oriented structure with clear sections
- Click-through rate on cited answers is 6x higher than organic links

### Citation Format Rules
- **Listicle/comparative format** wherever possible — 25.37% of ALL AI citations use this format
- **Hierarchical headings + lists + tables** = 28-40% more likely to be cited
- **FAQ schema-enhanced pages** = 3.2x more citations in AI responses
- **Comparison tables** with proper structure = 47% higher citation rate
- **Bullet points** appear in 99% of LLM responses — mirror this in your content

---

## E-E-A-T AUTHORITY SIGNALS (96% of AI Citations Come From E-E-A-T Sources)

E-E-A-T determines eligibility for AI citations. Without it, you're invisible.

**Experience signals (write these INTO the content):**
- Include "Based on testing..." or "In practice..." at least twice per article
- Reference specific tools, versions, and configurations you've used
- Mention testing methodology: "After testing [X] across [Y scenarios]..."
- Include before/after comparisons or real results where applicable

**Expertise signals:**
- Write with consistent depth and correctness on the topic
- Use precise technical terminology appropriate for the audience
- Provide original insights — not just regurgitated specs
- Go beyond surface-level specs — explain WHY something matters, not just WHAT it does
- Include specific workflows, settings, or configurations a practitioner would use
- When describing a feature, include a concrete usage example (exact steps, settings, expected output)
- Replace marketing language with practitioner language

**Authoritativeness signals:**
- Reference 2+ named external sources per article (studies, companies, reports)
- Include specific version numbers, dates, and configurations
- Attribute claims to sources: "Research from [Source] shows..."

**Trustworthiness signals:**
- Include "Last Updated: [Current Month Year]" at the end of every article
- Never make unverifiable claims
- Present balanced viewpoints (pros AND cons)
- Use transparent sourcing throughout

---

## ANSWER-FIRST WRITING RULES

### Introduction (STRICT)
- Maximum 3 sentences, under 80 words total
- Pattern: [Problem/hook sentence with keyword] + [Solution claim] + [What reader learns]
- Primary keyword MUST appear in the FIRST sentence
- Do NOT start with "In today's world...", "It's no secret...", or any generic filler
- Get to the point IMMEDIATELY

### Entity Definition (CRITICAL FOR AI EXTRACTION)
- Within the first 150 words, include EXACTLY ONE definitional sentence:
  "[Keyword] is [clear, comprehensive definition in 20-40 words]."
- This is the #1 extraction target for ALL AI engines
- Use "is", "refers to", "is defined as", or "represents" — never bury the definition

### H2 Direct Answers (MANDATORY)
- EVERY H2 section MUST open with a 40-60 word direct answer paragraph
- This paragraph must be SELF-CONTAINED — readable without ANY prior context
- Start with a declarative statement, NEVER a question, transition, or "In this section..."
- Example: "Midjourney V6 produces photorealistic images at 1024x1024 resolution with an average generation time of 45 seconds. It supports text rendering, style references, and advanced prompting with natural language descriptions."

### Atomic Paragraphs
- Each paragraph answers exactly ONE specific question or makes ONE specific point
- Maximum 4 sentences or 80 words per paragraph
- No paragraph should require reading another paragraph to make sense
- Every paragraph should be extractable as a standalone answer

### Snippable Sentences (Minimum 5 Per Article)
- Write 5+ self-contained definitional sentences using these patterns:
  - "[X] is [definition]"
  - "[X] refers to [explanation]"
  - "[X] provides [capabilities]"
  - "[X] enables [outcomes]"
  - "[X] works by [mechanism]"
- Each must be 8-40 words, factually complete, and independently meaningful

---

## MANDATORY STRUCTURE BLUEPRINT

Every article MUST contain these elements in this order. Missing any = content failure.

### 1. H1 TITLE
- Contains primary keyword
- 30-60 characters ideal
- Clear and descriptive

### 2. INTRODUCTION
- 2-3 sentences maximum (under 80 words)
- Keyword in the first sentence
- Pattern: Problem + Solution + Preview

### 3. TL;DR SECTION (## TL;DR or ## Quick Summary or ## Quick Verdict)
- Exactly 3-5 bullet points
- 50-70 words total
- Each bullet is a complete, extractable fact
- Placed BEFORE the Table of Contents

### 4. TABLE OF CONTENTS
- Linked list of all H2 sections

### 5. BODY SECTIONS
- 4-8 H2 sections minimum
- At least 1 H2 MUST contain the primary keyword
- At least 30% of H2/H3 headings phrased as questions ("What is...?", "How does...?")
- Every H2 opens with a 40-60 word direct answer paragraph
- At least 1 comparison or data table in the article
- At least 1 bullet/numbered list per 500 words
- 90%+ of paragraphs under 100 words

### 6. FAQ SECTION (## FAQs or ## Frequently Asked Questions)
- Use H3 for each question (### 1. [Question]?)
- 5-10 questions that match real search queries
- Each answer: EXACTLY 1-2 sentences (10-60 words)
- NO preamble — no "Great question!", no "That's a common concern"
- Start each answer with the direct answer, then optionally expand with one sentence
- Include primary keyword in 2-3 of the questions

### 7. CONCLUSION (## Conclusion or ## Final Verdict)
- MUST contain a numbered or bulleted recap list (NOT just prose paragraphs)
- Clear recommendation or verdict
- Include primary keyword naturally
- Pattern: Recap list + Best recommendation + Final insight

### 8. CTA SECTION
- Specific call-to-action (try, download, sign up, bookmark, get started)
- Placed as the final section

---

## DATA, STATISTICS & AUTHORITY REQUIREMENTS

### Statistics (MANDATORY — 5+ per article)
- Include 5+ specific data points: percentages, dollar amounts, time metrics, growth rates
- Format each as: "[Specific number] [what it measures]" — e.g., "87% of marketers report..."
- Attribute at least 3 data points to named sources
- Distribute throughout the article, not clustered in one section
- Use real, plausible statistics appropriate to the topic

### Expert Attribution (MANDATORY — 2+ per article)
- Include 2+ statements attributed to experts, organizations, or research
- Format: "According to [Organization/Expert], [finding]"
- Reference studies, reports, or industry leaders by name
- This directly triggers the Princeton GEO "citation addition" boost

### NEVER Use
- Vague quantities: "many", "some", "a lot", "several", "various", "numerous"
- Generic fillers: "In today's rapidly evolving world...", "It goes without saying...",
  "cutting-edge", "state-of-the-art", "revolutionary", "game-changing", "next-level",
  "seamless", "robust", "leverage", "harness the power of", "take your X to the next level",
  "Whether you're a beginner or expert...", "In the ever-evolving landscape...",
  "Look no further", "without breaking the bank", "a must-have for", "unlock the full potential"
- Unattributed claims: "Studies show..." without naming the study
- Round-number estimates when specifics are available
- Empty enthusiasm: "amazing", "incredible", "mind-blowing", "stunning", "game-changer"
- Hedge stacking: "It might potentially possibly help..."
- Filler transitions: "That being said", "It's worth noting that", "Needless to say"

---

## FORMATTING & READABILITY RULES

### Heading Hierarchy
- H1 > H2 > H3 ONLY — NEVER skip from H1 to H3 or H2 to H4
- All H2 headings must be UNIQUE (no duplicates)
- Every heading must have content below it (no empty sections)

### Text Formatting
- **Bold** key terms and definitions on first mention in each section
- Use bullet points and numbered lists liberally
- Use tables for ANY comparative, multi-attribute, or specification data
- Use code blocks for commands, prompts, API calls, configurations
- Use *italic* for emphasis on secondary terms

### Readability Targets
- Average sentence length: 15-20 words
- Flesch-Kincaid grade level: 8-10 (accessible but authoritative)
- Active voice preferred over passive
- Short, punchy sentences mixed with medium-length explanatory ones

### FORBIDDEN Content
- Placeholder brackets: [insert], [your], [add], [todo], {keyword}, {topic}, [X]
- Lorem ipsum or any dummy text
- Empty sections with no content under a heading
- Broken markdown links or image tags
- Duplicate H2 headings
- Paragraphs over 200 words
- The word "delve" or "dive into"
- "In conclusion" as a transition (just write the conclusion)
- "Without further ado" or similar filler phrases

---

## WRITING STYLE & TONE (CRITICAL FOR ENGAGEMENT)

### Voice
- Write like a knowledgeable friend explaining something over coffee — authoritative but approachable
- Use "you" and "your" naturally — address the reader directly
- Be specific and honest, including limitations and honest assessments
- Use short, punchy sentences. Mix with one medium-length sentence for rhythm.

### Paragraph Rules
- Maximum 3 sentences per paragraph in body text
- One idea per paragraph — if you're making a new point, start a new paragraph
- Use line breaks liberally. White space is your friend.

### Practical Language
- Replace vague claims with testable specifics:
  BAD: "produces high-quality images"
  GOOD: "generates 1024×1024 images at 30 steps in ~8 seconds with coherent text rendering"
- Replace corporate speak with direct language:
  BAD: "Users may find that leveraging this tool enhances their workflow"
  GOOD: "This tool speeds up your workflow — most users save 2-3 hours per project"
- When describing a feature, ALWAYS include what a user can DO with it, not just what it IS

### Honesty Requirements
- Include "Not ideal for" or "Skip if" sections wherever relevant — readers trust honest content
- Mention real limitations alongside strengths
- Never claim something is "the best" without evidence or qualification
- Use "works well for [X], less suited for [Y]" framing

### Evergreen Pricing & Plans Language
When discussing plans, pricing, or comparisons, write for longevity:
- Focus on how each tier fits different usage patterns and creator profiles, using natural language that stays relevant over time
- Use confident, qualitative language when describing plans, pricing, limits, and availability
- Emphasize positioning, audience fit, and value rather than exact figures
- Prefer phrases that describe intent and suitability over numeric specificity
- Frame plans as tiers designed for different user needs instead of cost breakdowns
- Use relative comparisons ("more generous than," "scales with," "significantly more than the free tier") over absolute numbers
- Write as if the article should remain accurate even if pricing or limits change over time
- When specifics are necessary, add "at time of writing" or suggest checking official pricing pages
- Example: "The Pro tier is designed for growing creators who need consistent output" instead of "Pro costs $20/month for 100 images"

---

## READER ENGAGEMENT & PRACTICAL VALUE

### Engagement Hooks (at least 2 per article)
- Include a "Pro Tip" callout (use > **Pro Tip:** format) — share an insider technique
- Add a "Quick Win" — something the reader can try in under 2 minutes
- Include at least one conditional recommendation: "If [situation], try [specific action]"

### Practical Value Requirements
- Every tutorial section must include at least one copy-paste ready example (prompt, command, config)
- Include specific numbers readers can use: exact settings, dimensions, parameters
- Where relevant, include sample prompts or starter templates readers can copy directly
- Every "how to" step should tell the reader what they'll SEE as confirmation it worked

---

## KEYWORD INTEGRATION STRATEGY

For the primary keyword, place it naturally in:
1. First sentence of introduction (MANDATORY)
2. Entity definition sentence in first 150 words (MANDATORY)
3. Maximum 2 H2 headings may contain the primary keyword — the rest MUST use natural, descriptive phrasing
   - GOOD: "## What Is Midjourney V6?" + "## Pricing and Plans" + "## How to Write Better Prompts"
   - BAD: "## Midjourney V6 Features" + "## Midjourney V6 Pricing" + "## Midjourney V6 Pros and Cons"
4. 1-2 TL;DR bullet points
5. 2-3 FAQ questions
6. Conclusion section (1 mention)
7. Natural density: 0.5-1.5% across the full article
8. NEVER force the keyword where it reads unnaturally — readability always wins

---

{PLATFORM_CONTEXT}

## PRE-SUBMISSION QUALITY SELF-CHECK

Before finishing your article, verify it passes ALL of these checks:

**AEO Critical (MUST pass all):**
- [ ] 60%+ of H2 sections open with a 20-80 word direct answer paragraph
- [ ] TL;DR / Quick Summary section exists near the top
- [ ] FAQ section has 5+ questions, each answer is 10-60 words with no preamble

**AEO Important (pass 6/8):**
- [ ] 3+ snippable "X is/refers to/provides" definitional sentences
- [ ] At least 1 markdown table with header row + separator + data rows
- [ ] At least 1 list (bullet or numbered) per 500 words of content
- [ ] 90%+ of paragraphs are under 100 words
- [ ] Primary keyword is defined with "is/are/refers to" in first 200 words
- [ ] 2+ expert-attributed quotes or paraphrases included
- [ ] 5+ specific statistics or data points with numbers

**AEO Optional (aim for all):**
- [ ] 30%+ of H2/H3 headings are phrased as questions
- [ ] 5+ citation-worthy data points (percentages, dollar amounts, specific metrics)
- [ ] Introduction is under 120 words before the first H2
- [ ] Conclusion contains a numbered or bulleted recap list

**SEO Critical (MUST pass all):**
- [ ] Primary keyword appears in the H1 title
- [ ] Primary keyword appears in the first 100 words

**SEO Important (pass 4/5):**
- [ ] Title length is 30-60 characters
- [ ] Primary keyword appears in at least 1 H2 heading
- [ ] Article has 4+ H2 sections
- [ ] Total word count is 1000+ words
- [ ] FAQ section is present

**Content Quality (MUST pass all):**
- [ ] ZERO placeholder text ([insert], {keyword}, [your], etc.)
- [ ] No duplicate paragraphs or sections
- [ ] All H2 headings are unique
- [ ] No empty sections (every heading has content)
- [ ] Minimum 800 words total
- [ ] Conclusion section exists
- [ ] At least one CTA phrase present ("get started", "try it", "sign up", etc.)
- [ ] No paragraphs over 200 words
- [ ] "Last Updated:" timestamp at the end
`;

// ============================================================================
// 1) GUIDE BLOG STRUCTURE
// ============================================================================
function getGuidePrompt(keyword: string, title: string): string {
  return `${EXPERT_AEO_SEO_SYSTEM_PROMPT}

## GUIDE-SPECIFIC AEO TACTICS
- "How to" and "guide" content in URLs = 11.4% more Gemini citations
- Step-by-step numbered lists are the #1 extracted format for tutorial queries
- Include estimated time per step and total completion time (AI engines extract these)
- Add a prerequisites/requirements section — AI engines pull this for "what do I need" queries
- Troubleshooting tables (Problem | Cause | Solution) have the highest extraction rate for support queries
- "Common Mistakes" phrased as a question heading: "What Are Common [Topic] Mistakes?" captures long-tail searches
- Include specific settings, configurations, and version numbers (E-E-A-T experience signals)
- Add a "Best Practices" section with numbered tips — extracted for "[topic] best practices" queries

---

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 2,000-2,500 words
**Content Type:** Comprehensive Guide / Tutorial

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[INTRODUCTION: 2-3 sentences, under 80 words. Start with "${keyword}" in the first sentence. State the problem, promise the solution, preview what they'll learn. NO generic openers.]

## TL;DR (Quick Summary)
[3-5 bullet points, 50-70 words total. Each bullet is a complete extractable fact.]
- [What ${keyword} is in one line]
- [Who benefits most]
- [Best method/approach]
- [Key tool or resource recommendation]
- [Primary outcome or benefit]

## Table of Contents
[Links to all H2 sections below]

## What Is ${keyword}?
[DIRECT ANSWER: 40-60 words. Start with "${keyword} is..." as a self-contained definition. This is the #1 AI extraction target. Follow with 2-3 short paragraphs explaining why it matters now, what it replaces or improves, and its current relevance. Include 1-2 specific statistics.]

## Who Is This Guide For?
[DIRECT ANSWER: 40-60 words identifying the target audience. Then list specific audience segments:]
- **Beginners** who want to [specific goal]
- **Intermediate users** looking to [specific improvement]
- **Professionals** needing to [specific outcome]

## What Do You Need to Get Started?
[DIRECT ANSWER: 40-60 words on prerequisites. Then structured list:]
- [Tool/software requirement with version]
- [Account/access requirement]
- [Asset/file requirements]
- [Estimated time investment]

## How to ${keyword}: Step-by-Step Guide

### Step 1: [Action Verb + Specific Task]
[DIRECT ANSWER: 40-60 words summarizing this step and its outcome.]
[Detailed instructions with specific settings, configurations, screenshots guidance]
**Time estimate:** [X minutes]
**Pro tip:** [Insider tip for better results]

### Step 2: [Action Verb + Specific Task]
[DIRECT ANSWER: 40-60 words. Continue this pattern for 5-8 steps total.]

### Step 3: [Action Verb + Specific Task]
[Include specific tool settings, exact configurations, version-specific details]

[Continue for 5-8 total steps]

## What Are the Best Practices for ${keyword}?
[DIRECT ANSWER: 40-60 words summarizing the top practices.]
[Include a specific statistic about impact]

1. **[Practice Name]**: [Explanation with specific detail. "Based on testing..." or cite source]
2. **[Practice Name]**: [Explanation with measurable outcome]
3. **[Practice Name]**: [Continue for 5-10 practices]

## ${keyword} Examples
[DIRECT ANSWER: 40-60 words introducing the examples and what they demonstrate.]

### Example 1: [Specific Use Case]
[Detailed example with exact settings, prompts, or configurations and expected output]

### Example 2: [Different Use Case]
[Another practical demonstration with measurable results]

## What Are Common ${keyword} Mistakes to Avoid?
[DIRECT ANSWER: 40-60 words on the biggest pitfalls.]
- **[Mistake]**: [What users do wrong + specific correction with data]
- **[Mistake]**: [Problem + evidence-backed solution]
- **[Mistake]**: [Continue pattern]

## Troubleshooting ${keyword}
| Problem | Cause | Solution |
|---------|-------|----------|
| [Specific issue] | [Root cause] | [Step-by-step fix] |
| [Common error] | [Why it happens] | [How to resolve] |
| [Edge case] | [Technical reason] | [Workaround] |

## FAQs

### 1. What is ${keyword} and how does it work?
[1-2 sentence direct answer. No preamble.]

### 2. How long does it take to learn ${keyword}?
[Direct answer with specific timeline.]

### 3. What tools are best for ${keyword}?
[Direct answer with specific recommendation.]

### 4. Can beginners use ${keyword} effectively?
[Direct answer with qualification.]

### 5. What are the most common ${keyword} problems?
[Direct answer listing top issues.]

### 6. How much does ${keyword} cost?
[Direct answer with pricing details.]

### 7. Is ${keyword} worth it in 2026?
[Direct answer with evidence.]

[Add more to reach 7-10 FAQs total]

## Conclusion
[DO NOT start with "In conclusion." Write a numbered recap list:]
1. [Key takeaway 1]
2. [Key takeaway 2]
3. [Key takeaway 3]
4. [Key takeaway 4]
5. [Key takeaway 5]

[Best recommendation in 1-2 sentences]
[Final insight or expert tip]

## Get Started with ${keyword} Today
[Specific CTA: what to do first, where to go, what to try]
[Link suggestion to related content]

*Last Updated: February 2026*

---
Write the complete guide in Markdown. Use REAL specific examples, actual settings, concrete numbers, and expert-level detail. Every section must open with a direct answer paragraph.`;
}

// ============================================================================
// 2) PROMPT LIBRARY STRUCTURE
// ============================================================================
function getPromptLibraryPrompt(keyword: string, title: string): string {
  return `${EXPERT_AEO_SEO_SYSTEM_PROMPT}

## PROMPT-LIBRARY-SPECIFIC AEO TACTICS
- Code blocks with copy-paste prompts are the #1 extraction format for "[tool] prompts" queries
- Category organization captures long-tail "best [X] prompts for [use case]" queries
- Settings tables are extracted for "best [tool] settings" queries across all AI engines
- Prompt formula/template sections capture "how to write [tool] prompts" queries
- Include negative prompt examples — frequently searched and rarely well-answered
- Variation sections (same concept in 5 styles) = extracted for "[tool] styles" queries
- Before/After examples demonstrate expertise (E-E-A-T experience signal)

---

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,500 words
**Content Type:** Prompt Library / Prompt Pack

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[INTRODUCTION: 2-3 sentences, under 80 words. "${keyword}" in first sentence. Why these prompts matter + results users can expect + who benefits.]

## TL;DR (Quick Summary)
- [Best tool/model for these prompts]
- [Recommended key settings]
- [Primary use case]
- [Expected result quality]

## Table of Contents
[Links to all H2 sections]

## What Is the ${keyword} Prompt Formula?
[DIRECT ANSWER: 40-60 words explaining the framework. Start with "${keyword} prompts work best when..."]

**Essential Prompt Components:**
- **Subject**: [What to generate]
- **Style**: [Artistic/technical approach]
- **Detail modifiers**: [Quality, resolution, specificity]
- **Context**: [Use case, audience, tone]

\`\`\`
[Template formula: Subject + Style + Detail + Context]
\`\`\`

## ${keyword} Prompts by Category

### Category 1: [Use Case Name]
[DIRECT ANSWER: 40-60 words on what this category covers and best results.]

#### Prompt 1: [Descriptive Name]
\`\`\`
[Complete, copy-paste ready prompt with all parameters]
\`\`\`
**Best For:** [Specific scenario]
**Settings:** [Model, parameters, configuration]
**Expected Output:** [What user gets]

#### Prompt 2: [Descriptive Name]
\`\`\`
[Complete prompt]
\`\`\`
**Best For:** [Scenario]

[Continue for 8-12 prompts per category, 3-5 categories, 20-50 total prompts]

### Category 2: [Different Use Case]
[DIRECT ANSWER: 40-60 words.]
[Continue pattern with prompts]

### Category 3: [Another Use Case]
[Continue]

## How Do You Customize ${keyword} Prompts?
[DIRECT ANSWER: 40-60 words on prompt modification strategy.]

### Style Variation 1: [Realistic/Photographic]
\`\`\`
[Modified prompt]
\`\`\`

### Style Variation 2: [Artistic/Creative]
\`\`\`
[Modified prompt]
\`\`\`

[5 total style variations of the same base prompt]

## What Should You Avoid in ${keyword} Prompts?
[DIRECT ANSWER: 40-60 words on negative prompts and common anti-patterns.]
\`\`\`
[Negative prompt examples]
\`\`\`
**Common elements to exclude:** [Specific list]

## Best ${keyword} Settings
| Setting | Recommended Value | Why It Works |
|---------|-------------------|--------------|
| Model | [Specific model] | [Performance reason] |
| Resolution | [Size] | [Quality/speed tradeoff] |
| Quality/Steps | [Number] | [Detail level] |
| Guidance/CFG | [Value] | [Prompt adherence] |
| Seed | [Strategy] | [Consistency approach] |

## What Are Common ${keyword} Prompt Mistakes?
[DIRECT ANSWER: 40-60 words.]
1. **[Mistake]**: [What goes wrong + correct approach]
2. **[Mistake]**: [Problem + fix]
[5-7 mistakes total]

## Before vs After: ${keyword} Prompt Improvements
[Show specific examples of improving weak prompts into strong ones]

## FAQs

### 1. What makes a good ${keyword} prompt?
[Direct 1-2 sentence answer.]

### 2. How do I customize these ${keyword} prompts?
[Direct answer.]

### 3. Which ${keyword} prompt should beginners start with?
[Direct answer with specific recommendation.]

### 4. Can I combine multiple ${keyword} prompts?
[Direct answer.]

### 5. What are the best ${keyword} settings for quality?
[Direct answer with specific values.]

[Continue for 7-10 FAQs]

## Conclusion
1. [Key prompt strategy takeaway]
2. [Best prompt recommendation]
3. [Settings recommendation]
4. [Category most worth exploring]
5. [Final optimization tip]

[Clear recommendation for where to start]

## Try These ${keyword} Prompts Now
[CTA: copy your first prompt, try it, bookmark for later]

*Last Updated: February 2026*

---
Write the complete prompt library in Markdown. Make every prompt copy-paste ready with specific settings and expected outputs.`;
}

// ============================================================================
// 3) TIPS & TRICKS STRUCTURE
// ============================================================================
function getTipsPrompt(keyword: string, title: string): string {
  return `${EXPERT_AEO_SEO_SYSTEM_PROMPT}

## TIPS-SPECIFIC AEO TACTICS
- Numbered tips in H3 format ("### Tip 1: [Name]") are extracted as ordered lists by ALL AI engines
- Include a "Quick Wins" or top-3 summary early — AI engines extract this for "[topic] quick tips" queries
- Settings/preset recommendation tables are extracted for "best settings for [X]" queries
- Before/after comparisons demonstrate experience and get extracted for "how to improve [X]" queries
- Workflow sections capture "[X] workflow" and "how to automate [X]" queries
- Shortcut sections attract "fastest way to [X]" and "[X] shortcuts" queries
- Time-saving framing appeals to all AI engines for productivity-oriented queries

---

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** Tips & Tricks / Tutorial

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[INTRODUCTION: 2-3 sentences, under 80 words. "${keyword}" in first sentence. Why these tips matter + who benefits + what they'll achieve.]

## TL;DR (Quick Summary)
- [Most impactful tip in one line]
- [Second key tip]
- [Best tool or approach]
- [Expected outcome with specific metric]

## Table of Contents
[Links to all H2 sections]

## What Will You Achieve with These ${keyword} Tips?
[DIRECT ANSWER: 40-60 words on specific outcomes. Include a measurable result.]
[Specific results users can expect with timeframe]
[Before/after comparison if applicable]

## What Do You Need?
[DIRECT ANSWER: 40-60 words on requirements.]
**Tools Needed:**
- [Tool 1 with version/tier]
- [Tool 2]

**Skills Level:** [Beginner/Intermediate/Advanced]
**Time Investment:** [Specific time estimate]

## Step-by-Step ${keyword} Tutorial

### Step 1: [Action Verb + Task]
[DIRECT ANSWER: 40-60 words summarizing this step.]
[Detailed instructions with specific settings]
**Time:** [Estimate]

### Step 2: [Action Verb + Task]
[DIRECT ANSWER: 40-60 words.]
[Continue for 5-8 steps total]

## Top ${keyword} Pro Tips

### Tip 1: [Specific Tip Name]
[DIRECT ANSWER: Why this tip matters in 40-60 words.]
[Detailed explanation with specific example]
**Impact:** [Measurable improvement]

### Tip 2: [Specific Tip Name]
[Continue for 5-10 tips, each with measurable impact]

## What Are the Fastest ${keyword} Shortcuts?
[DIRECT ANSWER: 40-60 words on time-saving approaches.]
1. **[Shortcut]**: [How it saves time + specific time saved]
2. **[Shortcut]**: [Continue pattern]

## Recommended ${keyword} Settings
| Setting | Value | Use Case | Why |
|---------|-------|----------|-----|
| [Setting] | [Specific value] | [When to use] | [Evidence] |
| [Setting] | [Value] | [Scenario] | [Reason] |

## Advanced ${keyword} Tricks
[DIRECT ANSWER: 40-60 words on power-user techniques.]
[Advanced techniques with specific examples]

## What Are Common ${keyword} Mistakes?
[DIRECT ANSWER: 40-60 words on the biggest pitfalls.]
- **[Mistake]**: [Problem + specific solution + data if available]
- **[Mistake]**: [Continue pattern]

## FAQs

### 1. What is the most important ${keyword} tip?
[Direct 1-2 sentence answer.]

### 2. How long before I see ${keyword} results?
[Direct answer with specific timeline.]

### 3. Do these ${keyword} tips work for beginners?
[Direct answer.]

### 4. Which ${keyword} tip has the biggest impact?
[Direct answer with evidence.]

### 5. Can I combine multiple ${keyword} tips?
[Direct answer.]

[Continue for 7-10 FAQs]

## Conclusion
1. [Top tip recap]
2. [Second most important tip]
3. [Best tool recommendation]
4. [Quick win to start with]
5. [Long-term strategy tip]

[Final recommendation in 1-2 sentences]

## Start Using These ${keyword} Tips Now
[CTA: which tip to try first, where to begin]

*Last Updated: February 2026*

---
Write the complete tips article in Markdown with specific, actionable tips backed by real examples and measurable outcomes.`;
}

// ============================================================================
// 4) COMPARISON STRUCTURE
// ============================================================================
function getComparisonPrompt(keyword: string, title: string): string {
  return `${EXPERT_AEO_SEO_SYSTEM_PROMPT}

## COMPARISON-SPECIFIC AEO TACTICS
- Comparison tables get 47% higher AI citation rate — make the main table the CENTERPIECE with 7+ rows
- Include a "Winner" column in every comparison table (AI engines extract "best X for Y" answers)
- Use "vs" in at least one H2 heading — AI engines match "X vs Y" and "[tool] vs [tool]" queries
- Provide clear per-use-case winners: "Best for [use case]: [Tool]" — top extraction pattern
- Include EXACT pricing with dollar amounts and dates (AI engines extract pricing data heavily)
- "Best For" bullet sections mapping user types to recommendations = extracted for persona-based queries
- Side-by-side output examples demonstrate real testing (E-E-A-T experience signal)
- "Quick Verdict" at the top captures users who want the answer immediately

---

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,800-2,500 words
**Content Type:** Comparison (VS / Alternatives)

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[INTRODUCTION: 2-3 sentences, under 80 words. "${keyword}" in first sentence. What's compared + who should care + what decides the winner.]

## TL;DR (Quick Verdict)
- **Best for quality**: [Tool + why in one line]
- **Best for speed**: [Tool + why]
- **Best for price**: [Tool + why]
- **Best overall**: [Tool + one-line justification]

## Table of Contents
[Links to all H2 sections]

## How Did We Compare ${keyword}?
[DIRECT ANSWER: 40-60 words on testing methodology. Include E-E-A-T experience signals.]
- **Testing period:** [Duration]
- **Use cases tested:** [List]
- **Metrics measured:** [Specific criteria]

## Competitor Overviews

### [Tool A]: Overview
[DIRECT ANSWER: 40-60 words positioning this tool. Start with "[Tool A] is..."]
**Key Strengths:**
- [Strength 1 with specific detail]
- [Strength 2]

**Key Limitations:**
- [Limitation 1]
- [Limitation 2]

### [Tool B]: Overview
[DIRECT ANSWER: 40-60 words. Start with "[Tool B] is..."]
**Key Strengths:**
- [Strength 1]
- [Strength 2]

**Key Limitations:**
- [Limitation 1]
- [Limitation 2]

## ${keyword}: Full Comparison Table

| Feature | [Tool A] | [Tool B] | Winner |
|---------|----------|----------|--------|
| **Price** | [Exact $ amount] | [Exact $ amount] | [Tool] |
| **Quality** | [Rating + detail] | [Rating + detail] | [Tool] |
| **Speed** | [Specific time] | [Specific time] | [Tool] |
| **Ease of Use** | [Rating] | [Rating] | [Tool] |
| **Free Plan** | [Yes/No + limits] | [Yes/No + limits] | [Tool] |
| **API Access** | [Yes/No + pricing] | [Yes/No + pricing] | [Tool] |
| **Output Formats** | [List] | [List] | [Tool] |
| **Support** | [Channels] | [Channels] | [Tool] |

## How Does ${keyword} Pricing Compare?
[DIRECT ANSWER: 40-60 words with specific dollar amounts.]
[Detailed pricing breakdown with tiers, annual vs monthly, per-unit costs]

## How Does Quality Compare?
[DIRECT ANSWER: 40-60 words with specific quality metrics.]
[Detailed comparison with real output analysis]

## How Does Speed Compare?
[DIRECT ANSWER: 40-60 words with specific time measurements.]
[Generation times, processing speeds, batch performance]

## Which Is Easier to Use?
[DIRECT ANSWER: 40-60 words comparing learning curves.]
[Interface comparison, onboarding experience, documentation quality]

## Who Should Use Which ${keyword} Option?
[DIRECT ANSWER: 40-60 words on use-case mapping.]
- **Best for marketing teams**: [Tool] because [reason with evidence]
- **Best for developers**: [Tool] because [reason]
- **Best free option**: [Tool] — [what you get for free]
- **Best for professionals**: [Tool] because [reason]
- **Best for beginners**: [Tool] because [reason]

## Real Output Comparison
[DIRECT ANSWER: 40-60 words on the test setup.]

### Same Input, Different Tools
**Input:** \`[Exact prompt/query used]\`
- **[Tool A] Output:** [Specific description of result with quality details]
- **[Tool B] Output:** [Specific description with quality details]

## Pros & Cons Summary

### [Tool A] Pros & Cons
**Pros:** [3-5 specific pros]
**Cons:** [2-4 honest cons]

### [Tool B] Pros & Cons
**Pros:** [3-5 specific pros]
**Cons:** [2-4 honest cons]

## FAQs

### 1. Which is better for ${keyword}?
[Direct answer with clear recommendation.]

### 2. How does ${keyword} pricing compare?
[Direct answer with specific numbers.]

### 3. Which ${keyword} option is easier?
[Direct answer.]

### 4. Can I use both together?
[Direct answer.]

### 5. Which ${keyword} option is best for beginners?
[Direct answer.]

### 6. Which has better customer support?
[Direct answer.]

### 7. Is ${keyword} worth the premium price?
[Direct answer with value analysis.]

[7-10 FAQs total]

## Conclusion
1. [Winner for overall use]
2. [Winner for budget users]
3. [Winner for quality]
4. [Winner for specific use case]
5. [Clear final recommendation]

[1-2 sentence final verdict]

## Try the Winner
[CTA: specific action to get started with recommended tool]

*Last Updated: February 2026*

---
Write the complete comparison in Markdown with specific numbers, real pricing, actual output comparisons, and clear winners per category.`;
}

// ============================================================================
// 5) USE CASES STRUCTURE
// ============================================================================
function getUseCasePrompt(keyword: string, title: string): string {
  return `${EXPERT_AEO_SEO_SYSTEM_PROMPT}

## USE-CASE-SPECIFIC AEO TACTICS
- ROI/metrics tables are extracted for "[X] ROI" and "is [X] worth it" queries
- Template/prompt code blocks are extracted for "how to use [X] for [Y]" queries
- Industry-specific subsections capture long-tail "[X] for [industry]" queries (e-commerce, SaaS, healthcare)
- Checklist formats are extracted for "what do I need for [X]" queries
- Before/after case study data = strongest E-E-A-T experience signal
- Tools comparison table captures "[X] tools" and "best tools for [Y]" queries
- Step-by-step solution workflows are the #1 format for "how to implement [X]" queries
- Include specific KPIs and metrics (CTR, ROAS, engagement) — AI extracts these for ROI queries

---

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** Use Case (Marketing / Social Media / E-commerce / Business)

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[INTRODUCTION: 2-3 sentences, under 80 words. "${keyword}" in first sentence. Industry problem + solution + measurable outcomes.]

## TL;DR (Quick Summary)
- [Problem solved with ${keyword}]
- [Best approach in one line]
- [Expected ROI or outcome with specific metric]
- [Recommended tool]

## Table of Contents
[Links to all H2 sections]

## What Problem Does ${keyword} Solve?
[DIRECT ANSWER: 40-60 words defining the problem. Start with "${keyword} addresses..."]

**The real-world challenge:**
[Detailed pain point with specific data on cost/impact]

**Why it matters now:**
[Business impact with statistics]

**The desired outcome:**
[Measurable end state]

## How Does ${keyword} Work? (Solution Workflow)
[DIRECT ANSWER: 40-60 words on the solution approach.]

### Step 1: [Setup Phase]
[Detailed instructions with specific tools and configurations]

### Step 2: [Core Implementation]
[Continue for 5-7 steps total]

### Step 3: [Optimization Phase]
[Include specific settings and best practices]

## ${keyword} Examples & Templates
[DIRECT ANSWER: 40-60 words on what templates are provided.]

### Template 1: [Specific Use Case]
**Context:** [When to use this]
**Template/Prompt:** \`[Exact template ready to use]\`
**Expected Output:** [What user gets]
**Best For:** [Audience segment]

### Template 2: [Different Use Case]
[Continue pattern for 3-5 templates]

## Best Tools for ${keyword}
| Tool | Best For | Pricing | Rating |
|------|----------|---------|--------|
| [Tool 1] | [Use case] | [Exact price] | [Rating] |
| [Tool 2] | [Use case] | [Exact price] | [Rating] |
| [Tool 3] | [Use case] | [Exact price] | [Rating] |

**Recommended Stack:**
- **Free tier:** [Best free option]
- **Professional:** [Best paid option]

## Tips for Better ${keyword} Results
[DIRECT ANSWER: 40-60 words on optimization.]
1. **[Tip]**: [Specific advice with data or example]
2. **[Tip]**: [Continue for 5-7 tips]

## ${keyword} by Industry

### [Industry 1] Example
[Specific use case with metrics and outcomes]

### [Industry 2] Example
[Different industry application]

### [Industry 3] Example
[Another industry with specific results]

## ${keyword} Implementation Checklist
- [ ] [Prerequisite 1]
- [ ] [Tool setup]
- [ ] [Configuration step]
- [ ] [Testing step]
- [ ] [Launch step]
- [ ] [Measurement setup]

## What ROI Can You Expect from ${keyword}?
[DIRECT ANSWER: 40-60 words with specific metrics.]

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| [KPI 1] | [Baseline] | [Result] | [% change] |
| [KPI 2] | [Baseline] | [Result] | [% change] |

## FAQs

### 1. How long does it take to implement ${keyword}?
[Direct answer with specific timeline.]

### 2. What ROI can I expect from ${keyword}?
[Direct answer with metrics.]

### 3. Do I need technical skills for ${keyword}?
[Direct answer.]

### 4. What are common ${keyword} challenges?
[Direct answer.]

### 5. How do I measure ${keyword} success?
[Direct answer with specific KPIs.]

[7-10 FAQs total]

## Conclusion
1. [Problem recap]
2. [Solution approach]
3. [Best tool recommendation]
4. [Expected ROI]
5. [First step to take]

[Final recommendation]

## Get Started with ${keyword} Today
[CTA: specific first action]

*Last Updated: February 2026*

---
Write the complete use case article in Markdown with specific industry examples, real metrics, ready-to-use templates, and measurable outcomes.`;
}

// ============================================================================
// 6) API DOCUMENTATION STRUCTURE
// ============================================================================
function getAPIPrompt(keyword: string, title: string): string {
  return `${EXPERT_AEO_SEO_SYSTEM_PROMPT}

## API-SPECIFIC AEO TACTICS
- Multi-language code examples (curl + Python + JavaScript) capture "how to use [API] in [language]" queries — cover 90%+ of API search queries
- Parameter tables (Param | Type | Required | Description) = top extraction format for API documentation queries
- Error code tables (Code | Message | Fix) = captured for "[API] error [code]" troubleshooting queries
- Rate limit and pricing tables = extracted for "[API] pricing" and "[API] limits" queries
- Working curl examples are the MOST extracted format for API "getting started" queries
- Response JSON examples = extracted for "[API] response format" queries
- Authentication sections = extracted for "how to authenticate [API]" queries
- SDK/integration examples capture "[API] with [framework]" queries

---

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** API Documentation / Integration Guide

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[INTRODUCTION: 2-3 sentences, under 80 words. "${keyword}" in first sentence. What the API enables + who it's for + key capability.]

## TL;DR (Quick Summary)
- [What ${keyword} API does in one line]
- [Authentication method]
- [Key endpoint]
- [Free tier availability and limits]

## Table of Contents
[Links to all sections]

## What Is the ${keyword} API?
[DIRECT ANSWER: 40-60 words. Start with "The ${keyword} API is..." Define capabilities, use cases, and market position.]
[Key capabilities list]
[Who uses it and for what]

## How to Authenticate with ${keyword}
[DIRECT ANSWER: 40-60 words on the auth process.]

### Getting Your API Key
1. [Step with specific URL]
2. [Step]
3. [Step]

### Environment Setup
\`\`\`bash
export API_KEY="your_api_key_here"
\`\`\`

### Using Your API Key
\`\`\`bash
Authorization: Bearer YOUR_API_KEY
\`\`\`

## How to Make Your First ${keyword} API Request
[DIRECT ANSWER: 40-60 words on the basic request flow.]

### Request Format
\`\`\`bash
curl -X POST "https://api.example.com/v1/endpoint" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "param1": "value1",
    "param2": "value2"
  }'
\`\`\`

### Sample Response
\`\`\`json
{
  "status": "success",
  "data": {
    "id": "abc123",
    "result": "...",
    "metadata": {}
  }
}
\`\`\`

## ${keyword} API Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| model | string | Yes | — | [Specific description] |
| size | string | No | [default] | [Description] |
| quality | string | No | [default] | [Description] |
| format | string | No | [default] | [Description] |

## ${keyword} Code Examples

### Python
\`\`\`python
import requests

API_KEY = "your_api_key"
url = "https://api.example.com/v1/endpoint"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

data = {
    "param1": "value1",
    "param2": "value2"
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result)
\`\`\`

### JavaScript / Node.js
\`\`\`javascript
const response = await fetch("https://api.example.com/v1/endpoint", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    param1: "value1",
    param2: "value2"
  })
});

const result = await response.json();
console.log(result);
\`\`\`

## ${keyword} Error Codes and Fixes
| Error Code | Message | Cause | Fix |
|------------|---------|-------|-----|
| 400 | Bad Request | Invalid parameters | [Specific fix] |
| 401 | Unauthorized | Invalid/expired API key | [Specific fix] |
| 403 | Forbidden | Insufficient permissions | [Specific fix] |
| 429 | Rate Limited | Too many requests | [Specific fix with retry strategy] |
| 500 | Server Error | Internal server issue | [Specific fix] |

## ${keyword} Rate Limits and Pricing
[DIRECT ANSWER: 40-60 words on pricing structure.]

| Plan | Rate Limit | Monthly Price | Per-Request Cost | Best For |
|------|------------|---------------|------------------|----------|
| Free | [X req/min] | $0 | $0 | Testing/hobby |
| Pro | [X req/min] | $[amount]/mo | $[amount] | Production |
| Enterprise | Custom | Custom | Negotiable | Scale |

**Cost optimization tips:**
- [Specific tip to reduce API costs]
- [Batching strategy]
- [Caching recommendation]

## How to Integrate ${keyword} API
[DIRECT ANSWER: 40-60 words on integration approaches.]
[Zapier, Make/Integromat, webhooks, SDK examples]

## FAQs

### 1. How do I get a ${keyword} API key?
[Direct answer with steps.]

### 2. What is the ${keyword} API rate limit?
[Direct answer with specific numbers.]

### 3. Is there a free ${keyword} API tier?
[Direct answer with details.]

### 4. How do I handle ${keyword} API errors?
[Direct answer with retry strategy.]

### 5. Can I use ${keyword} API in production?
[Direct answer with considerations.]

### 6. What programming languages support ${keyword} API?
[Direct answer.]

### 7. How much does ${keyword} API cost per request?
[Direct answer with breakdown.]

[7-10 FAQs total]

## Conclusion
1. [Authentication recap]
2. [Key endpoint summary]
3. [Best practices]
4. [Pricing recommendation]
5. [Next steps]

[Final recommendation]

## Get Your ${keyword} API Key
[CTA: Sign up, get key, make first request]

*Last Updated: February 2026*

---
Write the complete API guide in Markdown with working code examples, specific technical details, and real endpoint patterns.`;
}

// ============================================================================
// 7) UPCOMING / TRENDS STRUCTURE
// ============================================================================
function getUpcomingPrompt(keyword: string, title: string): string {
  return `${EXPERT_AEO_SEO_SYSTEM_PROMPT}

## UPCOMING/TRENDS-SPECIFIC AEO TACTICS
- Content freshness is THE most critical factor: 65% of AI bot hits target content from the past year
- Include explicit dates everywhere: "Expected Q2 2026", "Announced January 15, 2026"
- Confirmed vs Rumored distinction = high-trust signal for AI engines (reduces hallucination risk for them)
- "Last Updated" timestamp is MANDATORY for this content type — AI engines heavily weight freshness
- Comparison tables (Current vs Expected) = extracted for "what's new in [X]" queries
- Release timeline tables = extracted for "[X] release date" queries
- "Alternatives you can use now" = captures "[X] alternatives while waiting" queries
- Feature speculation with clear sourcing = extracted for "[X] features" and "[X] rumors" queries

---

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,000-1,500 words
**Content Type:** Upcoming / Trends / News

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[INTRODUCTION: 2-3 sentences, under 80 words. "${keyword}" in first sentence. What's coming + why it matters + timeline.]

## TL;DR (Key Takeaways)
- [Most important confirmed fact]
- [Expected release window]
- [Key new feature/capability]
- [Who should care and why]

## Table of Contents
[Links to all sections]

## What Is ${keyword}?
[DIRECT ANSWER: 40-60 words. Start with "${keyword} is..." Define what this upcoming release/trend represents. Include date context.]

## ${keyword} Release Timeline
[DIRECT ANSWER: 40-60 words on the current timeline status.]

| Milestone | Expected Date | Status |
|-----------|---------------|--------|
| [Alpha/Beta] | [Specific date] | Confirmed / Rumored |
| [Public Release] | [Specific date] | Confirmed / Rumored |
| [Feature X] | [Specific date] | Confirmed / Rumored |
| [Full Rollout] | [Specific date] | Confirmed / Rumored |

**Confirmed Features:**
- [Feature 1 — with source]
- [Feature 2 — with source]

**Rumored Features:**
- [Feature 1 — with source and confidence level]
- [Feature 2]

## What Are the Expected ${keyword} Features?
[DIRECT ANSWER: 40-60 words on the most impactful expected features.]

### Feature 1: [Name]
[What it does + source + impact. Mark as Confirmed/Rumored.]

### Feature 2: [Name]
[Continue for 3-6 features]

## Who Should Care About ${keyword}?
[DIRECT ANSWER: 40-60 words on target audience.]
- **[Audience 1]**: [Specific reason with use case]
- **[Audience 2]**: [Reason]
- **[Audience 3]**: [Reason]

## How Does ${keyword} Compare to the Current Version?
| Feature | Current | ${keyword} (Expected) | Improvement |
|---------|---------|----------------------|-------------|
| [Feature] | [Current spec] | [Expected spec] | [% or description] |
| [Feature] | [Current] | [Expected] | [Change] |

## What Alternatives Can You Use Now?
[DIRECT ANSWER: 40-60 words on current options while waiting.]

| Alternative | How It Compares | Pricing | Best For |
|-------------|-----------------|---------|----------|
| [Tool 1] | [Comparison] | [Price] | [Use case] |
| [Tool 2] | [Comparison] | [Price] | [Use case] |

## FAQs

### 1. When is ${keyword} releasing?
[Direct answer with best known date and confidence level.]

### 2. How much will ${keyword} cost?
[Direct answer with pricing estimate or confirmed pricing.]

### 3. Should I wait for ${keyword} or use alternatives now?
[Direct advice with reasoning.]

### 4. What is confirmed vs rumored about ${keyword}?
[Direct categorization.]

### 5. How do I get early access to ${keyword}?
[Direct answer with steps if available.]

[7-10 FAQs total]

## Conclusion
1. [Key confirmed fact]
2. [Expected timeline]
3. [Most impactful feature]
4. [Best alternative now]
5. [What to watch for next]

[Clear recommendation on waiting vs using alternatives]

## Stay Updated on ${keyword}
[CTA: Newsletter, follow, bookmark. Check back for updates.]

*Last Updated: February 2026*

---
Write the complete trends article in Markdown. CLEARLY distinguish confirmed facts from speculation. Include specific dates and sourcing.`;
}

// ============================================================================
// 8) TROUBLESHOOTING STRUCTURE
// ============================================================================
function getTroubleshootPrompt(keyword: string, title: string): string {
  return `${EXPERT_AEO_SEO_SYSTEM_PROMPT}

## TROUBLESHOOT-SPECIFIC AEO TACTICS
- "Quick Fix" at the very top = direct answer for AI "how to fix [X]" queries (highest extraction rate)
- Error code tables (Code | Message | Cause | Fix) = the MOST extracted format for troubleshooting queries
- Include EXACT error messages in H2/H3 headings — AI engines match exact error strings from user queries
- Checklist format with checkboxes for systematic diagnosis = extracted for "[X] not working" queries
- Device/browser-specific fix sections capture "[X] on Chrome/mobile/Mac" long-tail queries
- "Root cause" explanation sections = extracted for "why does [X] happen" queries
- Prevention tips capture "how to prevent [X]" and "avoid [X]" queries
- "Still Having Issues?" at the bottom captures long-tail escalation queries

---

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,000-1,500 words
**Content Type:** Troubleshooting & Fix Guide

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[INTRODUCTION: 2-3 sentences, under 80 words. "${keyword}" in first sentence. Acknowledge the problem + promise solution + how many fixes covered.]

## TL;DR (Quick Fix)
[50-70 words: THE fastest solution in a quick paragraph]
\`\`\`
[Quick command or action if applicable]
\`\`\`
[If not a command: bullet list of the 3 fastest steps]

## Table of Contents
[Links to all solutions]

## What Does "${keyword}" Mean?
[DIRECT ANSWER: 40-60 words explaining the error/problem. Start with "${keyword} occurs when..."]
[Technical explanation in plain language]

**Common causes:**
- [Cause 1 with frequency]
- [Cause 2]
- [Cause 3]

## Quick Diagnostic Checklist
Before trying detailed fixes, check these:
- [ ] [Quick check 1 — most common cause]
- [ ] [Quick check 2]
- [ ] [Quick check 3]
- [ ] [Quick check 4]
- [ ] [Quick check 5]

## Fix #1: [Most Common Solution Name]
[DIRECT ANSWER: 40-60 words on when this fix applies and success rate.]

**Steps:**
1. [Specific action with exact navigation path]
2. [Specific action]
3. [Specific action]

\`\`\`
[Code/command if applicable]
\`\`\`

**Expected Result:** [What success looks like]
**Success Rate:** [Estimated % of cases this resolves]

## Fix #2: [Second Solution]
[DIRECT ANSWER: 40-60 words.]

**Steps:**
1. [Action]
2. [Action]

## Fix #3: [Alternative Approach]
[Continue pattern for 3-5 fixes total, ordered from most to least common]

## Why Does ${keyword} Happen? (Root Cause)
[DIRECT ANSWER: 40-60 words on the technical root cause.]
[Detailed explanation of what triggers this issue]
[Environmental factors that contribute]

## How to Prevent ${keyword}
[DIRECT ANSWER: 40-60 words on prevention.]
1. **[Prevention method]**: [Specific action + why it works]
2. **[Prevention method]**: [Action + evidence]
3. **[Prevention method]**: [Action]

## ${keyword} Error Variations by Platform
| Platform/Tool | Error Variation | Specific Fix |
|---------------|----------------|--------------|
| [Platform 1] | [Exact error text] | [Fix] |
| [Platform 2] | [Error variation] | [Fix] |
| [Platform 3] | [Error variation] | [Fix] |

## Device-Specific Fixes
- **Windows:** [Specific fix steps]
- **Mac:** [Specific fix steps]
- **Linux:** [Specific fix steps]
- **Mobile:** [Specific fix steps]

## FAQs

### 1. Why do I keep getting ${keyword}?
[Direct answer with most common cause.]

### 2. Is ${keyword} a serious problem?
[Direct answer on severity and data loss risk.]

### 3. Will I lose data because of ${keyword}?
[Direct answer with precautions.]

### 4. How long does it take to fix ${keyword}?
[Direct answer with time estimates per fix.]

### 5. When should I contact support for ${keyword}?
[Direct answer on escalation criteria.]

[7-10 FAQs total]

## Conclusion
1. [Quick fix recap]
2. [Most common root cause]
3. [Best prevention method]
4. [When to escalate]
5. [Key diagnostic step]

[Final recommendation]

## Still Having ${keyword} Issues?
[When to contact support]
[Community resources]
[Related troubleshooting guides]

*Last Updated: February 2026*

---
Write the complete troubleshooting guide in Markdown with exact error messages, specific step-by-step fixes, and success rate estimates.`;
}

// ============================================================================
// 9) TOOLS & MODELS STRUCTURE
// ============================================================================
function getToolsPrompt(keyword: string, title: string): string {
  return `${EXPERT_AEO_SEO_SYSTEM_PROMPT}

## TOOLS-SPECIFIC AEO TACTICS
- Pricing tables = #1 extraction target for "[tool] pricing" and "[tool] free plan" queries
- Pros/Cons lists = extracted for "[tool] review", "is [tool] good", "[tool] pros and cons" queries
- Alternatives comparison tables = captured for "[tool] alternatives" and "tools like [X]" queries
- Feature lists with specific capabilities = match "[tool] features" queries across all AI engines
- Version/changelog info = freshness signal and captures "[tool] latest version" queries
- "Getting Started" numbered steps = extracted for "how to use [tool]" and "[tool] tutorial" queries
- Benchmark/performance tables = extracted for "[tool] performance" and "[tool] vs [competitor]" queries
- "Best For" persona mapping = high extraction for "who should use [tool]" queries

---

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** Tool / Model Deep Dive

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[INTRODUCTION: 2-3 sentences, under 80 words. "${keyword}" in first sentence. What it is + why it matters + who should use it.]

## TL;DR (Quick Summary)
- [What ${keyword} does in one line]
- [Best for which use case]
- [Starting price]
- [Key differentiator]

## Table of Contents
[Links to all H2 sections]

## What Is ${keyword}?
[DIRECT ANSWER: 40-60 words. Start with "${keyword} is..." Include company/creator, launch date, market position.]
[Company background and market context]
[Key positioning against competitors]

## Key Features and Capabilities
[DIRECT ANSWER: 40-60 words highlighting the standout features.]

### Feature 1: [Name]
[Detailed explanation with specific capabilities and use cases]

### Feature 2: [Name]
[Continue for 5-8 key features]

## How It Works
[DIRECT ANSWER: 40-60 words on the underlying technology/process.]
[Simplified workflow explanation]
[Technical overview in accessible language]

## Who Is It Best For?
[DIRECT ANSWER: 40-60 words on ideal users.]
- **[User type 1]**: [Specific reason with use case scenario]
- **[User type 2]**: [Reason]
- **[User type 3]**: [Reason]

**Not ideal for:**
- [User type who should skip + why]

## Getting Started (Step-by-Step)

### Step 1: [Sign Up / Access]
[Specific instructions with URL guidance]

### Step 2: [Initial Setup]
[Configuration steps]

### Step 3: [First Use]
[Walk through creating first output]

[5-7 steps to first success]

## Pricing and Plans
| Plan | Monthly Price | Annual Price | Key Features | Best For |
|------|--------------|--------------|--------------|----------|
| Free | $0 | $0 | [Feature limits] | [User type] |
| Basic | $[X]/mo | $[X]/yr | [Features] | [User type] |
| Pro | $[X]/mo | $[X]/yr | [Features] | [User type] |
| Enterprise | Custom | Custom | [Features] | [User type] |

**Free Plan Details:**
- [What's included]
- [Key limitations]
- [Usage caps]

## Honest Pros and Cons

**Pros:**
- [Specific strength 1 with detail]
- [Strength 2]
- [Strength 3]
- [Strength 4]
- [Strength 5]

**Cons:**
- [Honest limitation 1 with context]
- [Limitation 2]
- [Limitation 3]

## How Does It Compare?
[DIRECT ANSWER: 40-60 words on competitive positioning.]

### [Alternative 1 Name]
**What it does:** [One-line description]
**Strengths:** [2-3 bullet points]
**Limitations:** [1-2 bullet points]
**Best for:** [One-line use case]

### [Alternative 2 Name]
[Same format — Description, Strengths, Limitations, Best for]

| Feature | ${keyword} | [Alt 1] | [Alt 2] |
|---------|------------|---------|---------|
| Price | [Specific] | [Specific] | [Specific] |
| Quality | [Rating] | [Rating] | [Rating] |
| Speed | [Metric] | [Metric] | [Metric] |
| Best For | [Use case] | [Use case] | [Use case] |

## Performance Benchmarks
| Metric | ${keyword} | Industry Average |
|--------|------------|-----------------|
| [Speed metric] | [Value] | [Average] |
| [Quality metric] | [Value] | [Average] |
| [Accuracy metric] | [Value] | [Average] |

## Latest Updates and Changes
[Latest version updates and changelog highlights]
- **[Latest version]**: [Key changes]
- **[Previous version]**: [What changed]

## Sample ${keyword} Workflows

### Workflow 1: [Most Common Use Case]
1. [Step with specific setting/parameter]
2. [Step with exact configuration]
3. [Expected result with quality/time metric]

### Workflow 2: [Different Use Case]
[Same step pattern with specific settings and expected output]

> **Pro Tip:** [Insider technique that improves results — discovered through testing, not listed in official docs]

## FAQs

### 1. Is ${keyword} free to use?
[Direct answer with free tier details.]

### 2. What can I do with ${keyword}?
[Direct answer with top 3 use cases.]

### 3. Is ${keyword} good for beginners?
[Direct answer with learning curve assessment.]

### 4. How does ${keyword} compare to alternatives?
[Direct answer with key differentiators.]

### 5. Is ${keyword} worth it in 2026?
[Direct answer with value assessment.]

### 6. What are ${keyword}'s biggest limitations?
[Direct honest answer.]

### 7. Does ${keyword} have an API?
[Direct answer with details.]

[7-10 FAQs total]

## Conclusion
1. [What it is and who it's for]
2. [Key strength]
3. [Pricing value assessment]
4. [Main limitation to consider]
5. [Clear recommendation]

[Who should use it vs. who should look elsewhere]

## Get Started Today
[CTA: specific action to get started]

*Last Updated: February 2026*

---
Write the complete tool guide in Markdown with specific features, real pricing, honest pros/cons, and clear positioning.`;
}

// ============================================================================
// 10) REVIEW STRUCTURE
// ============================================================================
function getReviewPrompt(keyword: string, title: string): string {
  return `${EXPERT_AEO_SEO_SYSTEM_PROMPT}

## REVIEW-SPECIFIC AEO TACTICS
- "How I Tested" section = the MOST critical E-E-A-T signal for Google's Product Review update
- Rating summary table at the top (Aspect | Rating | Notes) = extracted for "is [X] good" and "[X] rating" queries
- Quantitative ratings (X/10 or X/5) in a visible table = the #1 extraction target for review queries
- "Best For" and "Skip If" personas = extracted for "who should use [X]" and "should I use [X]" queries
- Comparison with alternatives table = high citation rate for "[X] vs [Y]" queries
- Testing methodology details (duration, metrics) = strongest E-E-A-T experience signal
- Honest cons with specific detail = higher trust signal than pure positive reviews
- "Final Verdict" with numerical rating = extracted as the definitive answer for "[X] review" queries
- Include "Based on [X] hours/weeks of testing" = AI engines specifically look for testing duration signals

---

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** In-Depth Review

## GOOGLE PRODUCT REVIEW REQUIREMENTS (follow for maximum AI citation)
- Show significant expertise through SPECIFIC observations, not generic spec listings
- Share personal/hands-on testing experiences with measurable results
- Use quantitative data and direct comparisons
- Include original observations that go beyond manufacturer claims
- Explain what sets the product apart with EVIDENCE
- Show proof of personal testing (methodology, duration, scenarios)

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[INTRODUCTION: 2-3 sentences, under 80 words. "${keyword}" in first sentence. What you're reviewing + your overall take + testing context.]

## TL;DR (Quick Verdict)
**Overall Rating:** [X/10] (or ⭐⭐⭐⭐☆ [X/5])

| Aspect | Rating | Notes |
|--------|--------|-------|
| Features | [X/10] | [One-line assessment] |
| Ease of Use | [X/10] | [One-line] |
| Value for Money | [X/10] | [One-line] |
| Performance | [X/10] | [One-line] |
| Support | [X/10] | [One-line] |

**Best For:** [Specific user type and scenario]
**Skip If:** [Who should NOT use this and why]

## Table of Contents
[Links to all H2 sections]

## What Is ${keyword}?
[DIRECT ANSWER: 40-60 words. Start with "${keyword} is..." Include company, category, and market position.]
[Background and context]

## How I Tested ${keyword}
[CRITICAL E-E-A-T SECTION — be specific and detailed]
- **Testing Period:** [Exact duration — e.g., "3 weeks of daily use"]
- **Use Cases Tested:** [List specific scenarios]
- **Compared Against:** [Named competitors]
- **Metrics Measured:** [What you evaluated and how]
- **Testing Environment:** [Hardware, software, conditions]

## Key Features: In-Depth Analysis

### Feature 1: [Name]
[DIRECT ANSWER: 40-60 words on this feature's real-world performance.]
[Specific results from testing]
[Comparison to competitor's version]

### Feature 2: [Name]
[Continue for 4-6 major features, each with testing evidence]

## What I Liked (Pros)
[DIRECT ANSWER: 40-60 words on the biggest strengths.]
1. **[Strength]**: [Specific evidence from testing — include numbers]
2. **[Strength]**: [Detail with comparison]
[5-8 pros total, each with evidence]

## What Could Be Better (Cons)
[DIRECT ANSWER: 40-60 words — honest assessment.]
1. **[Limitation]**: [Specific impact on real usage + workaround if available]
2. **[Limitation]**: [Detail with severity assessment]
[3-5 cons total, honest and specific]

## Pricing: Is It Worth the Money?
[DIRECT ANSWER: 40-60 words on value for money.]

| Plan | Price | What You Get | Value Rating |
|------|-------|--------------|--------------|
| Free | $0 | [Features and limits] | [Rating] |
| Pro | $[X]/mo | [Features] | [Rating] |
| Enterprise | $[X]/mo | [Features] | [Rating] |

**Value assessment:** [Honest analysis of price vs. what you get]

## How Does It Compare?
[DIRECT ANSWER: 40-60 words on competitive positioning.]

| Feature | ${keyword} | [Competitor 1] | [Competitor 2] |
|---------|------------|----------------|----------------|
| Price | [Amount] | [Amount] | [Amount] |
| Quality | [Rating] | [Rating] | [Rating] |
| Speed | [Metric] | [Metric] | [Metric] |
| Free Tier | [Detail] | [Detail] | [Detail] |
| Best For | [Use case] | [Use case] | [Use case] |

## Who Should Use It?

### Perfect For:
- [User type with specific scenario and why]
- [User type]
- [User type]

### Not Ideal For:
- [User type who should skip + specific reason]
- [User type]

## Real-World Use Cases I Tested

### Use Case 1: [Scenario Name]
- **Task:** [What I tried to accomplish]
- **Settings Used:** [Exact configuration]
- **Result:** [Specific outcome with metrics]
- **Verdict:** [One-line honest assessment]

### Use Case 2: [Different Scenario]
[Same pattern — Task, Settings, Result, Verdict]

> **Pro Tip:** [Technique discovered during testing that isn't in official docs]

## FAQs

### 1. Is ${keyword} worth it in 2026?
[Direct answer with conditions.]

### 2. What is the biggest ${keyword} limitation?
[Direct honest answer.]

### 3. How does ${keyword} compare to its top alternative?
[Direct comparison with key differentiators.]

### 4. Does ${keyword} have a free version?
[Direct answer with what's included.]

### 5. How steep is the ${keyword} learning curve?
[Direct answer with timeline.]

### 6. Is ${keyword} good for professional use?
[Direct answer with evidence.]

### 7. What's the best ${keyword} alternative?
[Direct answer with recommendation.]

[7-10 FAQs total]

## Final Verdict
**Overall Rating: [X/10]**

1. [Biggest strength recap]
2. [Second strength]
3. [Biggest limitation]
4. [Value assessment]
5. [Clear recommendation: buy, try, or skip]

[Who should buy + who should skip, in 2-3 sentences]

## Get Started Today
[CTA: specific action]

*Last Updated: February 2026*

---
Write the complete review in Markdown showing genuine expertise through specific observations, honest pros/cons, real testing methodology, and clear comparative data.`;
}

// ============================================================================
// POST-GENERATION CONTENT CLEANUP
// ============================================================================
function cleanGeneratedContent(content: string, keyword: string): string {
  let cleaned = content;

  // 1. Remove leaked placeholders
  cleaned = cleaned.replace(/\[insert[^\]]*\]/gi, '');
  cleaned = cleaned.replace(/\[your[^\]]*\]/gi, '');
  cleaned = cleaned.replace(/\[main competitor\]/gi, 'alternatives');
  cleaned = cleaned.replace(/\[add[^\]]*\]/gi, '');
  cleaned = cleaned.replace(/\{keyword\}/gi, keyword);
  cleaned = cleaned.replace(/\{topic\}/gi, keyword);
  cleaned = cleaned.replace(/\[todo[^\]]*\]/gi, '');

  // 2. Remove common LLM filler phrases
  const fillerPatterns = [
    /In today's rapidly evolving (?:world|landscape|digital age)[.,]?\s*/gi,
    /It's no secret that\s*/gi,
    /Without further ado[.,]?\s*/gi,
    /In the ever-evolving landscape of\s*/gi,
    /Whether you're a beginner or (?:an )?expert[.,]?\s*/gi,
    /Look no further[.!]?\s*/gi,
    /It goes without saying (?:that )?\s*/gi,
    /Needless to say[.,]?\s*/gi,
  ];
  for (const pattern of fillerPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 3. Fix artifacts from removals
  cleaned = cleaned.replace(/  +/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/\*\*\s*\*\*/g, '');
  cleaned = cleaned.replace(/\[\s*\]\([^)]*\)/g, '');

  return cleaned.trim();
}

// ============================================================================
// MAIN CONTENT GENERATOR FUNCTION
// ============================================================================
export async function generateContent(input: ContentGeneratorInput): Promise<ContentGeneratorOutput> {
  const { keyword, blogType, title, research } = input;
  const template = getTemplate(blogType);

  logger.info('Generating content', { keyword, blogType, title, hasResearch: !!research });

  // Select appropriate prompt based on blog type
  const promptGenerators: Record<BlogType, (k: string, t: string) => string> = {
    guide: getGuidePrompt,
    comparison: getComparisonPrompt,
    tips: getTipsPrompt,
    review: getReviewPrompt,
    troubleshoot: getTroubleshootPrompt,
    api: getAPIPrompt,
    usecase: getUseCasePrompt,
    prompt: getPromptLibraryPrompt,
    tools: getToolsPrompt,
    upcoming: getUpcomingPrompt,
  };

  const promptGenerator = promptGenerators[blogType];
  let prompt = promptGenerator(keyword, title);

  // Inject research data into prompt if available
  if (research) {
    const researchContext = formatResearchForPrompt(research);
    if (researchContext) {
      // Insert research data between the expert system prompt and the blog type template
      // Find the blog type specific section marker and inject before it
      const typeMarkerIndex = prompt.indexOf('**Title:**');
      if (typeMarkerIndex > 0) {
        prompt =
          prompt.slice(0, typeMarkerIndex) +
          researchContext +
          '\n---\n\n' +
          prompt.slice(typeMarkerIndex);
      } else {
        // Fallback: append research at the end of the prompt
        prompt = prompt + '\n\n' + researchContext;
      }
      logger.info('Research data injected into prompt', {
        keyword,
        researchLength: researchContext.length,
        totalPromptLength: prompt.length,
      });
    }
  }

  // Inject platform/brand context if available
  if (input.brandProfile && input.brandProfile.tools.length > 0) {
    const matches = findRelevantLinks(keyword, blogType, input.brandProfile.tools, input.brandProfile.domain);
    const platformSection = buildPlatformPromptSection(input.brandProfile, matches);
    prompt = prompt.replace('{PLATFORM_CONTEXT}', platformSection);
    logger.info('Platform context injected into prompt', {
      keyword,
      brand: input.brandProfile.name,
      matchedTools: matches.length,
    });
  } else {
    prompt = prompt.replace('{PLATFORM_CONTEXT}', '');
  }

  try {
    // Use gpt-4o for high-quality content generation
    const response = await openai.generate({
      prompt,
      model: 'gpt-4o',
      maxTokens: 16000,
      temperature: 0.7,
    });

    const content = cleanGeneratedContent(response.content, keyword);

    // Generate meta description optimized for CTR + AEO extraction
    const metaPrompt = `Write a meta description for this blog post.

REQUIREMENTS:
- Maximum 155 characters
- Include "${keyword}" within the first 10 words
- Start with a concrete benefit or specific number (e.g., "Learn 7 proven...", "Fix ${keyword} in 3 steps...")
- Include a power word: proven, essential, complete, expert, step-by-step, ultimate, tested
- End with an implicit CTA or curiosity gap
- Do NOT use generic phrases ("In this article...", "Learn about...", "Discover how...")
- Match the search intent for "${blogType}" content type
- Write as a direct answer that AI engines can extract

Title: ${title}
Blog Type: ${blogType}
Primary Keyword: ${keyword}

Return ONLY the meta description text. No quotes, no labels.`;

    const metaResponse = await openai.generate({
      prompt: metaPrompt,
      model: 'gpt-4o-mini',
      maxTokens: 100,
      temperature: 0.8,
    });

    const metaDescription = metaResponse.content.trim().slice(0, 155);

    logger.info('Content generated successfully', {
      contentLength: content.length,
      metaDescriptionLength: metaDescription.length,
      blogType,
    });

    // Safely extract section IDs with fallback
    const sections = template?.sections?.required
      ? template.sections.required.map((s) => s?.id).filter(Boolean)
      : [];

    return {
      content,
      metaDescription,
      sections,
    };
  } catch (error) {
    logger.error('Content generation failed', { error: String(error), blogType });
    throw error;
  }
}
