## UI component best practices

- **Single Responsibility**: Each component should have one clear purpose and do it well
- **Reusability**: Design components to be reused across different contexts with configurable props
- **Composability**: Build complex UIs by combining smaller, simpler components rather than monolithic structures
- **shadcn/ui Base**: Leverage shadcn/ui (New York style) components as foundation; customize via CSS variables, not component overrides
- **Clear Interface**: Define explicit, well-documented TypeScript props with sensible defaults; use type inference where possible
- **Encapsulation**: Keep internal implementation details private and expose only necessary APIs
- **Consistent Naming**: Use PascalCase for components, camelCase for props; be descriptive (e.g., `UserProfileCard`, `isLoading`)
- **State Management**: Keep state as local as possible; use React Context for theme/auth, Zustand for complex global state, TanStack Query for server state
- **Minimal Props**: Keep the number of props manageable; if a component needs many props, consider composition or splitting it
- **Theme Support**: Ensure components support light, dark, and "code" themes via CSS variables (--background, --foreground, etc.)
- **Vibe Coding Principles**: Balance emotional design (animations, glass effects, smooth transitions) with robust technical implementation (TypeScript types, error boundaries, loading states)
- **Accessibility**: Use semantic HTML, ARIA labels, keyboard navigation; shadcn/ui components are accessible by default
- **File Structure**: Organize as `components/ui/` (shadcn/ui), `components/` (custom shared), `app/[route]/_components/` (route-specific)
- **Documentation**: Add JSDoc comments for complex components; TypeScript types serve as inline documentation
