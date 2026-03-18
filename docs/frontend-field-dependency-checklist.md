# Frontend Field Dependency Checklist

This document outlines the JSON fields the frontend relies on. The backend **must guarantee** these fields are present and correctly formatted to ensure the frontend renders without errors.

## `GET /api/home`

- `data.site.name` (String)
- `data.site.subtitle` (String)
- `data.site.announcement_html` (String, optional)
- `data.stats.today_posts_display` (String/Number)
- `data.stats.yesterday_posts_display` (String/Number)
- `data.stats.total_threads_display` (String/Number)
- `data.stats.online_users_display` (String/Number)
- `data.boards` (Array)
  - `id` (String/Number)
  - `name` (String)
  - `slug` (String)
  - `description` (String)
  - `thread_count_display` (String/Number)
  - `post_count_display` (String/Number)
  - `latest_thread` (Object, optional/nullable)
    - `id` (String/Number)
    - `title` (String)
    - `published_at` (ISO 8601 Date String)

## `GET /api/boards/:slug`

- `data.board.name` (String)
- `data.board.slug` (String)
- `data.board.description` (String)
- `data.pagination.page` (Number)
- `data.pagination.totalPages` (Number)
- `data.pinned_threads` (Array, optional)
  - `id` (String/Number)
  - `title` (String)
  - `reply_count` (Number)
  - `view_count_display` (String/Number)
  - `last_replied_at` (ISO 8601 Date String)
  - `author.display_name` (String)
  - `author.user_group_name` (String)
- `data.threads` (Array)
  - `id` (String/Number)
  - `title` (String)
  - `reply_count` (Number)
  - `view_count_display` (String/Number)
  - `published_at` (ISO 8601 Date String)
  - `last_replied_at` (ISO 8601 Date String)
  - `author.display_name` (String)

## `GET /api/threads/:id`

- `data.board.name` (String)
- `data.board.slug` (String)
- `data.thread.id` (String/Number)
- `data.thread.title` (String)
- `data.thread.published_at` (ISO 8601 Date String)
- `data.thread.content_html` (String, safe HTML)
- `data.thread.author_snapshot` (Object, see Author Snapshot below)

## `GET /api/threads/:id/posts`

- `data.pagination.page` (Number)
- `data.pagination.totalPages` (Number)
- `data.posts` (Array)
  - `id` (String/Number)
  - `floor_number` (Number)
  - `published_at` (ISO 8601 Date String)
  - `content_html` (String, safe HTML)
  - `author_snapshot` (Object, see Author Snapshot below)

## Author Snapshot Object

Applies to `data.thread.author_snapshot` and `data.posts[].author_snapshot`.

- `display_name` (String)
- `avatar_url` (String, valid URL or relative path)
- `user_group_name` (String)
- `user_title` (String)
- `board_title` (String)
- `points_display` (String/Number)
- `post_count_display` (String/Number)
- `essence_count_display` (String/Number)
- `registered_at_display` (String, e.g., "2004-07-18")
- `location_display` (String)
- `signature_text` (String, optional)
- `badges` (Array, optional)
  - `name` (String)
  - `icon_url` (String)
