# Code Style and Conventions

## TypeScript/JavaScript Style
- **ESLint Configuration**: Uses @eslint/js with TypeScript support
- **Prettier Formatting**: 
  - Single quotes preferred
  - Semicolons required
  - 80 character line width
  - 2-space indentation (no tabs)
  - ES5 trailing commas
- **Unused Variables**: Error level, use `_` prefix for ignored args
- **TypeScript**: `any` type generates warnings, prefer-const enforced

## File Organization
- React components in `src/components/`
- Custom hooks in `src/hooks/`
- Utilities in `src/utils/`
- Type definitions in `src/types/`
- Discord bot code isolated in `discord-bot/`
- Configuration data in `data/` as text files

## Naming Conventions  
- **Files**: kebab-case for components, camelCase for utilities
- **Components**: PascalCase 
- **Hooks**: camelCase starting with `use`
- **Constants**: UPPER_SNAKE_CASE
- **Functions**: camelCase

## Import/Export Style
- Named exports preferred over default exports
- External dependencies imported first
- Relative imports after external
- Type imports use `import type` when possible

## Comments and Documentation
- TSDoc comments for public APIs
- Inline comments for complex logic
- No unnecessary comments for self-explanatory code

## React Patterns
- Functional components with hooks
- Custom hooks for state management logic
- Props destructuring in function parameters
- React.StrictMode enabled in development

## Deno/Discord Bot Conventions
- Import maps in deno.json
- Permissions explicitly listed in CLI commands
- Environment variable validation at startup
- Async/await preferred over Promise chains