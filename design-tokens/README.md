# Finanzteam26.de Design Tokens

These design tokens have been meticulously extracted from [finanzteam26.de](https://finanzteam26.de/) to preserve the brand's aesthetic in the LeadMonster project.

## Directory Structure
- `tokens.json`: Raw extracted data for programmatic use.
- `tailwind-config-snippet.js`: Configuration for easy integration into Tailwind CSS.

## Key Design Characteristics

### Colors
- **Primary**: Light Blue (`#abd5f4`) – Used for primary brand identity.
- **Accent**: Vibrant Orange (`#ff9651`) – Used for important highlights and CTA elements.
- **Text**: Neutral greys (`#333333` for headings, `#666666` for body) provide a professional and clear reading experience.

### Typography
- **Headings**: Clean and authoritative using **Roboto**.
- **Body**: Warm and modern using **Nunito Sans**.
- **Base font size**: 16px with a generous 1.6 line-height for readability.

### Spacing & Layout
A consistent 20px base increment is used across the site for padding and margins. Vertical section padding ranges from 40px (small) up to 210px (XL screens).

### Borders & Radius
- **Border Radius**: 0px (sharp corners) are used for most UI elements.
- **Special Borders**: Many buttons use a unique "hand-drawn/sketched" look, implemented via SVG border-images.

## Integration
To use these in your Tailwind CSS project, refer to `tailwind-config-snippet.js`. This snippet can be merged directly into your `tailwind.config.js`.

---
*Created on 2026-04-02*
