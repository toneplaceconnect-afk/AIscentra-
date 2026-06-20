// server/lib/models.js
//
// Centralized model selection per role, each with a fallback list.
// Free OpenRouter models get rate-limited (429) under shared load
// more often than paid ones — having multiple candidates per role
// means a single rate-limited model doesn't block the whole pipeline.
//
// Override any role's primary model via env vars (RESEARCH_MODEL,
// EDITOR_MODEL, ASSISTANT_MODEL); the fallback chain still applies
// after whatever you set as primary.
//
// Assignment rationale:
// - Research needs to gather and structure facts accurately — a
//   large reasoning model helps here. Hermes-3-405B is the biggest
//   model in the free pool available, used as primary; gpt-oss-120b
//   and qwen3-next as fallbacks.
// - Editor needs strict JSON-structured output (see prompts/index.js)
//   — gpt-oss-120b and qwen3-next both follow structured instructions
//   reasonably well in practice.
// - Assistant is a conversational role with no JSON requirement —
//   Gemma is instruction-tuned for chat, used as primary; Qwen3-Coder
//   and Llama-3.2-3B (small, fast) as fallbacks.
//
// Models intentionally NOT used for any role (kept out of rotation):
// nvidia/nemotron-3.5-content-safety, liquid/lfm-2.5-1.2b-instruct,
// nvidia/llama-nemotron-rerank-vl-1b-v2, cohere/north-mini-code,
// poolside/laguna-m.1, nex-agi/nex-n2-pro — these are narrow-purpose
// (safety filtering, reranking, code-completion) rather than general
// instruction-following models, so they don't fit Research/Editor/
// Assistant's actual task shape.

const RESEARCH_FALLBACKS = [
  process.env.RESEARCH_MODEL || 'nousresearch/hermes-3-llama-3.1-405b:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
];

const EDITOR_FALLBACKS = [
  process.env.EDITOR_MODEL || 'openai/gpt-oss-120b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
];

const ASSISTANT_FALLBACKS = [
  process.env.ASSISTANT_MODEL || 'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-coder:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

module.exports = {
  RESEARCH_FALLBACKS,
  EDITOR_FALLBACKS,
  ASSISTANT_FALLBACKS,
};
