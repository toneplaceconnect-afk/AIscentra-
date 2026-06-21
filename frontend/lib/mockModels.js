// lib/mockModels.js
//
// Mock data shaped exactly like GET /api/models / GET /api/models/:slug
// responses, per db/005_models_table.sql + server/routes/models.js.
//
// No score, rank, or delta fields anywhere — deliberately, matching
// the real table's constraint (see db/005_models_table.sql header
// comment for why).

export const MOCK_MODELS = [
  {
    id: 'm1',
    name: 'GPT-4o',
    slug: 'gpt-4o',
    maker: 'OpenAI',
    maker_color: '#10a37f',
    avatar_label: 'GPT',
    tagline: 'OpenAI · Multimodal · May 2024',
    license_type: 'proprietary',
    tags: ['Multimodal', 'Proprietary', 'API'],
    basics: [
      { label: 'Context window', value: '128,000 tokens' },
      { label: 'Modalities', value: 'Text, image, audio' },
      { label: 'Access', value: 'API, ChatGPT' },
      { label: 'Training cutoff', value: 'October 2023' },
    ],
    origin: [
      { heading: 'Background', body: 'GPT-4o ("omni") was released by OpenAI in May 2024 as a unified model handling text, vision, and audio in a single network, replacing the prior pipeline of separate specialized models.' },
    ],
    evolution: [
      { heading: 'From GPT-4 to GPT-4o', body: 'Where GPT-4 Turbo relied on separate audio transcription and synthesis steps, GPT-4o processes audio natively end-to-end, reducing latency significantly.' },
    ],
    uses: [
      { category: 'Coding', heading: 'Pair programming', body: 'Widely used as a coding assistant across IDE integrations.' },
      { category: 'Voice', heading: 'Real-time conversation', body: 'Powers low-latency voice mode in the ChatGPT app.' },
    ],
    facts_data: [
      { label: 'API availability', value: 'Public, all tiers' },
      { label: 'Knowledge cutoff', value: 'Oct 2023' },
    ],
    sources: [
      { source_name: 'OpenAI announcement blog', url: 'https://openai.com/index/hello-gpt-4o/', source_type: 'official' },
    ],
    language: 'en',
    status: 'published',
  },
  {
    id: 'm2',
    name: 'Claude 3.5 Sonnet',
    slug: 'claude-3-5-sonnet',
    maker: 'Anthropic',
    maker_color: '#d97757',
    avatar_label: 'CL',
    tagline: 'Anthropic · Text & vision · June 2024',
    license_type: 'proprietary',
    tags: ['Vision', 'Proprietary', 'API'],
    basics: [
      { label: 'Context window', value: '200,000 tokens' },
      { label: 'Modalities', value: 'Text, image' },
      { label: 'Access', value: 'API, Claude.ai' },
    ],
    origin: [
      { heading: 'Background', body: 'Released by Anthropic as the second model in the Claude 3.5 family, positioned as a mid-tier model with strong reasoning and coding performance.' },
    ],
    evolution: [
      { heading: 'Artifacts', body: 'Introduced alongside Claude 3.5 Sonnet — a workspace for generating and iterating on documents, code, and diagrams in a dedicated panel.' },
    ],
    uses: [
      { category: 'Coding', heading: 'Agentic coding', body: 'Frequently used in agentic coding workflows and IDE integrations.' },
    ],
    facts_data: [
      { label: 'Knowledge cutoff', value: 'Apr 2024' },
    ],
    sources: [
      { source_name: 'Anthropic announcement', url: 'https://www.anthropic.com/news/claude-3-5-sonnet', source_type: 'official' },
    ],
    language: 'en',
    status: 'published',
  },
  {
    id: 'm3',
    name: 'DeepSeek V3',
    slug: 'deepseek-v3',
    maker: 'DeepSeek',
    maker_color: '#4d6bfe',
    avatar_label: 'DS',
    tagline: 'DeepSeek · Open weights · Dec 2024',
    license_type: 'open_weights',
    tags: ['Open weights', 'MoE', 'Self-hostable'],
    basics: [
      { label: 'Architecture', value: 'Mixture-of-experts' },
      { label: 'Parameters', value: '671B total, 37B active' },
      { label: 'Access', value: 'Open weights, API' },
    ],
    origin: [
      { heading: 'Background', body: 'Released by DeepSeek with openly published weights, drawing significant attention for its training efficiency claims relative to its scale.' },
    ],
    evolution: [
      { heading: 'From V2 to V3', body: 'Expanded the mixture-of-experts architecture and training data relative to the V2 generation.' },
    ],
    uses: [
      { category: 'Self-hosting', heading: 'Local deployment', body: 'Open weights allow self-hosted deployment for organizations with data residency requirements.' },
    ],
    facts_data: [
      { label: 'License', value: 'Open weights (custom license)' },
    ],
    sources: [
      { source_name: 'DeepSeek technical report', url: 'https://github.com/deepseek-ai/DeepSeek-V3', source_type: 'official' },
    ],
    language: 'en',
    status: 'published',
  },
];

export function queryMockModels({ license_type } = {}) {
  let result = MOCK_MODELS.filter((m) => m.status === 'published' && m.language === 'en');
  if (license_type) result = result.filter((m) => m.license_type === license_type);
  // Alphabetical by maker then name — same ordering as the real API, no ranking.
  result = [...result].sort((a, b) => a.maker.localeCompare(b.maker) || a.name.localeCompare(b.name));
  return result;
}

export function getMockModelBySlug(slug) {
  return MOCK_MODELS.find((m) => m.slug === slug && m.status === 'published') || null;
}
