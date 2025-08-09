# Splatoon3 Schedule Notificator - Project Overview

## Purpose
Discord notification system for Splatoon 3 schedule tracking. Provides web UI for setting notification preferences and Discord bot for automated notifications when specific match conditions are met.

## Architecture
- **Web UI (React + TypeScript + Vite)**: Frontend for notification settings and Discord integration setup
- **Discord Bot (Deno + TypeScript)**: Backend bot for handling Discord commands and sending notifications  
- **Data Pipeline**: GitHub Actions automatically fetches schedule data every 2 hours from Spla3 API
- **Hosting**: GitHub Pages (WebUI), Deno Deploy (Discord Bot), GitHub Actions (automation)

## Key Features
- Custom notification conditions (stage, rule, match type combinations)
- Slack command interface (/watch, /status, /stop, /test, /check)
- Text file management for event/stage data (external maintenance)
- Session-based caching for performance optimization
- Completely free infrastructure (serverless, static hosting)

## Tech Stack
### Frontend
- React 18 + TypeScript
- Vite build tool
- Tailwind CSS
- IndexedDB for local storage

### Backend  
- Deno + TypeScript
- Discord Webhook API
- Deno Deploy serverless

### Infrastructure
- GitHub Pages (WebUI hosting)
- Vercel (preview environment)
- GitHub Actions (CI/CD, data fetching)
- Spla3 API (data source)

## Project Structure
```
├── src/                    # React WebUI
├── discord-bot/           # Deno Discord bot
├── scripts/               # Data fetching scripts  
├── data/                  # Text file configuration
├── .github/workflows/     # CI/CD automation
└── public/api/            # Generated API data
```