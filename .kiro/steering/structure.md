# Project Structure & Architecture

## Directory Organization

### Core Application Structure
```
├── pages/                    # Next.js pages (file-based routing)
├── modules/                  # Feature-based modules
├── shared/                   # Reusable components, hooks, and utilities
├── generated/                # Auto-generated protobuf types (DO NOT EDIT)
├── styles/                   # Global styles and design system
├── themes/                   # Theme configurations
├── types/                    # Global TypeScript type definitions
├── utils/                    # General utility functions
└── public/                   # Static assets
```

## Module Architecture

Each module follows a consistent structure:
```
modules/[feature]/
├── components/               # Feature-specific React components
├── hooks/                    # Custom hooks for business logic
├── store/                    # Recoil atoms and selectors
├── types/                    # TypeScript type definitions
├── utils/                    # Feature-specific utilities
├── constants/                # Feature constants and configurations
└── index.ts                  # Public API exports
```

### Key Modules
- **auth** - Authentication, authorization, and user management
- **admin** - Administrative dashboard and controls
- **billing** - Stripe integration and subscription management
- **node** - Web3 node management and monitoring
- **host** - Infrastructure host management
- **organization** - Multi-tenant organization features
- **settings** - User and system settings
- **grpc** - gRPC client configurations and utilities

## Shared Resources

### Components (`shared/components/`)
- **App** - Application-level components
- **Buttons** - Button variants and controls
- **Forms** - Form inputs and validation components
- **General** - Generic UI components
- **Tables** - Data table components with sorting/filtering
- **Labels** - Text and label components

### Hooks (`shared/hooks/`)
- Reusable custom hooks for common functionality
- UI interaction hooks (modals, dropdowns, tables)
- Utility hooks (debounce, viewport, navigation)

### Constants (`shared/constants/`)
- Application-wide constants and configurations
- Route definitions, lookup tables, validation rules

## Import Path Conventions

Use TypeScript path mapping for clean imports:
```typescript
import { Component } from '@modules/auth';
import { Button } from '@shared/components';
import { useDebounce } from '@shared/hooks';
```

## File Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Hooks**: camelCase with "use" prefix (e.g., `useUserData.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Types**: PascalCase with `.d.ts` extension (e.g., `User.d.ts`)
- **Constants**: camelCase (e.g., `apiEndpoints.ts`)

## State Management Patterns

### Recoil Structure
- **Atoms**: Store primitive state values
- **Selectors**: Derive computed state and handle async operations
- **Naming**: Use descriptive names with module prefixes (e.g., `authUserAtom`, `nodeListSelector`)

### Data Fetching with SWR
- Use SWR for server state management
- Implement custom hooks that wrap SWR calls
- Handle loading, error, and success states consistently

## Component Architecture

### Component Organization
- Keep components focused and single-responsibility
- Use composition over inheritance
- Implement proper TypeScript interfaces for props
- Follow the container/presentational component pattern where appropriate

### Styling Approach
- Use Emotion for component styling
- Leverage CSS custom properties for theming
- Follow the established design system patterns
- Maintain responsive design principles

## Generated Code

### Protobuf Integration
- **generated/** directory contains auto-generated TypeScript types
- **DO NOT EDIT** generated files manually
- Use generated types for type-safe gRPC communication
- gRPC clients are configured in `modules/grpc/clients/`

## Best Practices

1. **Module Boundaries**: Keep modules loosely coupled with clear interfaces
2. **Type Safety**: Leverage TypeScript strictly, avoid `any` types
3. **Error Handling**: Implement consistent error handling patterns
4. **Performance**: Use React.memo, useMemo, and useCallback appropriately
5. **Accessibility**: Follow WCAG guidelines for UI components
6. **Testing**: Write tests for critical business logic and components