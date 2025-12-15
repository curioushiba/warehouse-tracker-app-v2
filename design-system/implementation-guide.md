# PackTrack Design System Implementation Guide

## Executive Summary

The PackTrack design system is a comprehensive component library that embodies clean, efficient inventory management interfaces. Built with a focus on usability and clarity.

### Key Design Philosophy
- **Clarity first** - every interface element serves a clear purpose
- **Efficient workflows** - designed for quick scanning and data entry operations
- **Nature-inspired aesthetics** - calming green palette for reduced eye strain
- **Universal accessibility** - accessible to all users regardless of ability

---

## Color System

### Primary Brand Colors

```css
:root {
  /* Primary - Fun Green */
  --color-primary: #01722f;
  --color-primary-50: #e6f4eb;
  --color-primary-100: #b3dfc4;
  --color-primary-500: #01722f;
  --color-primary-700: #015521;
  --color-primary-900: #003310;
  --color-primary-foreground: #ffffff;

  /* Secondary - Rum Swizzle (Cream) */
  --color-secondary: #faf5e9;
  --color-secondary-foreground: #003400;

  /* Accent - Cinnabar (Red) */
  --color-accent: #e13c30;
  --color-accent-foreground: #ffffff;

  /* Tertiary - CTA Yellow */
  --color-tertiary: #ffcc00;
  --color-tertiary-foreground: #003400;

  /* Text Colors */
  --color-foreground: #003400;
  --color-foreground-secondary: #1a4d1a;
  --color-foreground-muted: #4d6b4d;
  --color-foreground-placeholder: #7a9a7a;

  /* Background Colors */
  --color-background: #ffffff;
  --color-background-secondary: #faf5e9;
  --color-background-tertiary: #f5f0e3;

  /* Border Colors */
  --color-border: #d4d9c8;
  --color-border-strong: #003400;
  --color-border-focus: #01722f;
}
```

### Theme-Specific Color Palettes

Each of the five wildlife themes has a distinct color identity while sharing the master primary green:

```css
:root {
  /* Forest Theme */
  --color-forest-primary: #01722f;
  --color-forest-accent: #ff8c00;

  /* Nocturnal Theme */
  --color-nocturnal-primary: #1a1a3e;
  --color-nocturnal-accent: #c9a227;

  /* Aquatic Theme */
  --color-aquatic-primary: #0077b6;
  --color-aquatic-accent: #90e0ef;

  /* Aviary Theme */
  --color-aviary-primary: #e63946;
  --color-aviary-accent: #06d6a0;

  /* Jungle Theme */
  --color-jungle-primary: #2d6a4f;
  --color-jungle-accent: #d4a373;
}
```

---

## Typography System

### Font Families

```css
:root {
  /* Heading - Custom Wildlife Value Serif */
  --font-heading: 'Wildlife Value Serif', Halant, Vollkorn, Georgia, serif;

  /* Body - Poppins */
  --font-body: 'Poppins', system-ui, -apple-system, sans-serif;

  /* Display - Karrik (secondary) */
  --font-display: 'Karrik', serif;

  /* Monospace */
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

### Type Scale

```css
:root {
  /* Display */
  --text-display: 4.5rem;      /* 72px */
  --text-h1: 3rem;             /* 48px */
  --text-h2: 2.25rem;          /* 36px */
  --text-h3: 1.75rem;          /* 28px */
  --text-h4: 1.375rem;         /* 22px */
  --text-h5: 1.125rem;         /* 18px */
  --text-h6: 1rem;             /* 16px */

  /* Body */
  --text-body-lg: 1.125rem;    /* 18px */
  --text-body: 1rem;           /* 16px */
  --text-body-sm: 0.875rem;    /* 14px */
  --text-caption: 0.75rem;     /* 12px */

  /* Line Heights */
  --leading-tight: 1.1;
  --leading-snug: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.6;
}
```

### Typography Characteristics

The custom **Wildlife Value Serif** typeface features:
- **Pinched angular serifs** that give a leaf-like, organic appearance
- **Rooted feet** inspired by buttress roots of native trees
- **High x-height** for excellent readability
- **Friendly circular letterforms** balancing warmth with credibility
- **Low ascenders** for compact vertical rhythm

---

## Spacing System

```css
:root {
  --space-0: 0px;
  --space-px: 1px;
  --space-0-5: 2px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

---

## Border Radius

```css
:root {
  --radius-none: 0px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 22.5px;  /* Button radius - distinctive brand element */
  --radius-3xl: 32px;
  --radius-full: 9999px;
}
```

**Important:** The `22.5px` button radius is a distinctive brand element. Maintain this consistently across all pill-shaped buttons.

---

## Shadow System

```css
:root {
  --shadow-none: none;
  --shadow-xs: 0 1px 2px 0 rgba(0, 52, 0, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(0, 52, 0, 0.1), 0 1px 2px -1px rgba(0, 52, 0, 0.1);
  --shadow-md: 0 4px 6px -1px rgba(0, 52, 0, 0.1), 0 2px 4px -2px rgba(0, 52, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 52, 0, 0.1), 0 4px 6px -4px rgba(0, 52, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 52, 0, 0.1), 0 8px 10px -6px rgba(0, 52, 0, 0.1);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 52, 0, 0.25);
  --shadow-focus: 0 0 0 3px rgba(1, 114, 47, 0.3);
}
```

Note: Shadows use the dark green color `rgba(0, 52, 0, x)` rather than pure black for a more organic, nature-inspired feel.

---

## Component Specifications

### Buttons

#### Primary Button (Yellow CTA)
```css
.btn-primary {
  background-color: #ffcc00;
  color: #003400;
  border: none;
  border-radius: 22.5px;
  padding: 9px 16px;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 14px;
  transition: all 200ms ease;
}

.btn-primary:hover {
  background-color: #e6b800;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-primary:active {
  background-color: #cc9900;
  transform: translateY(0);
}

.btn-primary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 204, 0, 0.5);
}
```

#### Secondary Button (Green)
```css
.btn-secondary {
  background-color: #01722f;
  color: #ffffff;
  border: none;
  border-radius: 22.5px;
  padding: 9px 16px;
}

.btn-secondary:hover {
  background-color: #015521;
}
```

#### Button Sizes
| Size | Height | Padding X | Font Size |
|------|--------|-----------|-----------|
| sm   | 32px   | 12px      | 13px      |
| md   | 40px   | 16px      | 14px      |
| lg   | 48px   | 24px      | 16px      |

### Cards

#### Spotlight Banner Card
```css
.card-spotlight {
  width: 900px;
  height: 600px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  background: #ffffff;
}

.card-spotlight img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

#### Elevated Card
```css
.card-elevated {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
}

.card-elevated:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}
```

### Form Inputs

```css
.input {
  background: #ffffff;
  border: 1px solid #d4d9c8;
  border-radius: 8px;
  padding: 9px 12px;
  font-family: var(--font-body);
  font-size: 14px;
  color: #003400;
  transition: border-color 150ms ease;
}

.input::placeholder {
  color: #7a9a7a;
}

.input:hover {
  border-color: #01722f;
}

.input:focus {
  border-color: #01722f;
  box-shadow: 0 0 0 2px rgba(1, 114, 47, 0.2);
  outline: none;
}

.input-error {
  border-color: #e13c30;
  box-shadow: 0 0 0 2px rgba(225, 60, 48, 0.2);
}
```

---

## Visual Framework Elements

### Tropical Leaf Frame

The signature visual device is a frame composed of three graphic leaves drawn from native flora:
- **Monstera-inspired** leaf
- **Palm frond** silhouette
- **Banana leaf** element

**Usage:**
- Hero sections
- Feature highlights
- Immersive content areas
- Marketing materials

**Implementation tip:** Use as an SVG overlay or CSS mask for maximum flexibility.

### Illustration Library

The 800+ illustrated elements include:
- **Flora:** Native trees, plants, flowers
- **Fauna:** Park animals (photorealistic)
- **Habitat elements:** Backgrounds, textures

**Style guidelines:**
- Photorealistic animals combined with illustrated tropical backgrounds
- Scientifically accurate depictions
- Can be combined into "panoramic vistas"

---

## Navigation Patterns

### Desktop Megamenu

```css
.megamenu {
  background: #ffffff;
  box-shadow: var(--shadow-lg);
  padding: 24px 32px;
}

.megamenu-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 24px;
}

.megamenu-spotlight {
  width: 900px;
  height: 600px;
}
```

### Header
```css
.header {
  height: 72px;
  background: #ffffff;
  box-shadow: var(--shadow-sm);
  padding: 0 32px;
}
```

---

## Mobile App Specifications

### Platform Requirements
| Platform | Minimum Version | Rating |
|----------|-----------------|--------|
| iOS      | 14.0+           | 4.8/5  |
| Android  | 10+             | 4.57/5 |

### Key Features
1. **Wayfinder** - Interactive digital map with route selection
2. **Cross-zone navigation** - Navigate between Wildlife Reserve EAST and WEST
3. **Itineraries** - Curated routes with all-weather options
4. **Reminders** - 20-minute advance alerts for presentations
5. **Animal Sightings** - Real-time notifications (Jungle zone only)
6. **QR Scanning** - Food ordering and animal information

### Mobile UI Tokens
```css
/* Mobile App Colors */
--app-background: #faf5e9;
--app-button: #ffcc00;
--app-text: #003400;

/* Mobile Typography */
--app-font-heading: 'Value-Serif-Bold';
--app-font-body: 'Poppins-Regular';

/* Mobile Button */
--app-button-radius: 22.5px;
```

---

## Accessibility Guidelines

### Color Contrast
- **Normal text:** 4.5:1 minimum (WCAG AA)
- **Large text:** 3:1 minimum
- **UI components:** 3:1 minimum

### Touch Targets
- **Minimum size:** 44x44px
- **Spacing between targets:** 8px minimum

### Focus Indicators
```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(1, 114, 47, 0.3);
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f4eb',
          100: '#b3dfc4',
          500: '#01722f',
          700: '#015521',
          DEFAULT: '#01722f',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#faf5e9',
          foreground: '#003400',
        },
        accent: {
          DEFAULT: '#e13c30',
          foreground: '#ffffff',
        },
        cta: {
          DEFAULT: '#ffcc00',
          foreground: '#003400',
        },
        foreground: {
          DEFAULT: '#003400',
          secondary: '#1a4d1a',
          muted: '#4d6b4d',
          placeholder: '#7a9a7a',
        },
        background: {
          DEFAULT: '#ffffff',
          secondary: '#faf5e9',
          tertiary: '#f5f0e3',
        },
        border: {
          DEFAULT: '#d4d9c8',
          strong: '#003400',
        },
      },
      fontFamily: {
        heading: ['Wildlife Value Serif', 'Halant', 'Vollkorn', 'Georgia', 'serif'],
        body: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'button': '22.5px',
      },
      boxShadow: {
        'focus': '0 0 0 3px rgba(1, 114, 47, 0.3)',
        'glow-primary': '0 0 20px rgba(1, 114, 47, 0.3)',
      },
    },
  },
}
```

---

## Implementation Priority

1. **Base tokens** (colors, typography, spacing)
2. **Button variants** (primary yellow CTA, secondary green)
3. **Card components** (elevated, spotlight banner)
4. **Navigation** (header, megamenu)
5. **Form inputs** (text, select, checkbox)
6. **Tropical frame device** (SVG overlay system)
7. **Theme-specific theming** (color variants per theme)
8. **Mobile app components** (wayfinder, itinerary cards)

---

## Open Questions / Design Decisions Needed

1. **Custom font licensing** - Wildlife Value Serif requires appropriate licensing for official use
2. **Illustration library access** - The 800+ illustrated elements may require partnership for access
3. **Theme-specific color validation** - Nocturnal midnight blue and aquatic blue values are inferred from descriptions
4. **Dark mode specifics** - Full dark mode palette based on brand principles
5. **Animation specifications** - Transition timings are inferred from standard practices
