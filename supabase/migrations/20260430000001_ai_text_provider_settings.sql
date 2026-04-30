-- Migration: AI text-LLM provider/model selectable via einstellungen table
-- Date: 2026-04-30
-- Purpose: Admin UI lets the operator switch between Anthropic / OpenAI
-- and pick a specific model. Default is the cheapest option (OpenAI gpt-4o-mini).

INSERT INTO einstellungen (schluessel, wert, beschreibung) VALUES
  ('ai_text_provider', 'openai',      'KI-Provider für Text-Generierung: anthropic | openai'),
  ('ai_text_model',    'gpt-4o-mini', 'Konkretes Modell beim gewählten Provider (z.B. gpt-4o-mini, claude-haiku-4-5-20251001)')
ON CONFLICT (schluessel) DO NOTHING;
