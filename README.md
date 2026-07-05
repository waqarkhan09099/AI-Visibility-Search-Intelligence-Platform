# AI Visibility Intelligence Platform

Production-ready full-stack platform for AI search visibility analysis with real LLM integration.

## Features

- **AI Pipeline Workflow**: Generate queries → Score opportunities → Generate recommendations
- **Model Selection**: Choose OpenAI models (GPT-4o, GPT-4o Mini, etc.) per profile
- **Mock Fallback**: Works locally without API key (mock provider)
- **Real-time Polling**: Pipeline progress with stage tracking and token usage
- **Dashboard**: Stats, charts, profile management
- **Production**: Docker, Gunicorn, structured logging

## Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Flask, SQLAlchemy, Marshmallow, OpenAI SDK, Gunicorn |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, TanStack Query, Recharts |
| AI | OpenAI (gpt-4o-mini default), mock fallback |

## Quick Start (Development)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env        # Add OPENAI_API_KEY for real AI
python seed.py               # Demo data (instant)
python seed.py --use-ai      # Real AI pipeline (requires OPENAI_API_KEY)
python run.py               # http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

## AI Configuration

Add to `backend/.env`:

```env
OPENAI_API_KEY=sk-your-key-here
DEFAULT_AI_MODEL=gpt-4o-mini
DEFAULT_AI_PROVIDER=openai
```

Without an API key, the platform uses the **mock provider** (deterministic simulation) so development and demos still work.

## AI Pipeline Stages

1. **generating_queries** — LLM generates industry-specific AI search queries
2. **scoring_queries** — Each query scored for volume, difficulty, opportunity (0–100)
3. **generating_recommendations** — LLM produces prioritized content recommendations
4. **completed** — Results available in Queries, Recommendations, and Charts tabs

## Free Demo Deployment (no custom domain)

Host the app for free with public URLs like `your-app.vercel.app` and `your-api.onrender.com`.

| Part | Platform | Free URL |
|------|----------|----------|
| **Frontend** | [Vercel](https://vercel.com) | `https://your-project.vercel.app` |
| **Backend** | [Render](https://render.com) | `https://your-api.onrender.com` |

### 1. Deploy backend (Render)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect the repo — Render reads `render.yaml` automatically
4. Deploy and copy your API URL, e.g. `https://ai-visibility-api.onrender.com`
5. Test: `https://YOUR-API.onrender.com/api/health`

> **Note:** Free Render services sleep after ~15 min idle. First request may take ~50s to wake up. Demo data auto-seeds on first deploy.

### 2. Deploy frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the same GitHub repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   ```
   VITE_API_BASE_URL=https://YOUR-API.onrender.com/api
   ```
4. Deploy — you get `https://your-project.vercel.app`

### 3. Connect them

- Open your Vercel URL in the browser
- Add AI API keys in **Settings → AI Configuration** (stored encrypted on the backend)
- Share the Vercel link for demos — no custom domain needed

## Production Deployment (Docker)

```bash
# Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with production SECRET_KEY and OPENAI_API_KEY

docker compose up --build -d
```

- Frontend: http://localhost
- API: http://localhost:5000/api/health

### Production Checklist

- [ ] Set `SECRET_KEY` to a strong random value
- [ ] Set `OPENAI_API_KEY`
- [ ] Use PostgreSQL: `DATABASE_URL=postgresql://...`
- [ ] Configure `CORS_ORIGINS` for your domain
- [ ] Run behind HTTPS reverse proxy

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health + AI status |
| GET | `/api/models` | Available AI models |
| GET | `/api/dashboard` | Dashboard stats |
| POST | `/api/profiles` | Create profile (AI-generated seed queries) |
| PATCH | `/api/profiles/:id` | Update preferred model |
| POST | `/api/profiles/:id/pipeline/run` | Run AI pipeline `{ model_id? }` |
| GET | `/api/profiles/:id/pipeline/status` | Poll pipeline status |
| GET | `/api/profiles/:id/charts/scatter` | Volume vs difficulty |
| GET | `/api/profiles/:id/charts/pipeline-trend` | Token usage trend |

## Project Structure

```
backend/app/
  services/llm/          # OpenAI + mock providers
  services/ai_pipeline_service.py  # Real AI workflow
frontend/src/
  features/              # Feature-first modules
  services/              # API layer
  components/charts/     # Recharts visualizations
```
# AI-Visibility-Search-Intelligence-Platform
