// server/lib/models.js
//
// Centralized model selection per role, each with a fallback list.
// Free OpenRouter models get rate-limited (429) under shared load
// frequently — having several candidates per role means one
// rate-limited model doesn't block the whole pipeline.
//
// Deliberately NOT reading RESEARCH_MODEL/EDITOR_MODEL/ASSISTANT_MODEL
// env vars here. Earlier versions did, which caused a confusing bug:
// a stale value left over in Railway's Variables tab silently jumped
// to the front of the list, ahead of the carefully-ordered fallback
// chain below. The lists here are the single source of truth now —
// to change priority, edit this file, not Railway's dashboard.
//
// Assignment rationale:
// - Research needs to gather and structure facts accurately — a
//   large reasoning model helps here.
// - Editor needs strict JSON-structured output (see prompts/index.js).
// - Assistant is conversational, no JSON requirement.
//
// Every list below includes ALL general-purpose free models supplied,
// in a sensible order for that role, so a single 429 has several
// real alternatives to fall through to before the whole request fails.

const RESEARCH_FALLBACKS = [
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-coder:free',
  'nex-agi/nex-n2-pro:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

const EDITOR_FALLBACKS = [
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-coder:free',
  'nex-agi/nex-n2-pro:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

const ASSISTANT_FALLBACKS = [
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-coder:free',
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openai/gpt-oss-120b:free',
  'nex-agi/nex-n2-pro:free',
];

// Narrow-purpose models intentionally excluded from every list above —
// they don't fit Research/Editor/Assistant's general instruction-
// following task shape:
//   nvidia/nemotron-3.5-content-safety:free  (safety filter, not a generator)
//   liquid/lfm-2.5-1.2b-instruct:free        (very small, kept out for quality)
//   nvidia/llama-nemotron-rerank-vl-1b-v2:free (reranker, not a generator)
//   cohere/north-mini-code:free               (code-completion focused)
//   poolside/laguna-m.1:free                  (unverified general fit)

module.exports = {
  RESEARCH_FALLBACKS,
  EDITOR_FALLBACKS,
  ASSISTANT_FALLBACKS,
};
