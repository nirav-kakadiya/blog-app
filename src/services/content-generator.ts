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
// Based on comprehensive research:
// - Answer-first formatting (40-60 words per section start)
// - Keyword density: 0.5-1% (3-6 times per 600 words)
// - TL;DR summary: 50-70 words
// - Featured snippet answers: 40-60 words
// - Short paragraphs: 2-4 lines max
// - E-E-A-T signals throughout
// - Proper H1 > H2 > H3 hierarchy (never skip levels)
// - Tables for structured data (2.5x more AI citations)
// - FAQ format matches LLM training data
// ============================================================================

const SEO_AEO_BASE_INSTRUCTIONS = `
## CRITICAL SEO/AEO REQUIREMENTS (2025-2026 Best Practices)

### Answer Engine Optimization (AEO)
- **Answer-First Format**: Start EVERY H2 section with a 40-60 word direct answer
- **Snippable Content**: Write self-contained sentences AI can extract and cite
- **Clear Extraction Boundaries**: Use numbered lists, tables, bullet points
- AI search engines cite content with clear H2/H3 structures 40% more often

### SEO Fundamentals
- **Keyword Density**: 0.5-1% (use primary keyword 3-6 times per 600 words)
- **First 100 Words**: Include primary keyword naturally
- **One H2 Minimum**: Must contain the primary keyword
- **Heading Hierarchy**: H1 > H2 > H3 (NEVER skip levels)

### Content Structure
- **Paragraphs**: 2-4 lines maximum (people read only 20-28% of page)
- **TL;DR/Summary**: 50-70 words at the start
- **FAQ Section**: 5-10 questions with 1-2 sentence direct answers first
- **Tables**: Use for any comparative data (featured snippet optimization)

### E-E-A-T Signals
- Show Experience: Include specific examples, testing results, real scenarios
- Demonstrate Expertise: Use industry terminology correctly, cite sources
- Build Authority: Reference official documentation, studies, data
- Ensure Trust: Balanced coverage, acknowledge limitations, cite sources
`;

// ============================================================================
// GUIDE / HOW-TO PROMPT (2000-2500 words)
// ============================================================================
function getGuidePrompt(keyword: string, title: string): string {
  return `You are an expert technical writer creating a comprehensive how-to guide optimized for SEO and AEO (Answer Engine Optimization).

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 2,000-2,500 words
**Content Type:** Step-by-Step Tutorial Guide

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE

# ${title}

[2-3 sentence intro: State the problem + your solution + what readers will achieve. Include "${keyword}" naturally.]

## TL;DR (Quick Summary)
[50-70 word summary with 3-5 bullet points of key takeaways]

## Table of Contents
[Links to all H2 sections]

## What is ${keyword}?
[40-60 word answer-first definition]
[Why it matters - 2-3 short paragraphs]
[Who this guide is for]

## Prerequisites / What You Need
- [Requirement 1 with specifics]
- [Requirement 2 with specifics]
- [Tool/account requirements]

## How to [Action] with ${keyword}: Step-by-Step

### Step 1: [Specific Action]
[40-60 word summary of this step]
[Detailed instructions - 2-3 paragraphs]
[Code snippet or example if relevant]

### Step 2: [Specific Action]
[40-60 word summary]
[Detailed instructions]

### Step 3: [Specific Action]
[Continue pattern...]

[Include 5-8 steps total with clear, actionable instructions]

## Best Practices & Pro Tips
[40-60 word intro to tips section]
1. **Tip Name**: [Specific, actionable advice]
2. **Tip Name**: [Include numbers/metrics where possible]
3. **Tip Name**: [Real-world application]
[5-10 numbered tips]

## Common Mistakes to Avoid
- **Mistake 1**: [What goes wrong + how to prevent]
- **Mistake 2**: [Specific error + solution]
- **Mistake 3**: [Continue pattern]

## Real-World Examples
### Example 1: [Use Case]
[Practical demonstration with specific details]

### Example 2: [Use Case]
[Another scenario showing application]

## Troubleshooting
| Problem | Cause | Solution |
|---------|-------|----------|
| [Issue 1] | [Why it happens] | [How to fix] |
| [Issue 2] | [Why it happens] | [How to fix] |

## FAQs

### 1. How long does it take to [action with keyword]?
[Direct 1-sentence answer first, then expand]

### 2. Do I need [common prerequisite] for ${keyword}?
[Direct answer, then details]

### 3. What's the best [tool/approach] for ${keyword}?
[Direct recommendation with reasoning]

### 4. Can beginners use ${keyword}?
[Direct answer with guidance]

### 5. How much does ${keyword} cost?
[Direct pricing info if applicable]

[Add 5-10 FAQs total based on common questions]

## Conclusion
[Recap main points in 2-3 sentences]
[Clear recommendation]
[Encourage action]

## Next Steps
[Strong CTA with specific action to take]

---
Write the complete guide now in Markdown. Use specific examples, actual numbers, and demonstrate real expertise.`;
}

// ============================================================================
// COMPARISON PROMPT (X vs Y) (1800-2500 words)
// ============================================================================
function getComparisonPrompt(keyword: string, title: string): string {
  return `You are an expert product analyst creating a comprehensive comparison article optimized for SEO and AEO.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,800-2,500 words
**Content Type:** Product/Tool Comparison

${SEO_AEO_BASE_INSTRUCTIONS}

## COMPARISON-SPECIFIC REQUIREMENTS
- Lead with summary comparison table (gets 2.5x more AI citations)
- Maintain unbiased tone with fair strengths/weaknesses for each option
- Use consistent structure when discussing each element
- Provide clear "Choose X if..." recommendations
- Include specific numbers: pricing, specs, performance metrics

## REQUIRED STRUCTURE

# ${title}

[2-3 sentence intro: What's being compared + who should read this + commercial intent signal. Include "${keyword}".]

## Quick Verdict
[CRITICAL: Featured snippet bait - put the winner immediately]
- **Overall Winner**: [Tool] for [primary reason]
- **Best for [Use Case 1]**: [Tool] because [specific reason with numbers]
- **Best for [Use Case 2]**: [Tool] because [specific reason]
- **Best Value**: [Tool] at [price point]
- **Best Quality**: [Tool] for [specific feature]

## Table of Contents
[Links to all H2 sections]

## The Contenders

### [Tool A]
[40-60 word answer-first summary - what it is and who it's for]

**Key Strengths:**
- [Specific feature with numbers/specs]
- [Unique capability not found in competitor]
- [Performance metric with data]

**Pricing:** [Exact tiers and costs]
**Best For:** [Specific user type with concrete scenario]

### [Tool B]
[40-60 word answer-first summary]

**Key Strengths:**
- [Specific feature with numbers/specs]
- [Unique capability]
- [Performance metric]

**Pricing:** [Exact tiers and costs]
**Best For:** [Specific user type with concrete scenario]

## ${keyword}: Feature Comparison Table

| Feature | [Tool A] | [Tool B] | Winner |
|---------|----------|----------|--------|
| **Pricing (Monthly)** | $X/mo | $Y/mo | [Tool] |
| **Free Tier** | Yes/No [details] | Yes/No [details] | [Tool] |
| **[Key Feature 1]** | [Exact spec] | [Exact spec] | [Tool] |
| **[Key Feature 2]** | [Exact spec] | [Exact spec] | [Tool] |
| **[Key Feature 3]** | [Exact spec] | [Exact spec] | [Tool] |
| **Ease of Use** | [Rating/description] | [Rating/description] | [Tool] |
| **API Access** | [Available + pricing] | [Available + pricing] | [Tool] |
| **Support** | [Type of support] | [Type of support] | [Tool] |

## Detailed ${keyword} Comparison

### Pricing & Value
[40-60 word direct answer: Which is more cost-effective and why]
[Detailed breakdown with specific numbers, tiers, cost-per-use calculations]
[ROI analysis for different user types]

### Quality & Performance
[40-60 word direct answer: Which produces better results]
[Specific metrics: resolution, speed, accuracy, etc.]
[Real-world testing results if possible]

### Ease of Use & Learning Curve
[40-60 word direct answer: Which is easier to learn]
[Interface comparison, documentation quality, onboarding experience]

### Unique Features
**[Tool A] Exclusive Features:**
- [Feature only Tool A has]
- [Another unique capability]

**[Tool B] Exclusive Features:**
- [Feature only Tool B has]
- [Another unique capability]

### Integration & Ecosystem
[40-60 word answer about integration capabilities]
[API options, third-party integrations, platform compatibility]

## Which Should You Choose?

### Choose [Tool A] If...
- You need [specific capability with scenario]
- Your budget is [price range]
- You prioritize [quality/speed/feature]
- You're a [user type: developer/marketer/creator]

### Choose [Tool B] If...
- You need [specific capability with scenario]
- Your budget is [price range]
- You prioritize [quality/speed/feature]
- You're a [user type]

## Our Recommendation

[Clear verdict - not "it depends" but actual recommendation]
[Primary recommendation with conditions]
[Secondary recommendation for specific use cases]
[Final sentence reinforcing the choice]

## FAQs

### 1. Which is better for [common use case]?
[Direct 1-sentence answer, then brief expansion]

### 2. How does ${keyword} pricing compare?
[Direct answer with specific numbers]

### 3. Can beginners use [Tool A/B]?
[Direct answer with guidance for each]

### 4. Which has better quality output?
[Direct answer with specifics]

### 5. Is there a free tier for either tool?
[Direct answer for both]

### 6. Which is faster?
[Direct answer with generation/processing times]

### 7. Can I use these commercially?
[Direct answer about licensing for each]

### 8. Which has better customer support?
[Direct comparison of support options]

### 9. Are there API options?
[Direct answer with pricing for each]

### 10. Which tool is improving faster?
[Direct answer about recent updates and roadmap]

## Try the Winner Today

[Strong CTA with specific next step]
[Link suggestion or action to take]

---
Write the complete comparison now in Markdown. Use SPECIFIC numbers, real pricing, actual specs. Avoid vague terms like "fast" or "affordable" - use exact figures.`;
}

// ============================================================================
// TIPS & TRICKS PROMPT (1500-2000 words)
// ============================================================================
function getTipsPrompt(keyword: string, title: string): string {
  return `You are an expert content creator writing a tips and tricks article optimized for SEO and AEO.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** Tips & Tricks Listicle

${SEO_AEO_BASE_INSTRUCTIONS}

## LISTICLE-SPECIFIC REQUIREMENTS
- Use numbers in headings (attracts more clicks)
- Each tip as H2 with 2-3 supporting paragraphs
- Include Table of Contents with jump links
- Front-load primary keyword in title
- Featured snippet friendly: numbered lists appear in snippets

## REQUIRED STRUCTURE

# ${title}

[2-3 sentence intro: Why these tips matter + who benefits + what they'll achieve. Include "${keyword}".]

## Quick Summary
[50-70 words with top 3-5 tips highlighted as bullets]

## Table of Contents
[Numbered links to each tip]

## 1. [Tip Name with Action Verb]
[40-60 word summary of why this tip works]
[Detailed explanation - 2-3 short paragraphs]
[Specific example or implementation]

**Pro Tip:** [Advanced variation of this tip]

## 2. [Tip Name]
[40-60 word summary]
[Detailed explanation]
[Example]

[Continue pattern for 7-15 tips total]

## Quick Reference: All Tips at a Glance

| # | Tip | Key Benefit | Difficulty |
|---|-----|-------------|------------|
| 1 | [Tip name] | [Benefit] | Easy/Medium/Advanced |
| 2 | [Tip name] | [Benefit] | Easy/Medium/Advanced |
[Continue for all tips]

## Bonus Tips for Advanced Users
[2-3 additional advanced tips for power users]

## Common Mistakes When Using ${keyword}
- **Mistake 1**: [What people do wrong + correct approach]
- **Mistake 2**: [Error + solution]
- **Mistake 3**: [Pitfall + how to avoid]

## FAQs

### 1. What's the most important ${keyword} tip?
[Direct answer, then explanation]

### 2. How long does it take to see results from these tips?
[Direct answer with timeline]

### 3. Do these tips work for beginners?
[Direct answer with guidance]

### 4. Which tip has the biggest impact?
[Direct answer with reasoning]

### 5. Can I combine multiple tips?
[Direct answer with recommendations]

## Conclusion: Start Using These ${keyword} Tips Today

[Recap top 3 most impactful tips]
[Encouragement to take action]
[CTA with specific next step]

---
Write the complete tips article now in Markdown. Make each tip specific, actionable, and backed by reasoning or examples.`;
}

// ============================================================================
// REVIEW PROMPT (1500-2000 words)
// ============================================================================
function getReviewPrompt(keyword: string, title: string): string {
  return `You are an expert product reviewer creating an in-depth review optimized for SEO, AEO, and Google's Product Review guidelines.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** Product/Tool Review

${SEO_AEO_BASE_INSTRUCTIONS}

## GOOGLE PRODUCT REVIEW REQUIREMENTS (Critical for ranking)
- Display significant expertise with detailed insights
- Share personal/hands-on testing experiences
- Use quantitative data and comparisons
- Incorporate original observations (not just specs)
- Explain what sets the product apart
- Show evidence of personal testing

## REQUIRED STRUCTURE

# ${title}

[2-3 sentence intro: Why reviewing this + your experience level + what readers will learn. Include "${keyword}".]

## Quick Verdict

**Rating:** ⭐⭐⭐⭐☆ [X/5 or X/10]

**One-Line Verdict:** [Single sentence summary of recommendation]

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Features** | X/10 | [Brief note] |
| **Ease of Use** | X/10 | [Brief note] |
| **Value for Money** | X/10 | [Brief note] |
| **Performance** | X/10 | [Brief note] |
| **Support** | X/10 | [Brief note] |

**Best For:** [Specific user type]
**Skip If:** [Who shouldn't buy this]

## Table of Contents
[Links to all H2 sections]

## What is ${keyword}?
[40-60 word answer-first explanation]
[Brief background, company info, market position]
[Who makes it and why it exists]

## How I Tested ${keyword}
[CRITICAL FOR E-E-A-T: Show real experience]
- **Testing Period:** [Duration]
- **Use Cases Tested:** [List specific scenarios]
- **Comparison Against:** [Competitors tested alongside]
- **Metrics Measured:** [What you evaluated]

## Key Features Deep Dive

### [Feature 1]
[40-60 word summary of this feature]
[Detailed experience using it]
[Specific results/outcomes]

### [Feature 2]
[Continue pattern for 4-6 key features]

## What I Liked (Pros)
[40-60 word summary of strengths]

1. **[Pro 1]**: [Specific detail with evidence]
2. **[Pro 2]**: [Specific detail]
3. **[Pro 3]**: [Continue for 5-8 pros]

## What Could Be Better (Cons)
[40-60 word honest assessment]

1. **[Con 1]**: [Specific issue + impact]
2. **[Con 2]**: [Specific limitation]
3. **[Con 3]**: [Continue for 3-5 cons]

## ${keyword} Pricing & Plans

| Plan | Price | Features | Best For |
|------|-------|----------|----------|
| Free | $0 | [Key limitations] | [User type] |
| Basic | $X/mo | [Key features] | [User type] |
| Pro | $X/mo | [Key features] | [User type] |
| Enterprise | Custom | [Key features] | [User type] |

**Value Assessment:** [Is it worth the price? For whom?]

## ${keyword} vs Alternatives

| Feature | ${keyword} | [Alternative 1] | [Alternative 2] |
|---------|------------|-----------------|-----------------|
| Pricing | $X | $Y | $Z |
| [Key Feature] | [Rating] | [Rating] | [Rating] |
| Best For | [User] | [User] | [User] |

## Who Should Use ${keyword}?

### Perfect For:
- [User type 1 with specific scenario]
- [User type 2]
- [User type 3]

### Not Ideal For:
- [User type who should look elsewhere]
- [Scenario where it falls short]

## FAQs

### 1. Is ${keyword} worth it in 2026?
[Direct answer with conditions]

### 2. What's the biggest limitation of ${keyword}?
[Direct honest answer]

### 3. How does ${keyword} compare to [main competitor]?
[Direct comparison]

### 4. Is there a free version of ${keyword}?
[Direct answer with details]

### 5. How steep is the learning curve?
[Direct answer with timeline]

## Final Verdict

[Clear, definitive recommendation - not wishy-washy]
[Who should buy it]
[Who should skip it]
[Final rating justification]

## Try ${keyword} Today

[CTA with specific action]
[Any current deals or trial offers]

---
Write the complete review now in Markdown. Show genuine expertise through specific observations, testing methodology, and honest pros/cons. Avoid generic statements.`;
}

// ============================================================================
// TROUBLESHOOTING PROMPT (1000-1500 words)
// ============================================================================
function getTroubleshootPrompt(keyword: string, title: string): string {
  return `You are a technical support expert creating a troubleshooting guide optimized for SEO and AEO.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,000-1,500 words
**Content Type:** Troubleshooting/Error Fix Guide

${SEO_AEO_BASE_INSTRUCTIONS}

## TROUBLESHOOTING-SPECIFIC REQUIREMENTS
- Organize by symptom (users search by what they see)
- Include exact error messages verbatim
- Provide step-by-step solutions
- Add "If this doesn't work" alternatives
- Quick fix first, detailed explanation after

## REQUIRED STRUCTURE

# ${title}

[2-3 sentence intro: Acknowledge the frustration + promise solution + what causes this. Include "${keyword}".]

## Quick Fix (TL;DR)
[50-70 word fastest solution that works for most users]

\`\`\`
[Command or quick action if applicable]
\`\`\`

**If that doesn't work, continue reading for detailed solutions.**

## Table of Contents
[Links to all solutions]

## What Does "${keyword}" Mean?
[40-60 word explanation of the error/issue]
[Technical explanation in simple terms]
[Common causes listed]

## Quick Checklist Before Deep Troubleshooting
- [ ] [Quick check 1]
- [ ] [Quick check 2]
- [ ] [Quick check 3]
- [ ] [Quick check 4]

## Solution 1: [Most Common Fix]
[40-60 word summary of when this solution applies]

**Steps:**
1. [Specific action]
2. [Specific action]
3. [Specific action]

\`\`\`
[Code/command if applicable]
\`\`\`

**Expected Result:** [What success looks like]

## Solution 2: [Second Most Common Fix]
[40-60 word summary]

**Steps:**
1. [Action]
2. [Action]

[Continue pattern for 3-5 solutions]

## Solution 3: [Alternative Approach]
[Continue pattern]

## Why This Error Happens
[Technical explanation of root cause]
[Common triggers]
[Environmental factors]

## How to Prevent ${keyword} in the Future
1. **[Prevention method 1]**: [Explanation]
2. **[Prevention method 2]**: [Explanation]
3. **[Prevention method 3]**: [Explanation]

## Error Variations and Their Solutions

| Error Message | Cause | Quick Fix |
|---------------|-------|-----------|
| "[Exact error text 1]" | [Cause] | [Solution] |
| "[Exact error text 2]" | [Cause] | [Solution] |

## FAQs

### 1. Why do I keep getting ${keyword}?
[Direct answer with common causes]

### 2. Is ${keyword} a serious problem?
[Direct answer about severity]

### 3. Will I lose data because of ${keyword}?
[Direct answer with precautions]

### 4. How long does it take to fix ${keyword}?
[Direct answer with time estimate]

### 5. Should I contact support for ${keyword}?
[Direct answer with guidance on when to escalate]

## Still Having Issues?

[Guidance on next steps]
[When to contact support]
[Community resources]

---
Write the complete troubleshooting guide now in Markdown. Use exact error messages, specific steps, and include code blocks where relevant.`;
}

// ============================================================================
// API DOCUMENTATION PROMPT (1500-2000 words)
// ============================================================================
function getAPIPrompt(keyword: string, title: string): string {
  return `You are a technical documentation expert creating an API guide optimized for SEO and developer experience.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** API Documentation/Integration Guide

${SEO_AEO_BASE_INSTRUCTIONS}

## API DOCUMENTATION REQUIREMENTS
- Clear, descriptive headings (not generic "Overview")
- Working code examples in multiple languages
- Authentication setup clearly explained
- Error codes with solutions
- Rate limiting information

## REQUIRED STRUCTURE

# ${title}

[2-3 sentence intro: What you can build + who this is for + prerequisites. Include "${keyword}".]

## Quick Start (TL;DR)
[50-70 word fastest path to first API call]

\`\`\`bash
# Quick example
curl -X GET "https://api.example.com/v1/endpoint" \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

## Table of Contents
[Links to all sections]

## What is ${keyword}?
[40-60 word answer-first explanation]
[Capabilities overview]
[Use cases]

## Prerequisites
- [Requirement 1: Account, API key, etc.]
- [Requirement 2: Technical requirements]
- [Requirement 3: Dependencies]

## Authentication

### Getting Your API Key
1. [Step to get API key]
2. [Step 2]
3. [Step 3]

### Using Your API Key
\`\`\`bash
# Header authentication
Authorization: Bearer YOUR_API_KEY
\`\`\`

\`\`\`python
# Python example
import requests

headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
\`\`\`

\`\`\`javascript
// JavaScript example
const headers = {
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json'
};
\`\`\`

## Your First API Request

### Basic Request
[40-60 word explanation of what this does]

\`\`\`bash
curl -X POST "https://api.example.com/v1/endpoint" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"param": "value"}'
\`\`\`

### Response
\`\`\`json
{
  "status": "success",
  "data": {
    "id": "abc123",
    "result": "..."
  }
}
\`\`\`

## API Parameters Reference

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`param1\` | string | Yes | [Description] |
| \`param2\` | integer | No | [Description + default] |
| \`param3\` | boolean | No | [Description + default] |

## Complete Code Examples

### Python
\`\`\`python
[Full working example]
\`\`\`

### JavaScript/Node.js
\`\`\`javascript
[Full working example]
\`\`\`

### cURL
\`\`\`bash
[Full working example]
\`\`\`

## Error Handling

| Error Code | Message | Cause | Solution |
|------------|---------|-------|----------|
| 400 | Bad Request | [Cause] | [Fix] |
| 401 | Unauthorized | [Cause] | [Fix] |
| 429 | Rate Limited | [Cause] | [Fix] |
| 500 | Server Error | [Cause] | [Fix] |

\`\`\`python
# Error handling example
try:
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
except requests.exceptions.HTTPError as e:
    print(f"Error: {e}")
\`\`\`

## Rate Limits & Best Practices

| Plan | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Free | X | X |
| Pro | X | X |

**Best Practices:**
- [Practice 1: Caching, retry logic, etc.]
- [Practice 2]
- [Practice 3]

## FAQs

### 1. How do I get an API key for ${keyword}?
[Direct answer with steps]

### 2. What's the rate limit?
[Direct answer with numbers]

### 3. Is there a free tier?
[Direct answer]

### 4. How do I handle errors?
[Direct answer with code reference]

### 5. Can I use this in production?
[Direct answer about production readiness]

## Next Steps

[CTA: Get API key, explore endpoints, join community]

---
Write the complete API guide now in Markdown. Include working code examples and specific technical details.`;
}

// ============================================================================
// USE CASE PROMPT (1500-2000 words)
// ============================================================================
function getUseCasePrompt(keyword: string, title: string): string {
  return `You are an industry expert creating a use case article optimized for SEO and AEO.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** Industry Use Case / Workflow Guide

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE

# ${title}

[2-3 sentence intro: Industry problem + solution with ${keyword} + outcomes achieved. Include keyword naturally.]

## Quick Summary
[50-70 words with key outcomes and who benefits]

## Table of Contents

## The Problem: [Industry Challenge]
[40-60 word answer-first problem statement]
[Detailed pain points - 2-3 paragraphs]
[Cost of not solving this problem]

## The Solution: How ${keyword} Solves This
[40-60 word answer explaining the solution]
[How it addresses each pain point]
[Key benefits with metrics where possible]

## Step-by-Step Workflow

### Step 1: [Setup/Preparation]
[40-60 word summary]
[Detailed instructions]

### Step 2: [Core Action]
[Continue pattern for 5-7 steps]

## Real-World Examples

### Example 1: [Specific Scenario]
**Challenge:** [What they faced]
**Solution:** [How they used ${keyword}]
**Result:** [Outcomes with metrics]

### Example 2: [Different Scenario]
[Continue pattern]

## Templates & Resources
[Ready-to-use templates, checklists, or starting points]

## Recommended Tools for ${keyword}
| Tool | Best For | Pricing |
|------|----------|---------|
| [Tool 1] | [Use case] | [Price] |
| [Tool 2] | [Use case] | [Price] |

## FAQs

### 1. How long does it take to implement ${keyword}?
[Direct answer]

### 2. What's the ROI of using ${keyword}?
[Direct answer with metrics]

### 3. Do I need technical skills?
[Direct answer]

### 4. What are the common challenges?
[Direct answer]

### 5. How do I measure success?
[Direct answer with KPIs]

## Get Started Today
[CTA with specific first step]

---
Write the complete use case article now in Markdown. Use specific industry examples and measurable outcomes.`;
}

// ============================================================================
// PROMPT LIBRARY (1500-2500 words)
// ============================================================================
function getPromptLibraryPrompt(keyword: string, title: string): string {
  return `You are an AI prompt engineering expert creating a prompt library optimized for SEO and practical use.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,500 words
**Content Type:** Prompt Collection/Library

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE

# ${title}

[2-3 sentence intro: Why these prompts + what results they produce + who benefits. Include "${keyword}".]

## Quick Summary
[50-70 words highlighting best prompts and use cases]

## Table of Contents

## The Prompt Formula for ${keyword}
[40-60 word explanation of effective prompt structure]

\`\`\`
[Template formula users can follow]
Example: [Role] + [Task] + [Context] + [Constraints] + [Output Format]
\`\`\`

## ${keyword} Prompts by Category

### Category 1: [Use Case]

#### Prompt 1: [Descriptive Name]
\`\`\`
[Complete, copy-paste ready prompt]
\`\`\`
**Best For:** [When to use this]
**Expected Output:** [What you'll get]

#### Prompt 2: [Name]
\`\`\`
[Prompt]
\`\`\`

[Continue for 20-50 prompts across 4-6 categories]

### Category 2: [Different Use Case]
[Continue pattern]

## Prompt Variations
[Same intent, different styles - formal, casual, detailed, minimal]

## Best Settings for ${keyword}
| Setting | Recommended Value | Why |
|---------|-------------------|-----|
| Temperature | X | [Explanation] |
| Max Tokens | X | [Explanation] |
| [Other settings] | X | [Explanation] |

## Common Prompt Mistakes to Avoid
1. **[Mistake]**: [What goes wrong + correct approach]
2. **[Mistake]**: [Continue for 5-7 mistakes]

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

## Download & Next Steps
[CTA: bookmark, download, try first prompt]

---
Write the complete prompt library now in Markdown. Make every prompt copy-paste ready and practically useful.`;
}

// ============================================================================
// TOOLS DEEP-DIVE PROMPT (1500-2000 words)
// ============================================================================
function getToolsPrompt(keyword: string, title: string): string {
  return `You are a product expert creating a comprehensive tool guide optimized for SEO and AEO.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,500-2,000 words
**Content Type:** Tool/Product Deep Dive

${SEO_AEO_BASE_INSTRUCTIONS}

## REQUIRED STRUCTURE

# ${title}

[2-3 sentence intro: What the tool does + why it matters + who it's for. Include "${keyword}".]

## Quick Summary
[50-70 words with key capabilities and verdict]

## Table of Contents

## What is ${keyword}?
[40-60 word definition and explanation]
[Company background]
[Market position]

## Key Features
[40-60 word overview]

### [Feature 1]
[Detailed explanation with use cases]

### [Feature 2]
[Continue for 5-8 key features]

## How ${keyword} Works
[Technical overview in accessible language]
[Step-by-step typical workflow]

## How to Use ${keyword}

### Getting Started
1. [First step]
2. [Second step]
[5-7 steps to first success]

### Advanced Usage
[Tips for power users]

## ${keyword} Pricing & Plans

| Plan | Price | Key Features | Best For |
|------|-------|--------------|----------|
| Free | $0 | [Features] | [User] |
| Pro | $X/mo | [Features] | [User] |

## Pros & Cons

**Pros:**
- [Strength 1]
- [Strength 2]

**Cons:**
- [Limitation 1]
- [Limitation 2]

## Best Alternatives to ${keyword}

| Alternative | Best For | Price |
|-------------|----------|-------|
| [Alt 1] | [Use case] | [Price] |
| [Alt 2] | [Use case] | [Price] |

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

## Final Verdict
[Clear recommendation]

## Try ${keyword} Today
[CTA with action]

---
Write the complete tool guide now in Markdown.`;
}

// ============================================================================
// UPCOMING/TRENDS PROMPT (1000-1500 words)
// ============================================================================
function getUpcomingPrompt(keyword: string, title: string): string {
  return `You are an industry analyst creating a trends/upcoming release article optimized for SEO and freshness signals.

**Title:** ${title}
**Primary Keyword:** ${keyword}
**Target Word Count:** 1,000-1,500 words
**Content Type:** News/Trends/Upcoming Release

${SEO_AEO_BASE_INSTRUCTIONS}

## FRESHNESS-SPECIFIC REQUIREMENTS
- Include specific dates and timelines
- Reference recent announcements with sources
- Provide "what we know so far" structure
- Update-friendly format for easy refreshing

## REQUIRED STRUCTURE

# ${title}

[2-3 sentence intro: What's coming + why it matters + what's known. Include "${keyword}".]

## Key Takeaways
[50-70 words with most important points - featured snippet optimized]
- [Key point 1 with specific detail]
- [Key point 2]
- [Key point 3]

## Table of Contents

## What is Coming: ${keyword} Overview
[40-60 word summary of announcements/predictions]
[What we know confirmed vs rumored]

## Release Timeline
| Milestone | Expected Date | Status |
|-----------|---------------|--------|
| [Milestone 1] | [Date] | Confirmed/Rumored |
| [Milestone 2] | [Date] | Confirmed/Rumored |

## Expected Features
[40-60 word overview]

### [Feature 1]
[What's expected + source of information]

### [Feature 2]
[Continue for major expected features]

## Why ${keyword} Matters
[Impact analysis]
[Who will benefit]

## What You Can Use Now (Alternatives)
[Current options while waiting]
| Alternative | How It Compares |
|-------------|-----------------|
| [Option 1] | [Comparison] |

## FAQs

### 1. When is ${keyword} releasing?
[Direct answer with best known date]

### 2. How much will ${keyword} cost?
[Direct answer or educated estimate]

### 3. Should I wait for ${keyword}?
[Direct advice]

### 4. What's confirmed vs rumored?
[Direct categorization]

### 5. How do I get early access?
[Direct answer if applicable]

## Stay Updated
[CTA: newsletter, follow, bookmark]

*Last Updated: [Date]*

---
Write the complete trends article now in Markdown. Clearly distinguish confirmed facts from speculation.`;
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
    // Use gpt-4o for all content types now (better quality)
    const response = await openai.generate({
      prompt,
      model: 'gpt-4o',
      maxTokens: 16000,
      temperature: 0.7,
    });

    const content = response.content;

    // Generate meta description optimized for CTR and AEO
    const metaPrompt = `Write a compelling meta description for this blog post.

REQUIREMENTS:
- Maximum 155 characters
- Include the keyword "${keyword}" naturally
- Create urgency or curiosity
- Include a benefit or value proposition
- End with implicit CTA

EXAMPLES OF GOOD META DESCRIPTIONS:
- "Kling vs Veo3 compared: pricing, quality, speed. See which AI video generator wins for your needs in 2026. Full comparison inside."
- "Master ${keyword} with our step-by-step guide. Learn the techniques pros use to [benefit]. Start improving today."

Title: ${title}
Blog Type: ${blogType}

Return ONLY the meta description text, nothing else.`;

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

    return {
      content,
      metaDescription,
      sections: template.sections.required.map((s) => s.id),
    };
  } catch (error) {
    logger.error('Content generation failed', { error: String(error), blogType });
    throw error;
  }
}
