# Suggested Commands

## Development Commands

### WebUI Development
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run preview      # Preview production build
```

### Code Quality
```bash
npm run lint         # ESLint check (max-warnings 0)
npm run lint:fix     # Auto-fix ESLint issues  
npm run format       # Prettier formatting
npm run typecheck    # TypeScript type checking
```

### Discord Bot Development
```bash
cd discord-bot
deno run --allow-net --allow-env --watch main.ts  # Development with watch
deno run --allow-net --allow-env main.ts          # Production run
```

### Data Management
```bash
npm run fetch-schedule    # Manual schedule data fetch
cd scripts
FORCE_UPDATE=true node fetch-schedule.js  # Force schedule update
```

### System Commands (Linux)
```bash
git status            # Git repository status
ls -la               # List files with details
find . -name "*.ts"  # Find TypeScript files
grep -r "pattern"    # Search for patterns
```

## Task Completion Checklist
After completing development tasks, run:
1. `npm run typecheck` - TypeScript validation
2. `npm run lint` - Code linting
3. `npm run format` - Code formatting
4. `npm run build` - Test production build

## Deployment
- WebUI: Automatic via GitHub Actions on push to main
- Discord Bot: Automatic via GitHub Actions when discord-bot/ files change
- Schedule Data: Automatic every 2 hours via GitHub Actions cron