// lib/mockSignals.js
//
// Mock data shaped exactly like the real /api/articles response.
// Used when NEXT_PUBLIC_API_BASE_URL is not set, so this frontend
// runs and is reviewable with zero backend connection and zero API
// keys, per the task constraints.
//
// Shape matches db/004_signal_model.sql + server/routes/articles.js:
// title, slug, excerpt, body, signal_type, impact_level,
// confidence_level, summary_points, published_at.

export const MOCK_SIGNALS = [
  {
    id: '1',
    title: 'GPT-5.5 Released',
    slug: 'gpt-5-5-released',
    excerpt: 'OpenAI released GPT-5.5 with an extended context window and improved reasoning on multi-step tasks.',
    body: 'OpenAI released GPT-5.5 on May 26, 2025. The update extends the context window and reports measurable gains on multi-step reasoning and coding benchmarks. Pricing for existing API tiers remains unchanged. The release follows a pattern of incremental capability updates rather than a full model-family change, and API compatibility with GPT-5 endpoints is preserved.',
    category: 'model_release',
    signal_type: 'model_release',
    impact_level: 'high',
    confidence_level: 'high',
    summary_points: [
      'Extended context window over GPT-5',
      'Measurable gains on multi-step reasoning benchmarks',
      'Existing API pricing tiers unchanged',
      'Full backward compatibility with GPT-5 endpoints',
    ],
    language: 'en',
    status: 'published',
    published_at: '2025-05-26T10:00:00Z',
  },
  {
    id: '2',
    title: 'MiMo Code Agent Now Available',
    slug: 'mimo-code-agent-available',
    excerpt: 'Xiaomi released a coding-focused agent with autonomous multi-file workflow support.',
    body: 'Xiaomi made its MiMo Code Agent generally available on May 25, 2025. The agent is positioned for autonomous multi-file coding workflows, including dependency-aware edits across a codebase. Early documentation indicates support for several mainstream languages and IDE integrations. The launch is part of a broader MiMo-V2 family rollout from Xiaomi.',
    category: 'coding_agents',
    signal_type: 'tool_launch',
    impact_level: 'medium',
    confidence_level: 'medium',
    summary_points: [
      'Autonomous multi-file coding workflows',
      'Dependency-aware edits across a codebase',
      'Part of the broader MiMo-V2 family rollout',
    ],
    language: 'en',
    status: 'published',
    published_at: '2025-05-25T09:00:00Z',
  },
  {
    id: '3',
    title: 'Xiaomi Unveils MiMo-V2 Family of Models',
    slug: 'xiaomi-mimo-v2-family',
    excerpt: 'Xiaomi introduced three new models — MiMo-V2-Pro, -Omni, and -TTS — expanding its AI ecosystem.',
    body: 'Xiaomi introduced the MiMo-V2 family on May 24, 2025: MiMo-V2-Pro, MiMo-V2-Omni, and MiMo-V2-TTS. The family targets reasoning, multimodal input handling, and text-to-speech respectively, and is positioned to integrate across Xiaomi\'s existing hardware ecosystem. This marks Xiaomi\'s broadest simultaneous model release to date and signals deeper investment in proprietary AI infrastructure rather than reliance on third-party models.',
    category: 'model_release',
    signal_type: 'ecosystem_shift',
    impact_level: 'high',
    confidence_level: 'medium',
    summary_points: [
      'Three models released simultaneously: Pro, Omni, TTS',
      'Targets reasoning, multimodal input, and speech respectively',
      'Integrates across Xiaomi\'s hardware ecosystem',
      'Signals deeper investment in proprietary AI infrastructure',
    ],
    language: 'en',
    status: 'published',
    published_at: '2025-05-24T08:00:00Z',
  },
  {
    id: '4',
    title: 'ElevenLabs v4 Is Here',
    slug: 'elevenlabs-v4',
    excerpt: 'ElevenLabs shipped v4 of its voice models with improved naturalness and broader multilingual support.',
    body: 'ElevenLabs released version 4 of its voice generation models on May 23, 2025. The update reports improved naturalness in long-form narration and expanded multilingual coverage. Control parameters for pacing and emotion are reportedly more granular than in v3. No pricing changes were announced alongside the release.',
    category: 'voice_ai',
    signal_type: 'capability_update',
    impact_level: 'low',
    confidence_level: 'medium',
    summary_points: [
      'Improved naturalness in long-form narration',
      'Expanded multilingual coverage',
      'More granular pacing and emotion controls',
    ],
    language: 'en',
    status: 'published',
    published_at: '2025-05-23T07:00:00Z',
  },
];

/** Filters + limits mock signals the same way the real API does. */
export function queryMockSignals({ signal_type, impact_level, limit } = {}) {
  let result = MOCK_SIGNALS.filter((s) => s.status === 'published' && s.language === 'en');

  if (signal_type) result = result.filter((s) => s.signal_type === signal_type);
  if (impact_level) result = result.filter((s) => s.impact_level === impact_level);

  result = [...result].sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  if (limit) result = result.slice(0, limit);

  return result;
}

export function getMockSignalBySlug(slug) {
  return MOCK_SIGNALS.find((s) => s.slug === slug && s.status === 'published') || null;
}
