# Writing a blog post

1. Add a file here named `YYYY-MM-DD-short-name.md` (the short name becomes the address: `/post/short-name`).
2. Start it with this block, then write in plain Markdown:

```
---
title: Your headline (aim for 60 characters or fewer)
description: One or two sentences for Google and link previews (120 to 160 characters)
date: 2026-11-02
---
```

Optional lines in the block: `image: /assets/photos/your-photo.jpg`, `image_alt: what the photo shows`, `draft: true` (keeps it unpublished), `slug: custom-address`.

3. Use `##` for section headings (the headline is added automatically). Link to your own pages like `[acupuncture](/acupuncture)`.
4. Run `python3 _src/build.py`, then commit and push. The blog list, RSS feed (`/feed.xml`) and sitemap update themselves.

Please keep patient stories and health details out. Write about conditions and treatments in general terms.
