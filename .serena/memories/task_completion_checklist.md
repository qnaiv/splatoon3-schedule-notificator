# Task Completion Checklist

## Mandatory Steps After Code Changes

### 1. Type Checking (Required)
```bash
npm run typecheck
```
- Validates TypeScript compilation
- Must pass without errors before committing

### 2. Code Linting (Required) 
```bash
npm run lint
```
- ESLint with max-warnings 0 policy
- Must fix all warnings and errors

### 3. Code Formatting (Required)
```bash  
npm run format
```
- Prettier formatting for consistent style
- Automatically formats `src/**/*.{ts,tsx,js,jsx}`

### 4. Build Verification (Required)
```bash
npm run build
```
- Tests production build process
- Ensures no build-time errors

## Additional Checks for Specific Changes

### Discord Bot Changes
```bash
cd discord-bot
deno run --allow-net --allow-env main.ts
```
- Test Discord bot functionality locally
- Verify environment variables are accessible

### Schedule Data Changes  
```bash
npm run fetch-schedule
```
- Test schedule fetching script
- Verify API integration works

## Pre-Commit Automation
- **Husky**: Pre-commit hooks configured
- **lint-staged**: Runs ESLint + Prettier on staged files automatically
- Manual verification still recommended for complex changes

## Deployment Considerations
- WebUI: Automatically deploys on push to main via GitHub Actions
- Discord Bot: Automatically deploys when discord-bot/ files change
- No manual deployment needed for most cases

## Common Issues to Check
- No unused imports or variables
- Environment variables properly handled
- API endpoints correctly configured for production
- No hardcoded development URLs
- TypeScript strict mode compliance