# Netlify Visual Editor Setup

This project is configured to work with Netlify Visual Editor using Git CMS as a content source.

## Configuration

- `stackbit.config.ts` - Defines content models and asset configuration
- `netlify.toml` - Contains build commands and Stackbit configuration
- `content/` - Directory where content is stored
  - `content/pages/` - JSON files for each page

## Content Structure

Content is stored in JSON files in the `content/pages` directory. Each page has the following fields:
- `title` - The page title (required)
- `slug` - The URL path segment (required)
- `type` - The content type (required)

## Asset Handling

Assets are configured to be stored in the `public/assets/images` directory and are served from the root URL.

## Local Development

To run the site with Netlify Visual Editor locally:

```
npm run dev
```

## Annotations

When adding annotations to your components for Visual Editor, use the following format:

```html
<div data-sb-object-id="content/pages/home.json">...</div>
```

The object ID is the path to the source file relative to the project root. 