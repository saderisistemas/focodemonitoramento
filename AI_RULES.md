# AI Development Rules

This document outlines the rules and conventions for the AI assistant working on this project. Following these guidelines ensures consistency, maintainability, and adherence to the project's architectural decisions.

## Tech Stack

This project is built with a modern, type-safe, and efficient technology stack:

-   **Framework**: React (using Vite for a fast development experience).
-   **Language**: TypeScript for static typing and improved code quality.
-   **UI Components**: shadcn/ui, providing a set of beautifully designed, accessible, and customizable components.
-   **Styling**: Tailwind CSS for a utility-first styling approach.
-   **Routing**: React Router (`react-router-dom`) for client-side navigation.
-   **Data Fetching & Caching**: TanStack Query for managing server state.
-   **Backend & Database**: Supabase for database, authentication, and other backend services.
-   **Forms**: React Hook Form for performant form handling, paired with Zod for schema validation.
-   **Icons**: Lucide React for a comprehensive and consistent set of icons.

## Library Usage and Conventions

### 1. UI and Styling

-   **Component Library**: **Exclusively** use components from `shadcn/ui` located in `@/components/ui`. Do not introduce other libraries like Material UI, Ant Design, or Chakra UI.
-   **Custom Components**: If a required component is not available in `shadcn/ui`, create a new reusable component in the `src/components` directory. Style it with Tailwind CSS to match the project's aesthetic.
-   **Styling**: All styling **must** be done using Tailwind CSS utility classes. Avoid writing custom CSS in `.css` files, except for global base styles defined in `src/index.css`.
-   **Icons**: Only use icons from the `lucide-react` package.

### 2. State Management

-   **Server State**: For all data fetching, caching, and mutations (e.g., interacting with the Supabase API), **always** use TanStack Query (`useQuery`, `useMutation`).
-   **Client State**: For simple, local component state, use React's built-in hooks (`useState`, `useReducer`). For state that needs to be shared across components, prefer `useContext` for simplicity. Do not add complex state management libraries like Redux or Zustand.

### 3. Forms

-   **Form Logic**: All forms must be built using `react-hook-form`.
-   **Validation**: Use `zod` to define validation schemas and integrate it with `react-hook-form` via `@hookform/resolvers`.

### 4. Routing

-   **Library**: Use `react-router-dom` for all routing.
-   **Configuration**: Keep all route definitions centralized in `src/App.tsx`.

### 5. Backend Integration

-   **Supabase Client**: All interactions with the Supabase backend (database queries, auth, etc.) must use the pre-configured client instance exported from `@/integrations/supabase/client.ts`. Do not create new Supabase clients.

### 6. Notifications

-   **Toasts**: Use the `sonner` library for displaying toast notifications, which is set up as `<Sonner />` in `App.tsx`.

### 7. Code Structure

-   **Pages**: Place top-level page components in `src/pages`.
-   **Reusable Components**: Place shared, reusable components in `src/components`.
-   **Hooks**: Custom hooks should be placed in `src/hooks`.
-   **Utilities**: General utility functions should be placed in `src/lib`.
-   **Types**: For Supabase-generated types, rely on `src/integrations/supabase/types.ts`. Define custom component-specific types within the component file itself.