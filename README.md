# Taita Blog API

Multi-tenant blog engine API with LLM-ready external endpoints.

## Stack

- **Runtime**: Node.js 20 + Express 5
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Auth**: JWT (CMS) + API Keys (external agents)
- **Storage**: Cloudinary
- **Deploy**: PM2 + Caddy on DigitalOcean, CI/CD via GitHub Actions

## Quick Start

```bash
git clone https://github.com/carlosvidal/taita-api.git
cd taita-api
npm install
cp .env.example .env  # Edit with your credentials
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

## Environment Variables

See `.env.example` for all available variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT token signing |
| `PORT` | Server port (default: 3001) |
| `CORS_ORIGIN` | Allowed origins for CORS |
| `CLOUDINARY_*` | Cloudinary credentials for image uploads |
| `MAIN_DOMAIN` | Main domain (e.g. `taita.blog`) |

## Architecture

Multi-tenant blog platform where each blog gets a subdomain (`demo.taita.blog`). Tenant detection happens via `X-Taita-Subdomain` header or subdomain extraction.

```
taita.blog          -> CMS (Netlify)
backend.taita.blog  -> This API (Express)
*.taita.blog        -> Frontend (Nuxt SSR)
```

---

## External API v1 (LLM-Ready)

Designed for AI agents, automation tools, and third-party integrations.

### Authentication

All v1 endpoints require an API key in the `X-API-Key` header:

```bash
curl https://backend.taita.blog/api/v1/posts \
  -H "X-API-Key: tb_live_your_key_here"
```

API keys are scoped to a specific blog and support granular permissions (`posts:read`, `posts:write`).

### Endpoints

#### Create Post

```http
POST /api/v1/posts
```

```json
{
  "title": "My Post Title",
  "content": "<p>HTML content of the post</p>",
  "excerpt": "Optional short summary",
  "slug": "custom-slug",
  "category": "tecnologia",
  "tags": ["ai", "automation"],
  "status": "published",
  "image": "https://example.com/image.jpg"
}
```

**Required fields**: `title`, `content`

**Optional fields**: `excerpt`, `slug` (auto-generated from title), `category` (resolved by name or slug), `tags` (created automatically if new), `status` (`published` or `draft`, default: `draft`), `image`

**Response** (201):

```json
{
  "id": "uuid",
  "title": "My Post Title",
  "slug": "my-post-title",
  "status": "published",
  "published_at": "2026-03-29T17:07:04.432Z",
  "url": "https://demo.taita.blog/blog/my-post-title",
  "category": { "name": "Tecnologia", "slug": "tecnologia" },
  "tags": [{ "name": "ai", "slug": "ai" }],
  "created_at": "2026-03-29T17:07:04.435Z"
}
```

#### List Posts

```http
GET /api/v1/posts?status=published&page=1&limit=20
```

Returns paginated list with `data` array and `pagination` object.

#### Get Post

```http
GET /api/v1/posts/:slug
```

Returns full post including `content`.

#### Update Post

```http
PATCH /api/v1/posts/:slug
```

```json
{
  "title": "Updated Title",
  "status": "published",
  "tags": ["new-tag"]
}
```

Only include fields you want to update.

#### Delete Post

```http
DELETE /api/v1/posts/:slug
```

#### List Categories

```http
GET /api/v1/categories
```

#### List Tags

```http
GET /api/v1/tags
```

### Error Responses

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Human-readable description"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation failed (missing required fields) |
| 401 | Missing or invalid API key |
| 403 | API key disabled, expired, or insufficient permissions |
| 404 | Resource not found |
| 409 | Slug conflict (post with that slug already exists) |
| 500 | Internal server error |

### API Key Management

API keys are managed from the CMS (requires JWT auth):

```http
POST   /api/api-keys          # Create key (full key shown only once)
GET    /api/api-keys           # List keys (masked)
PATCH  /api/api-keys/:uuid     # Enable/disable key
DELETE /api/api-keys/:uuid     # Revoke key
```

---

## Internal API (CMS)

Used by the CMS frontend. Authenticated via JWT Bearer token.

### Auth
- `POST /api/auth/login` - Login, returns JWT
- `POST /api/auth/register` - Register new admin

### Content Management (JWT required)
- `GET/POST/PATCH/DELETE /api/posts` - Posts CRUD
- `GET/POST/PATCH/DELETE /api/categories` - Categories
- `GET/POST/PATCH/DELETE /api/tags` - Tags
- `GET/POST/PATCH/DELETE /api/pages` - Static pages
- `GET/POST/PATCH/DELETE /api/series` - Post series
- `GET/POST/PATCH/DELETE /api/menu` - Navigation menu
- `GET/POST/DELETE /api/media` - File uploads
- `GET/POST/DELETE /api/comments` - Comment moderation
- `GET/PATCH /api/settings` - Blog settings
- `GET /api/stats` - Blog statistics

### Public Endpoints (no auth)
- `GET /api/posts/public` - Published posts
- `GET /api/categories/public` - Categories
- `GET /api/tags/public` - Tags
- `GET /api/menu/public` - Navigation
- `GET /api/settings/public` - Public blog settings
- `GET /api/pages/public` - Published pages
- `GET /api/search/public` - Search
- `GET /health` - Health check

## Database

PostgreSQL with Prisma ORM. Key models:

- **Admin** - Users (SUPER_ADMIN, ADMIN, AUTHOR)
- **Blog** - Multi-tenant blogs with subdomain/custom domain
- **Post** - Blog posts with categories, tags, series
- **Category/Tag** - Taxonomy (unique per blog)
- **ApiKey** - External API authentication (scoped per blog)
- **Comment** - Comments with moderation
- **Media** - File uploads with Cloudinary
- **Page** - Static pages
- **Series** - Post collections

## License

MIT
