-- Add image_urls column to goal_templates for large goal image support
-- Each element: { "url": string, "path": string, "size": number, "width": number, "height": number }

ALTER TABLE goal_templates
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
