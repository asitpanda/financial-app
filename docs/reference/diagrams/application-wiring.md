# Application Wiring

This diagram shows how a client component is wired through the frontend and backend layers to persistence. It describes implementation boundaries, not product requirements or visual design.

```mermaid
flowchart LR
    subgraph Client[React client]
        UI[Page or component]
        FORM[Form and Zod schema]
        HOOK[React Query hook]
        SERVICE[Feature service<br/>optional workflow]
        API[Feature API module]
        AXIOS[Axios client]
        CACHE[React Query cache]
        SELECTOR[Pure selector]
    end

    subgraph Server[NestJS server]
        CONTROLLER[Controller and DTO]
        GUARD[Auth guard]
        SERVER_SERVICE[Feature service]
        REPOSITORY[Stable repository]
        PORT[Datasource port]
        BINDING[Provider binding]
        PRISMA[Prisma adapter]
        MOCK[Mock adapter]
    end

    subgraph Storage[Persistence]
        DATABASE[(PostgreSQL)]
        FIXTURES[(Mock fixtures)]
    end

    UI --> FORM
    UI --> HOOK
    FORM --> HOOK
    HOOK --> SERVICE
    HOOK --> API
    SERVICE --> API
    API --> AXIOS
    AXIOS --> CONTROLLER
    CONTROLLER --> GUARD
    GUARD --> SERVER_SERVICE
    SERVER_SERVICE --> REPOSITORY
    REPOSITORY --> PORT
    PORT --> BINDING
    BINDING --> PRISMA
    BINDING --> MOCK
    PRISMA --> DATABASE
    MOCK --> FIXTURES

    DATABASE --> CONTROLLER
    FIXTURES --> CONTROLLER
    CONTROLLER --> API
    API --> CACHE
    CACHE --> SELECTOR
    SELECTOR --> UI
```

## Boundary rules

- Components do not call Axios or implement persistence workflows.
- Hooks own React Query state and cache invalidation.
- API modules own HTTP communication only.
- Server services do not know whether the adapter is Prisma or mock.
- Provider selection happens in module dependency injection.
- Stable repositories depend on datasource ports, not concrete adapters.
- Prisma is the persistence source of truth for database-backed modes.