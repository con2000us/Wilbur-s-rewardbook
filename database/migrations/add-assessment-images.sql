-- Add image_urls column to assessments for multi-image support
-- Each element: { "url": string, "path": string, "size": number, "width": number, "height": number }

ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
