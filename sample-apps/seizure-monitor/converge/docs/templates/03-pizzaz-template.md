# Pizzaz Template

## Overview

The Pizzaz Template showcases advanced Widget SDK features through an interactive pizza shop finder. It demonstrates theme awareness, state persistence, responsive layouts, and external integrations with Mapbox for interactive maps.

## What's Included

- **Pizza Shop Module** - Complete shop discovery system
- **3 Interactive Widgets** - Map, list, and detail views
- **Widget SDK Features** - Theme, state, display mode, and height management
- **Mapbox Integration** - Interactive maps with custom markers
- **State Persistence** - Favorites and preferences across sessions
- **Responsive Design** - Adapts to different display modes
- **No Authentication** - Focus on widget development

## Quick Start

### Create Project

```bash
npx @nitrostack/cli init my-pizzaz --template typescript-pizzaz
cd my-pizzaz
```

### Configure Mapbox (Optional)

1. Get free API key from [Mapbox](https://www.mapbox.com/)
2. Create `.env`:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

Note: Template works without Mapbox, but map widget will show error.

### Run Development

```bash
npm run dev
```

## Project Structure

```
src/
├── modules/
│   └── pizzaz/
│       ├── pizzaz.module.ts           # Module definition
│       ├── pizzaz.tools.ts            # Shop discovery tools
│       ├── pizzaz.service.ts          # Business logic
│       └── pizzaz.data.ts             # Shop data
├── widgets/
│   └── app/
│       ├── pizza-map/                 # Interactive map widget
│       ├── pizza-list/                # Grid/list view widget
│       └── pizza-shop/                # Shop detail widget
│   └── components/
│       ├── PizzaCard.tsx              # Reusable card component
│       └── CompactShopCard.tsx        # Compact card variant
└── index.ts                           # Bootstrap
```

## Widget SDK Features

### Theme Awareness

Automatic dark mode support:

```typescript
import { useTheme } from '@nitrostack/widgets';

const theme = useTheme(); // 'light' | 'dark'
const bgColor = theme === 'dark' ? '#000' : '#fff';
```

### State Persistence

Persistent favorites and preferences:

```typescript
import { useWidgetState } from '@nitrostack/widgets';

const { state, setState } = useWidgetState<{
  favorites: string[];
  viewMode: 'grid' | 'list';
}>();

// State persists across widget reloads
setState({ ...state, favorites: [...state.favorites, shopId] });
```

### Responsive Layouts

Height-aware layouts:

```typescript
import { useMaxHeight } from '@nitrostack/widgets';

const maxHeight = useMaxHeight();
return <div style={{ maxHeight }}>{content}</div>;
```

### Display Mode Adaptation

Fullscreen mode detection:

```typescript
import { useDisplayMode } from '@nitrostack/widgets';

const displayMode = useDisplayMode(); // 'inline' | 'pip' | 'fullscreen'
const showSidebar = displayMode === 'fullscreen';
```

### External Links

Open URLs in browser:

```typescript
import { useWidgetSDK } from '@nitrostack/widgets';

const { openExternal } = useWidgetSDK();
openExternal('https://example.com');
```

## Widgets

### Pizza Map Widget

Interactive Mapbox map featuring:
- Custom shop markers
- Shop sidebar with quick selection
- Fullscreen mode support
- Persistent favorites
- Theme-aware map styles (light/dark)

### Pizza List Widget

Filterable shop list with:
- Grid/list view toggle
- Sorting by rating, name, or price
- Favorites tracking
- Responsive layout
- Filter panel

### Pizza Shop Widget

Detailed shop information:
- Hero image with overlay
- Contact actions (call, directions, website)
- Specialties showcase
- Related shops recommendations
- External link handling

## Tools

### show_pizza_map

Display shops on interactive map:
- All shops with markers
- Sidebar navigation
- Fullscreen recommended

### show_pizza_list

Show filterable list:
- Grid or list view
- Sort and filter options
- Favorites management

### show_pizza_shop

Display shop details:
- Complete information
- Contact actions
- Related recommendations

## Customization

### Adding Shops

Edit `src/modules/pizzaz/pizzaz.data.ts`:

```typescript
export const PIZZA_SHOPS: PizzaShop[] = [
  {
    id: 'my-shop',
    name: 'My Pizza Shop',
    description: 'Amazing pizza!',
    address: '123 Main St, City, State 12345',
    coords: [-122.4194, 37.7749], // [lng, lat]
    rating: 4.5,
    reviews: 100,
    priceLevel: 2,
    cuisine: ['Italian', 'Pizza'],
    hours: { open: '11:00 AM', close: '10:00 PM' },
    phone: '(555) 123-4567',
    website: 'https://example.com',
    image: 'https://images.unsplash.com/photo-...',
    specialties: ['Margherita', 'Pepperoni'],
    openNow: true,
  }
];
```

### Changing Map Style

Edit `src/widgets/app/pizza-map/page.tsx`:

```typescript
style: isDark 
  ? 'mapbox://styles/mapbox/dark-v11'
  : 'mapbox://styles/mapbox/streets-v12'
```

### Adding Filters

Edit `src/modules/pizzaz/pizzaz.service.ts` to add filter options.

## Example Usage

### View Map
```
User: "Show me pizza shops on a map"
AI: Calls show_pizza_map
Result: Interactive map with all shops
```

### List Shops
```
User: "List all pizza shops"
AI: Calls show_pizza_list
Result: Grid view with sorting and filtering
```

### Shop Details
```
User: "Show me details for Tony's Pizza"
AI: Calls show_pizza_shop
Result: Complete shop information with actions
```

## Learning Objectives

This template demonstrates:

1. **Widget SDK** - All major SDK features
2. **Theme Integration** - Dark mode support
3. **State Management** - Persistent user preferences
4. **Responsive Design** - Display mode adaptation
5. **External APIs** - Mapbox integration
6. **Component Reuse** - Shared components
7. **User Interactions** - Favorites, sorting, filtering

## Commands

```bash
npm run dev              # Start dev server with Studio
npm run build            # Build for production
npm start                # Run production server
npm run widget dev       # Widget dev server only
```

## Deployment

### Build Widgets

```bash
cd src/widgets && npm run build
```

Widget HTML files will be in `src/widgets/out/`.

### ChatGPT Deployment

Widgets work identically in OpenAI ChatGPT with zero code changes.

## Next Steps

- [Widget SDK Reference](../sdk/typescript/18-widget-sdk-reference.md)
- [UI Widgets Guide](../sdk/typescript/16-ui-widgets-guide.md)
- [File Upload Guide](../sdk/typescript/19-file-upload-guide.md)
- [Starter Template](./01-starter-template.md) - Learn the basics
- [OAuth Template](./02-oauth-template.md) - Authentication

## Use Cases

Perfect for building:
- Location-based services
- Shop/restaurant finders
- Interactive maps
- Filterable catalogs
- Review systems
