# Centralized Styling Rule

## Overview
All styling in the lookout-portal must use centralized CSS variables and utility classes defined in `src/index.css`. Do not use inline Tailwind gradient classes or custom color values.

## Centralized Style Location
- **File**: `src/index.css`
- **Contains**: CSS variables, utility classes, theme definitions

## Available Utility Classes

### Text Styling
- `.text-gradient` - Apply gradient text effect (uses `--gradient-header`)

### Background Styling
- `.auth-bg` - Auth page background gradient (uses `--gradient-auth-bg`)

### Card Styling
- `.card-elevated` - Elevated card with shadow and hover effects
- `.card-hover` - Card with hover lift effect

### Button Styling
- `.btn-gradient` - Gradient button with hover effects (uses `--gradient-button`)

### Animation
- `.fade-in` - Fade in animation

## CSS Variables
All colors, gradients, shadows, and spacing are defined as CSS variables in `:root`:
- `--bg-body`, `--bg-card`, `--bg-surface`, `--bg-hover`
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--accent`, `--accent-hover`, `--accent-subtle`
- `--gradient-header`, `--gradient-button`, `--gradient-auth-bg`
- `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- And more...

## Usage Examples

### ✅ Correct
```tsx
// Use centralized classes
<div className="auth-bg">
  <Card className="card-elevated">
    <h1 className="text-gradient">Title</h1>
    <Button className="btn-gradient">Click</Button>
  </Card>
</div>

// Use CSS variables for inline styles
<div style={{ backgroundColor: 'var(--bg-body)' }}>
```

### ❌ Incorrect
```tsx
// Don't use inline Tailwind gradients
<div className="bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900">

// Don't use custom color values
<div style={{ backgroundColor: '#064e3b' }}>

// Don't use inline gradient classes on text
<h1 className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
```

## Theme Support
The theme includes dark mode support via `[data-theme="dark"]` selector. When implementing theme switching, toggle the `data-theme` attribute on the root element.

## Design Inspiration
The color scheme is based on the novomesa app's green/teal theme for consistency across Hixson AI products.
