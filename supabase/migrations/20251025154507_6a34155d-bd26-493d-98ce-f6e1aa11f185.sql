-- Add appearance configuration to booklets table
ALTER TABLE booklets
ADD COLUMN IF NOT EXISTS appearance JSONB DEFAULT '{
  "theme": "clair",
  "colors": {
    "background": "#ffffff",
    "surface": "#ffffff",
    "accent": "#18c0df",
    "text": "#1a1a1a",
    "muted": "#6b7280"
  },
  "typography": {
    "font_family": "Inter",
    "base_size": 16,
    "heading_weight": 700,
    "body_weight": 400
  },
  "layout": {
    "content_width": 1100,
    "radius": 16,
    "shadow": "soft",
    "spacing": "comfortable"
  },
  "header": {
    "hero_overlay": 0.65,
    "title_align": "left",
    "show_location": true
  },
  "branding": {
    "concierge_name": "",
    "logo_url": "",
    "show_footer_brand": true
  }
}'::jsonb;