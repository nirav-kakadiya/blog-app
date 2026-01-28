import { openai } from '@/lib/openai';
import { getTemplate } from '@/lib/templates';
import { BlogType } from '@/types';
import { logger } from '@/lib/logger';

export interface ContentGeneratorInput {
  keyword: string;
  blogType: BlogType;
  title: string;
}

export interface ContentGeneratorOutput {
  content: string;
  metaDescription: string;
  sections: string[];
}

// ============================================================================
// SEO/AEO RESEARCH-BASED PROMPT TEMPLATES (2025-2026)
// ============================================================================
// Based on Blog Structure Document + SEO/AEO Research:
// - Answer-first formatting (40-60 words per section start)
// - Keyword density: 0.5-1% (3-6 times per 600 words)
// - TL;DR summary: 3-5 bullets (50-70 words)
// - Short paragraphs: 2-4 lines max
// - E-E-A-T signals throughout
// - Proper H1 > H2 > H3 hierarchy (never skip levels)
// - Tables for structured data (2.5x more AI citations)
// - FAQ: 5-10 questions with direct answers
// ============================================================================

const SEO_AEO_BASE_INSTRUCTIONS = `
## CRITICAL SEO/AEO REQUIREMENTS (2025-2026 Best Practices)

### Answer Engine Optimization (AEO)
- **Answer-First Format**: Start EVERY H2 section with a 40-60 word direct answer
- **Snippable Content**: Write self-contained sentences AI can extract and cite
- **Clear Extraction Boundaries**: Use numbered lists, tables, bullet points

### SEO Fundamentals
- **Keyword Density**: 0.5-1% (use primary keyword 3-6 times per 600 words)
- **First 100 Words**: Include primary keyword naturally
- **One H2 Minimum**: Must contain the primary keyword
- **Heading Hierarchy**: H1 > H2 > H3 (NEVER skip levels)

### Content Structure
- **Paragraphs**: 2-4 lines maximum
- **TL;DR**: 3-5 bullet points giving instant answer for skimmers
- **FAQ Section**: 5-10 questions with 1-2 sentence direct answers
- **Tables**: Use for any comparative data

### Required in EVERY Article
- H1 Title with primary keyword
- Intro hook (Problem + Solution + what they'll learn)
- TL;DR (3-5 bullets)
- Table of Contents
- At least 4-6 H2 sections
- FAQs (5-10)
- Conclusion with recap + recommendation
- CTA (1 main action)
`;

// ============================================================================
// 1) GUIDE BLOG STRUCTURE
// ============================================================================
function getGuidePrompt(keyword: string, title: string): string {
  return `You are an expert technical writer creating a comprehensive guide optimized for SEO and AEO.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 2,000-2,500 words
**Content Type:** Guide / Tutorial

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[2-3 sentence intro: Problem + Solution + what they'll learn. Include "${keyword}" in first 100 words.]

## TL;DR (Quick Summary)
- [What it is]
- [Who it's for]
- [Best method/approach]
- [Key tool/model recommendation]
- [Main benefit]

## Table of Contents
[Links to all H2 sections]

## What is ${keyword}?
[40-60 word definition - why it matters now]
[What it replaces or improves]
[2-3 short paragraphs]

## Who is This Guide For?
[List specific audience types with their goals]
- Beginners who want to...
- Intermediate users looking to...
- Professionals needing to...

## Prerequisites / What You Need
- [Tool/software requirement]
- [Account/access requirement]
- [Asset/file requirements]

## Step-by-Step Guide: How to ${keyword}

### Step 1: [Action]
[40-60 word summary]
[Detailed instructions with screenshots/settings]

### Step 2: [Action]
[Continue pattern for 5-8 steps total]

### Step 3: [Action]
[Include tool settings, configurations]

## Best Practices & Tips
[40-60 word intro]
1. **[Tip]**: [Quality tips, settings guidance]
2. **[Tip]**: [Do/don't recommendations]
3. **[Tip]**: [Continue for 5-10 tips]

## Examples
[3-10 practical examples with specific details]

### Example 1: [Use Case]
[Prompt/settings + expected output]

### Example 2: [Use Case]
[Another practical demonstration]

## Common Mistakes to Avoid
- **[Mistake]**: [What users do wrong + correction]
- **[Mistake]**: [Continue pattern]

## Troubleshooting
| Problem | Cause | Solution |
|---------|-------|----------|
| [Issue] | [Why] | [Fix] |

## FAQs

### 1. [Keyword-focused question]?
[Direct 1-sentence answer, then expand]

### 2. [Common question]?
[Direct answer]

[Continue for 5-10 FAQs total]

## Conclusion
[Recap main points]
[Best recommendation]
[Final tip]

## Try It Now
[Strong CTA with specific action]
[Internal link to related content]

---
Write the complete guide in Markdown with specific examples, actual settings, and expert detail.`;
}

// ============================================================================
// 2) PROMPT BLOG STRUCTURE
// ============================================================================
function getPromptLibraryPrompt(keyword: string, title: string): string {
  return `You are an AI prompt engineering expert creating a prompt library optimized for SEO and practical use.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,500 words
**Content Type:** Prompt Library / Prompt Pack

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[2-3 sentence intro: Why these prompts + what results + who benefits. Include "${keyword}".]

## TL;DR (Quick Summary)
- Best tool: [Recommended tool]
- Best settings: [Key settings]
- Use-case: [Primary use case]
- Works best with: [Style/approach]

## Table of Contents
[Links to all H2 sections]

## Prompt Formula / Framework
[40-60 word explanation of effective prompt structure]

**Required Fields for Great Prompts:**
- **Subject**: [What you want to generate]
- **Style**: [Artistic style or approach]
- **Lighting**: [Lighting setup]
- **Camera/Angle**: [Perspective details]
- **Quality modifiers**: [Resolution, detail level]

\`\`\`
[Template formula example]
[Subject] + [Style] + [Lighting] + [Camera] + [Quality]
\`\`\`

## ${keyword} Prompts by Category

### Category 1: [Use Case]

#### Prompt 1: [Descriptive Name]
\`\`\`
[Complete, copy-paste ready prompt]
\`\`\`
**Best For:** [When to use]
**Settings:** [Recommended tool settings]

#### Prompt 2: [Name]
\`\`\`
[Prompt]
\`\`\`

[Continue for 20-50 prompts across 4-6 categories]

### Category 2: [Different Use Case]
[Continue pattern]

## Prompt Variations
[Same idea in 5 different styles]

### Style 1: [Realistic]
\`\`\`
[Prompt variation]
\`\`\`

### Style 2: [Artistic]
\`\`\`
[Prompt variation]
\`\`\`

## Negative Prompts (What to Avoid)
[If supported by the tool]
\`\`\`
[Negative prompt examples]
\`\`\`
**Common things to exclude:** [List of items to avoid in generation]

## Best Prompt Settings
| Setting | Recommended Value | Why |
|---------|-------------------|-----|
| Model | [Model name] | [Explanation] |
| Aspect Ratio | [Ratio] | [Use case] |
| CFG/Guidance | [Value] | [Effect] |
| Steps | [Number] | [Quality vs speed] |
| Seed | [Strategy] | [Consistency tip] |

## Common Prompt Mistakes to Avoid
1. **[Mistake]**: [What goes wrong + correct approach]
2. **[Mistake]**: [Continue for 5-7 mistakes]

## Before/After Examples
[Show how improving prompts changes output]

## FAQs

### 1. What makes a good ${keyword} prompt?
[Direct answer]

### 2. How do I customize these prompts?
[Direct answer]

### 3. Which prompt should I start with?
[Direct answer with recommendation]

### 4. Can I combine multiple prompts?
[Direct answer]

### 5. How do I improve results?
[Direct answer with tips]

[Continue for 5-10 FAQs]

## Conclusion
[Recap best prompts]
[Key recommendation]

## Download & Try Now
[CTA: bookmark, try first prompt, explore tool]

---
Write the complete prompt library in Markdown. Make every prompt copy-paste ready with specific settings.`;
}

// ============================================================================
// 3) TIPS & TRICKS (TUTORIALS) STRUCTURE
// ============================================================================
function getTipsPrompt(keyword: string, title: string): string {
  return `You are an expert content creator writing a tips & tricks tutorial optimized for SEO and AEO.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** Tips & Tricks / Tutorial

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[2-3 sentence intro: Why these tips matter + who benefits + what they'll achieve. Include "${keyword}".]

## TL;DR (Quick Summary)
- [Key tip 1]
- [Key tip 2]
- [Best tool/approach]
- [Expected outcome]

## Table of Contents
[Numbered links to each section]

## Goal: What You Will Achieve
[40-60 word clear outcome statement]
[Specific results users can expect]
[Before/after comparison if applicable]

## Requirements
**Tools/Software Needed:**
- [Tool 1]
- [Tool 2]

**Assets Needed:**
- [Asset type 1]
- [Asset type 2]

**Skills Level:** [Beginner/Intermediate/Advanced]

## Step-by-Step Tutorial

### Step 1: [Action]
[40-60 word summary]
[Detailed instructions with settings]

### Step 2: [Action]
[Continue pattern]

[5-8 steps total]

## Pro Tips
[40-60 word intro]

### Tip 1: [Tip Name]
[Detailed explanation with example]

### Tip 2: [Tip Name]
[Continue for 5-10 tips]

## Shortcut Methods
[Faster alternatives for experienced users]
1. **[Shortcut]**: [How it saves time]
2. **[Shortcut]**: [Continue pattern]

## Time-Saving Workflow
[Optimized workflow for efficiency]

## Recommended Presets/Settings
| Setting | Value | Use Case |
|---------|-------|----------|
| [Setting] | [Value] | [When to use] |

## Advanced Tricks
[For power users - advanced techniques]

## Common Mistakes to Avoid
- **[Mistake]**: [Problem + solution]

## FAQs

### 1. What's the most important ${keyword} tip?
[Direct answer]

### 2. How long does it take to see results?
[Direct answer with timeline]

### 3. Do these tips work for beginners?
[Direct answer]

### 4. Which tip has the biggest impact?
[Direct answer]

### 5. Can I combine multiple tips?
[Direct answer]

[Continue for 5-10 FAQs]

## Conclusion
[Recap top 3 tips]
[Final recommendation]

## Start Using These Tips Now
[CTA with specific action]

---
Write the complete tips article in Markdown with specific, actionable tips backed by examples.`;
}

// ============================================================================
// 4) COMPARISONS BLOG STRUCTURE
// ============================================================================
function getComparisonPrompt(keyword: string, title: string): string {
  return `You are an expert product analyst creating a comprehensive comparison article optimized for SEO and AEO.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,800-2,500 words
**Content Type:** Comparison (VS / Alternatives)

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[2-3 sentence intro: What's compared + who it's for. Include "${keyword}".]

## TL;DR (Quick Summary)
- **Winner for quality**: [Tool]
- **Winner for speed**: [Tool]
- **Winner for price**: [Tool]
- **Best overall**: [Tool]

## Table of Contents
[Links to all H2 sections]

## Competitor Overviews

### [Tool A]
[40-60 word description]
**Strengths:**
- [Strength 1]
- [Strength 2]

**Limitations:**
- [Limitation 1]
- [Limitation 2]

### [Tool B]
[40-60 word description]
**Strengths:**
- [Strength 1]
- [Strength 2]

**Limitations:**
- [Limitation 1]
- [Limitation 2]

## Comparison Table

| Feature | [Tool A] | [Tool B] | Winner |
|---------|----------|----------|--------|
| **Price** | [Exact price] | [Exact price] | [Tool] |
| **Quality** | [Rating/description] | [Rating/description] | [Tool] |
| **Speed** | [Generation time] | [Generation time] | [Tool] |
| **Control** | [Level of control] | [Level of control] | [Tool] |
| **Ease of Use** | [Rating] | [Rating] | [Tool] |
| **API Access** | [Yes/No + pricing] | [Yes/No + pricing] | [Tool] |
| **Limits** | [Usage limits] | [Usage limits] | [Tool] |

## Detailed Comparison

### Price Comparison
[40-60 word direct answer]
[Detailed pricing breakdown]

### Quality Comparison
[40-60 word direct answer]
[Specific quality metrics]

### Speed & Performance
[40-60 word direct answer]
[Generation times, processing speed]

### Ease of Use
[40-60 word direct answer]
[Learning curve, interface]

## Best For (Use-Case Based Winners)
- **Best for marketing**: [Tool] because [reason]
- **Best for [use case]**: [Tool] because [reason]
- **Best free option**: [Tool]
- **Best for professionals**: [Tool]

## Real Output Examples
[Side-by-side comparison of actual outputs]

### Same Prompt, Different Tools
**Prompt:** \`[Example prompt]\`
- **[Tool A] Output:** [Description]
- **[Tool B] Output:** [Description]

## Pros & Cons Summary

### [Tool A]
**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

### [Tool B]
**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

## My Recommendation
[Clear verdict with reasoning]
[Who should choose which tool]
[Final recommendation]

## FAQs

### 1. Which is better for [common use case]?
[Direct answer]

### 2. How does pricing compare?
[Direct answer with numbers]

### 3. Which is easier to use?
[Direct answer]

### 4. Can I use both together?
[Direct answer]

### 5. Which has better support?
[Direct answer]

[Continue for 5-10 FAQs]

## Conclusion
[Recap main differences]
[Clear winner recommendation]

## Try the Winner
[CTA with specific action]

---
Write the complete comparison in Markdown with specific numbers, real pricing, and actual output comparisons.`;
}

// ============================================================================
// 5) USE CASES BLOG STRUCTURE (Marketing/Social/Ecom)
// ============================================================================
function getUseCasePrompt(keyword: string, title: string): string {
  return `You are an industry expert creating a use case article optimized for SEO and AEO.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** Use Case (Marketing/Social Media/E-commerce)

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[2-3 sentence intro: Industry problem + solution + outcomes. Include "${keyword}".]

## TL;DR (Quick Summary)
- [Problem solved]
- [Best approach]
- [Expected outcome/ROI]
- [Recommended tool]

## Table of Contents
[Links to all H2 sections]

## The Problem: Use Case Challenge
[40-60 word problem statement]

**What real-world problem are you solving?**
[Detailed pain point explanation]

**Why it matters (business/creator impact):**
[Cost of not solving this problem]

**What outcome do you want?**
[Desired end state]

## The Solution: Best Workflow
[40-60 word solution overview]

### Step 1: [Setup]
[Detailed instructions]

### Step 2: [Core Action]
[Continue pattern for 5-7 steps]

## Examples & Templates
[Ready-to-use templates with prompts and expected outputs]

### Template 1: [Use Case]
**Caption/Context:** [Description]
**Prompt:** \`[Exact prompt]\`
**Output Format:** [Expected result]

### Template 2: [Use Case]
[Continue pattern]

## Best Tools & Models
| Tool/Model | Best For | Pricing |
|------------|----------|---------|
| [Tool 1] | [Use case] | [Price] |
| [Tool 2] | [Use case] | [Price] |

**Recommended Stack:**
- **Free:** [Free option]
- **Pro:** [Paid option]

## Tips for Better Results
[Performance optimization tips]
1. **[Tip]**: [Explanation]
2. **[Tip]**: [Continue]

## Industry-Specific Examples
[Examples for fashion, beauty, food, real estate, etc.]

### [Industry 1] Example
[Specific example with details]

## Checklist: Assets Needed
- [ ] [Asset 1]
- [ ] [Asset 2]
- [ ] [Asset 3]

## ROI & Performance Expectations
[Expected improvements in CTR, ROAS, engagement]

## FAQs

### 1. How long does it take to implement ${keyword}?
[Direct answer]

### 2. What's the ROI of using ${keyword}?
[Direct answer with metrics]

### 3. Do I need technical skills?
[Direct answer]

### 4. What are common challenges?
[Direct answer]

### 5. How do I measure success?
[Direct answer with KPIs]

[Continue for 5-10 FAQs]

## Conclusion
[Recap workflow]
[Key recommendation]

## Get Started Today
[CTA with specific first step]

---
Write the complete use case article in Markdown with specific industry examples and measurable outcomes.`;
}

// ============================================================================
// 6) API-RELATED BLOG STRUCTURE
// ============================================================================
function getAPIPrompt(keyword: string, title: string): string {
  return `You are a technical documentation expert creating an API guide optimized for SEO and developer experience.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** API Documentation / Integration Guide

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[2-3 sentence intro: What API enables + who it's for + prerequisites. Include "${keyword}".]

## TL;DR (Quick Summary)
- [What it does]
- [Authentication method]
- [Key endpoint]
- [Pricing tier]

## Table of Contents
[Links to all sections]

## What is ${keyword} API?
[40-60 word explanation of what it enables]
[Capabilities overview]
[Use cases]

## Authentication
[40-60 word auth overview]

### Getting Your API Key
1. [Step to get API key]
2. [Step 2]
3. [Step 3]

### Environment Variables
\`\`\`bash
export API_KEY="your_api_key_here"
\`\`\`

### Using Your API Key
\`\`\`bash
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Base Request + Example
[40-60 word explanation]

### Request Format
\`\`\`bash
curl -X POST "https://api.example.com/v1/endpoint" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"param": "value"}'
\`\`\`

### Sample Response
\`\`\`json
{
  "status": "success",
  "data": {
    "id": "abc123",
    "result": "..."
  }
}
\`\`\`

## Parameters Explained
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| model | string | Yes | [Description] |
| size | string | No | [Description + default] |
| steps | integer | No | [Description + default] |
| seed | integer | No | [Description] |
| fps | integer | No | [Description] |

## Code Examples

### Python
\`\`\`python
import requests

headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}

data = {
    "param": "value"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
\`\`\`

### JavaScript/Node.js
\`\`\`javascript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ param: 'value' })
});
\`\`\`

## Common Errors + Fixes
| Error Code | Message | Cause | Fix |
|------------|---------|-------|-----|
| 400 | Bad Request | Invalid parameters | [Fix] |
| 401 | Unauthorized | Invalid API key | [Fix] |
| 429 | Rate Limited | Too many requests | [Fix] |
| 500 | Server Error | Server issue | [Fix] |

## Rate Limits + Pricing
[40-60 word overview]

| Plan | Rate Limit | Price | Best For |
|------|------------|-------|----------|
| Free | X req/min | $0 | Testing |
| Pro | X req/min | $X/mo | Production |
| Enterprise | Custom | Custom | Scale |

**Pricing Notes:**
- [Cost per request]
- [Overage charges]
- [Volume discounts]

## SDK Examples (Optional)
[If SDKs available]

## Webhook Workflows (Optional)
[If webhooks supported]

## Integration Examples
[Zapier, Make, Python scripts]

## FAQs

### 1. How do I get an API key for ${keyword}?
[Direct answer]

### 2. What's the rate limit?
[Direct answer with numbers]

### 3. Is there a free tier?
[Direct answer]

### 4. How do I handle errors?
[Direct answer]

### 5. Can I use this in production?
[Direct answer]

[Continue for 5-10 FAQs]

## Conclusion
[Recap key steps]
[Best practices summary]

## Get Your API Key
[CTA: Sign up, get key, start building]

---
Write the complete API guide in Markdown with working code examples and specific technical details.`;
}

// ============================================================================
// 7) UPCOMING BLOG STRUCTURE (Trends / Soon Models)
// ============================================================================
function getUpcomingPrompt(keyword: string, title: string): string {
  return `You are an industry analyst creating a trends/upcoming release article optimized for SEO and freshness signals.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,000-1,500 words
**Content Type:** Upcoming / Trends / News

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[2-3 sentence intro: What's coming + why it matters. Include "${keyword}".]

## TL;DR (Key Takeaways)
- [Key point 1 - confirmed]
- [Key point 2]
- [Expected release]
- [Who should care]

## Table of Contents
[Links to all sections]

## What's Coming: ${keyword} Overview
[40-60 word summary]
[Why this release matters]

## Release Timeline / Rumor Level

| Milestone | Expected Date | Status |
|-----------|---------------|--------|
| [Alpha/Beta] | [Date] | Confirmed/Rumored |
| [Public Release] | [Date] | Confirmed/Rumored |
| [Feature X] | [Date] | Confirmed/Rumored |

**Confirmed vs Rumored:**
- ✅ **Confirmed:** [List confirmed features]
- ❓ **Rumored:** [List rumored features]

## Expected Features
[40-60 word overview]

### Feature 1: [Name]
[What's expected + source]
**Status:** Confirmed/Rumored

### Feature 2: [Name]
[Continue pattern]

## Who Should Care About ${keyword}?
[Specific audience segments]
- **[Audience 1]**: [Why they should care]
- **[Audience 2]**: [Why they should care]
- **Content creators** who...
- **Businesses** that...

## Comparison with Current Generation
| Feature | Current | ${keyword} (Expected) |
|---------|---------|----------------------|
| [Feature] | [Current] | [Expected] |

## Alternatives You Can Use Now
[What to use while waiting]

| Alternative | How It Compares | Best For |
|-------------|-----------------|----------|
| [Tool 1] | [Comparison] | [Use case] |
| [Tool 2] | [Comparison] | [Use case] |

## Demo Leaks / Official Statements
[Any previews or official information]

## FAQs

### 1. When is ${keyword} releasing?
[Direct answer with best known date]

### 2. How much will ${keyword} cost?
[Direct answer or estimate]

### 3. Should I wait for ${keyword}?
[Direct advice]

### 4. What's confirmed vs rumored?
[Direct categorization]

### 5. How do I get early access?
[Direct answer]

[Continue for 5-10 FAQs]

## Conclusion
[Recap what's coming]
[Recommendation]

## Stay Updated
[CTA: Newsletter, follow, bookmark]

*Last Updated: [Date]*

---
Write the complete trends article in Markdown. Clearly distinguish confirmed facts from speculation.`;
}

// ============================================================================
// 8) TROUBLESHOOTING & FIXING BLOG STRUCTURE
// ============================================================================
function getTroubleshootPrompt(keyword: string, title: string): string {
  return `You are a technical support expert creating a troubleshooting guide optimized for SEO and AEO.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,000-1,500 words
**Content Type:** Troubleshooting & Fix Guide

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[2-3 sentence intro: Acknowledge the problem + promise solution. Include "${keyword}".]

## TL;DR (Quick Fix)
[50-70 word fastest solution]
\`\`\`
[Quick command/action if applicable]
\`\`\`

## Table of Contents
[Links to all solutions]

## What Does "${keyword}" Mean?
[40-60 word explanation]
[Technical explanation in simple terms]
[Common causes listed]

## Quick Fix Checklist
Before trying detailed solutions, check these:
- [ ] [Quick check 1]
- [ ] [Quick check 2]
- [ ] [Quick check 3]
- [ ] [Quick check 4]
- [ ] [Quick check 5]

## Fix #1: [Most Common Solution]
[40-60 word summary of when this applies]

**Steps:**
1. [Specific action]
2. [Specific action]
3. [Specific action]

\`\`\`
[Code/command if applicable]
\`\`\`

**Expected Result:** [What success looks like]

## Fix #2: [Second Solution]
[40-60 word summary]

**Steps:**
1. [Action]
2. [Action]

## Fix #3: [Alternative Approach]
[Continue pattern for 3-5 fixes total]

## Root Cause Explanation
[Technical explanation of why this happens]
[Common triggers]
[Environmental factors]

## Prevention Tips
How to avoid ${keyword} in the future:
1. **[Prevention method]**: [Explanation]
2. **[Prevention method]**: [Explanation]
3. **[Prevention method]**: [Explanation]

## Common Tool-Specific Errors
[If error varies by tool/platform]

| Tool | Error Variation | Specific Fix |
|------|-----------------|--------------|
| [Tool 1] | [Error] | [Fix] |
| [Tool 2] | [Error] | [Fix] |

## Device/Browser-Specific Fixes
[If applicable]
- **Chrome:** [Specific fix]
- **Firefox:** [Specific fix]
- **Mobile:** [Specific fix]

## FAQs

### 1. Why do I keep getting ${keyword}?
[Direct answer with common causes]

### 2. Is ${keyword} a serious problem?
[Direct answer about severity]

### 3. Will I lose data because of ${keyword}?
[Direct answer with precautions]

### 4. How long does it take to fix?
[Direct answer with time estimate]

### 5. Should I contact support?
[Direct answer on when to escalate]

[Continue for 5-10 FAQs]

## Conclusion
[Recap best fix]
[Final tip]

## Still Having Issues?
[When to contact support]
[Community resources]
[Related troubleshooting guides]

---
Write the complete troubleshooting guide in Markdown with exact error messages and specific step-by-step fixes.`;
}

// ============================================================================
// 9) PARTICULAR (TOOLS & MODELS) STRUCTURE
// ============================================================================
function getToolsPrompt(keyword: string, title: string): string {
  return `You are a product expert creating a comprehensive tool/model guide optimized for SEO and AEO.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** Tool/Model Deep Dive

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[2-3 sentence intro: What it is + why it matters + who it's for. Include "${keyword}".]

## TL;DR (Quick Summary)
- [What it does]
- [Best for]
- [Pricing]
- [Key strength]

## Table of Contents
[Links to all H2 sections]

## What is ${keyword}?
[40-60 word definition]
[Company/creator background]
[Market position]

## Key Features
[40-60 word overview]

### Feature 1: [Name]
[Detailed explanation with use cases]

### Feature 2: [Name]
[Continue for 5-8 key features]

## How ${keyword} Works
[Simplified explanation]
[Workflow/process steps]
[Technical overview in accessible language]

## Best For
[40-60 word summary of ideal users]
- **[User type 1]**: [Why it's perfect for them]
- **[User type 2]**: [Why it's perfect for them]
- **[User type 3]**: [Why it's perfect for them]

## How to Use ${keyword}

### Getting Started
1. [First step - signup/access]
2. [Second step - setup]
3. [Third step - first use]
[5-7 steps to first success]

### Basic Usage
[Core workflow]

### Advanced Usage
[Tips for power users]

## Pricing & Free Plan
| Plan | Price | Features | Best For |
|------|-------|----------|----------|
| Free | $0 | [Limitations] | [User] |
| Basic | $X/mo | [Features] | [User] |
| Pro | $X/mo | [Features] | [User] |

**Free Plan Includes:**
- [Feature 1]
- [Feature 2]
- [Limitations]

## Pros & Cons

**Pros:**
- [Strength 1]
- [Strength 2]
- [Strength 3]

**Cons:**
- [Limitation 1]
- [Limitation 2]

## Alternatives to ${keyword}
| Alternative | Best For | Price |
|-------------|----------|-------|
| [Alt 1] | [Use case] | [Price] |
| [Alt 2] | [Use case] | [Price] |

## Version History / Changelog
[If applicable - recent updates]
- **v2.0**: [Major changes]
- **v1.5**: [Changes]

## Benchmarks (Speed/Quality)
[If applicable]
| Metric | ${keyword} | Competitor |
|--------|------------|------------|
| Speed | [Value] | [Value] |
| Quality | [Rating] | [Rating] |

## FAQs

### 1. Is ${keyword} free?
[Direct answer]

### 2. What can I do with ${keyword}?
[Direct answer]

### 3. Is ${keyword} good for beginners?
[Direct answer]

### 4. How does ${keyword} compare to [competitor]?
[Direct answer]

### 5. Is ${keyword} worth it?
[Direct answer with conditions]

[Continue for 5-10 FAQs]

## Conclusion
[Clear recommendation]
[Who should use it]
[Who should skip it]

## Try ${keyword} Today
[CTA with specific action]
[Link to tool]

---
Write the complete tool guide in Markdown with specific features, real pricing, and expert analysis.`;
}

// ============================================================================
// 10) REVIEW BLOG STRUCTURE
// ============================================================================
function getReviewPrompt(keyword: string, title: string): string {
  return `You are an expert product reviewer creating an in-depth review optimized for SEO, AEO, and Google's Product Review guidelines.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** Review

${SEO_AEO_BASE_INSTRUCTIONS}

## GOOGLE PRODUCT REVIEW REQUIREMENTS
- Show significant expertise with detailed insights
- Share personal/hands-on testing experiences
- Use quantitative data and comparisons
- Incorporate original observations (not just specs)
- Explain what sets the product apart
- Show evidence of personal testing

## REQUIRED STRUCTURE (Follow Exactly)

# ${title}

[2-3 sentence intro: Why reviewing this + your experience + what readers learn. Include "${keyword}".]

## TL;DR (Quick Verdict)
**Rating:** ⭐⭐⭐⭐☆ [X/5]

| Aspect | Rating | Notes |
|--------|--------|-------|
| Features | X/10 | [Brief] |
| Ease of Use | X/10 | [Brief] |
| Value | X/10 | [Brief] |
| Performance | X/10 | [Brief] |
| Support | X/10 | [Brief] |

**Best For:** [Specific user type]
**Skip If:** [Who shouldn't use this]

## Table of Contents
[Links to all H2 sections]

## What is ${keyword}?
[40-60 word explanation]
[Background, company, market position]

## How I Tested ${keyword}
[CRITICAL FOR E-E-A-T]
- **Testing Period:** [Duration]
- **Use Cases Tested:** [List]
- **Compared Against:** [Competitors]
- **Metrics Measured:** [What evaluated]

## Key Features Deep Dive

### Feature 1: [Name]
[40-60 word summary]
[Detailed experience]
[Specific results]

### Feature 2: [Name]
[Continue for 4-6 features]

## What I Liked (Pros)
[40-60 word summary]
1. **[Pro]**: [Specific detail with evidence]
2. **[Pro]**: [Continue for 5-8 pros]

## What Could Be Better (Cons)
[40-60 word honest assessment]
1. **[Con]**: [Specific issue + impact]
2. **[Con]**: [Continue for 3-5 cons]

## ${keyword} Pricing
| Plan | Price | Features | Best For |
|------|-------|----------|----------|
| Free | $0 | [Features] | [User] |
| Pro | $X/mo | [Features] | [User] |

## ${keyword} vs Alternatives
| Feature | ${keyword} | [Alt 1] | [Alt 2] |
|---------|------------|---------|---------|
| Price | [Price] | [Price] | [Price] |
| Quality | [Rating] | [Rating] | [Rating] |

## Who Should Use ${keyword}?

### Perfect For:
- [User type with scenario]

### Not Ideal For:
- [User type who should skip]

## FAQs

### 1. Is ${keyword} worth it in 2026?
[Direct answer]

### 2. What's the biggest limitation?
[Direct honest answer]

### 3. How does it compare to [competitor]?
[Direct comparison]

### 4. Is there a free version?
[Direct answer]

### 5. How steep is the learning curve?
[Direct answer with timeline]

[Continue for 5-10 FAQs]

## Final Verdict
[Clear recommendation]
[Who should buy]
[Who should skip]
[Rating justification]

## Try ${keyword} Today
[CTA with specific action]

---
Write the complete review in Markdown showing genuine expertise through specific observations and honest assessment.`;
}

// ============================================================================
// MAIN CONTENT GENERATOR FUNCTION
// ============================================================================
export async function generateContent(input: ContentGeneratorInput): Promise<ContentGeneratorOutput> {
  const { keyword, blogType, title } = input;
  const template = getTemplate(blogType);

  logger.info('Generating content', { keyword, blogType, title });

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
  const prompt = promptGenerator(keyword, title);

  try {
    // Use gpt-4o for high-quality content generation
    const response = await openai.generate({
      prompt,
      model: 'gpt-4o',
      maxTokens: 16000,
      temperature: 0.7,
    });

    const content = response.content;

    // Generate meta description optimized for CTR
    const metaPrompt = `Write a compelling meta description for this blog post.

REQUIREMENTS:
- Maximum 155 characters
- Include the keyword "${keyword}" naturally
- Create urgency or curiosity
- Include a benefit

Title: ${title}
Blog Type: ${blogType}

Return ONLY the meta description text.`;

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
