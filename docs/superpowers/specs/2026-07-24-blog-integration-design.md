# Dreamscale Blog Integration Design

## Goal

Turn `/blog/` into a dedicated editorial index that feels like a direct extension of the Dreamscale Labs homepage, and move the existing essay to a permanent article URL.

## Scope

- Preserve the existing homepage composition and copy.
- Make `/blog/` the article index.
- Move the existing essay to `/blog/why-robot-brains-will-live-in-the-cloud/`.
- Preserve the complete essay, its images, external links, table, and reading metadata.
- Give the blog the homepage's white, monochrome, sparse visual identity.
- Do not add invented posts, categories, filters, search, pagination, or publishing infrastructure.

## Information Architecture

### Homepage

The homepage remains the site's quiet primary identity. Its top-right Blog link continues to point to `/blog/`.

### Blog index

The blog index uses the same corner DSL mark and restrained navigation as the homepage. Its main content has:

- a centered `Research` heading;
- a divided article list inspired by the supplied Thinking Machines reference;
- one real entry for `Why Robot Brains Will Live in the Cloud`.

The index does not add a subtitle or invented editorial copy.

Each desktop list row places the publication date in a narrow left column and the article title plus description in a flexible right column. On narrow screens, the date stacks above the title.

### Article page

The article page uses the shared site header and editorial typography. Its hero presents the title, deck, date, essay number, and reading time without restoring the former standalone purple publication identity.

## Visual System

- Background: white.
- Primary text: the homepage's near-black.
- Secondary text: restrained neutral gray.
- Dividers: subtle light gray.
- Header and edge spacing: derived from the homepage.
- Layout: open, centered, and low-density, with no cards, shadows, decorative gradients, or separate blog brand.
- Interaction: understated underline or color changes for hover and keyboard focus.

The blog index borrows only the useful structural ideas from the references: the centered editorial heading from Workshop Labs and the date/title row rhythm from Thinking Machines. It remains recognizably Dreamscale Labs.

## Typography

- Local Mluvka is used for the blog index title, article titles, navigation, labels, dates, metadata, and other interface text.
- Google Fonts' Crimson Text is used for article prose, section headings, deck text, captions, and tables.
- The font stylesheet is loaded from Google Fonts with `display=swap`.
- System serif fallbacks remain available if Crimson Text cannot load.
- The local Mluvka file remains the reliable brand-font source.

## File Structure

- `index.html`: retains the homepage and its Blog link.
- `styles.css`: retains the homepage visual system.
- `blog/index.html`: becomes the blog index.
- `blog/blog.css`: becomes the blog index stylesheet.
- `blog/why-robot-brains-will-live-in-the-cloud/index.html`: contains the existing essay at its permanent URL.
- `blog/why-robot-brains-will-live-in-the-cloud/article.css`: contains article-specific editorial layout and responsive rules.
- `tests/static-page.test.mjs`: verifies the two blog routes, typography contracts, links, preserved article content, and local asset resolution.

Keeping index and article CSS separate prevents a long-form essay stylesheet from obscuring the simpler list layout while allowing both pages to share the same brand values explicitly.

## Responsive Behavior

- The blog index stays centered within a readable maximum width.
- Desktop rows use a date column and a content column.
- Mobile rows stack into one column without horizontal scrolling.
- Article prose uses a narrow reading measure.
- Figures and tables remain usable on small screens; wide tables scroll horizontally inside their container.
- Header links and focus indicators remain keyboard-accessible.

## Failure and Fallback Behavior

- If Google Fonts is unavailable, article copy falls back to a system serif stack without breaking the layout.
- If an article image fails, descriptive alternative text preserves its meaning.
- All internal links use root-relative paths so they work consistently on GitHub Pages under the custom domain.
- Explicit image dimensions or stable containers limit layout shift.

## Verification

Automated checks will confirm:

- `/blog/` is an index rather than the full article.
- The list links to `/blog/why-robot-brains-will-live-in-the-cloud/`.
- The permanent article route contains the complete existing article structure and required assets.
- Mluvka is used for titles and interface text.
- Crimson Text is loaded from Google Fonts and used for article reading text.
- The homepage still links to `/blog/`.
- Referenced local images, stylesheets, and fonts exist.

Local serving checks will confirm that the homepage, blog index, article page, stylesheets, fonts, and article images all return successfully.
