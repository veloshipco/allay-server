# Allay Server

NestJS backend API server for the Allay multi-tenant Slack integration platform.

## Overview

This server provides a RESTful API for managing multi-tenant Slack integrations with the following key features:

- **Multi-tenant Architecture** - Complete data isolation per tenant
- **Authentication & Authorization** - JWT-based sessions with role-based access control
- **Slack Integration** - OAuth flow, event handling, and API interactions
- **Real-time Features** - Server-Sent Events for live updates
- **Type-safe Database** - TypeORM with PostgreSQL and comprehensive entity relationships

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database and Slack credentials

# Build the application
npm run build
```

### Database Setup

```bash
# Initialize database schema (development mode)
npm run db:init

# For production, use migrations
npm run db:migrate
```

### Development

```bash
# Start development server with hot reload
npm run start:dev

# Run linting
npm run lint

# Run tests
npm test
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm run start:prod
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user-tenants` - Get user's tenants

### Tenant Management

- `POST /api/tenants/create` - Create new tenant
- `GET /api/tenants/:tenantId/info` - Get tenant information

### Slack Integration

- `GET /api/:tenantId/slack/status` - Check Slack connection status
- `GET /api/:tenantId/slack/install` - Initiate Slack OAuth
- `POST /api/:tenantId/slack/events` - Handle Slack webhooks

### Conversations

- `GET /api/:tenantId/conversations` - Get conversation history
- `GET /api/:tenantId/conversations/stream` - Real-time updates (SSE)
- `POST /api/:tenantId/conversations/thread-reply` - Create thread replies

## Architecture

### Module Structure

```
src/
├── auth/                    # Authentication module
│   ├── auth.controller.ts  # Auth endpoints
│   ├── auth.service.ts     # Business logic
│   ├── jwt.strategy.ts     # JWT validation
│   └── dto/               # Request/response DTOs
├── tenants/                # Tenant management
├── slack/                  # Slack integration
├── conversations/          # Message handling
├── database/               # Database layer
│   ├── entities/         # TypeORM entities
│   └── types/            # Shared types and enums
├── common/                # Shared utilities
│   ├── guards/           # Security guards
│   ├── decorators/       # Custom decorators
│   └── utils/            # Helper functions
└── config/                # Configuration
```

### Key Features

#### Multi-Tenant Design

- Every database operation is tenant-scoped using `tenantId`
- Complete data isolation between tenants
- Role-based access control per tenant

#### Security

- JWT authentication with HTTP-only cookies
- Permission-based authorization
- Input validation with DTOs
- SQL injection prevention via TypeORM

#### Entity Relationships

- **Users ↔ Tenants**: Many-to-many via OrganizationMember
- **Tenants ↔ Conversations**: One-to-many with cascade delete
- **Tenants ↔ SlackUsers**: One-to-many with cascade delete
- **Tenants ↔ OrganizationInvitations**: One-to-many with cascade delete
- **Users ↔ Sessions**: One-to-many with cascade delete
- **Users ↔ OrganizationMembers**: One-to-many with cascade delete
- **SlackUsers ↔ Conversations**: One-to-many (optional relationship)
- All relationships use proper TypeORM decorators with type safety

## Environment Variables

### Required Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=
DATABASE_NAME=postgres
DATABASE_SSL=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# Slack Configuration
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret
```

## Database Schema

### Core Entities

- **User**: User accounts and profiles
- **Tenant**: Multi-tenant configurations
- **Conversation**: Slack messages and threads
- **SlackUser**: Slack user profiles and tokens
- **OrganizationMember**: Role-based memberships
- **OrganizationInvitation**: Invitation system
- **Session**: User session tracking

### Entity Relationships

The entity structure uses proper TypeORM relationships with circular dependency resolution:

1. **Shared Types**: All enums and interfaces are in `src/database/types/`
2. **Type-Safe Relationships**: All relationships use proper TypeORM decorators with `() => EntityClass` syntax
3. **Bidirectional Relations**: OneToMany/ManyToOne relationships are properly defined on both sides
4. **JoinColumn Decorators**: Explicit foreign key column mapping for clarity
5. **Cascade Operations**: Proper cascade delete behavior for data integrity

#### Relationship Examples

```typescript
// Tenant -> Conversations (OneToMany)
@OneToMany(() => Conversation, (conversation) => conversation.tenant)
conversations: Conversation[];

// Conversation -> Tenant (ManyToOne)
@ManyToOne(() => Tenant, (tenant) => tenant.conversations, { onDelete: "CASCADE" })
@JoinColumn({ name: "tenant_id" })
tenant: Tenant;
```

#### Benefits of Type-Safe Relationships

- **Type Safety**: No more `any` types - full TypeScript intellisense and compile-time checking
- **Better IDE Support**: Auto-completion and refactoring support for relationship properties
- **Runtime Safety**: TypeORM validates relationship integrity at runtime
- **Maintainability**: Clear relationship definitions make the codebase easier to understand
- **Query Optimization**: TypeORM can optimize queries based on relationship metadata

## Development Guidelines

### Adding New Features

1. **Create Module**: Follow NestJS module pattern
2. **Add DTOs**: Use class-validator for input validation
3. **Implement Guards**: Apply authentication and authorization
4. **Tenant Isolation**: Always include `tenantId` in database queries
5. **Error Handling**: Use NestJS built-in exception filters

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Enforced code quality
- **Prettier**: Consistent formatting
- **Testing**: Unit tests with Jest

### Working with Entity Relationships

When working with the new type-safe relationships:

```typescript
// Loading relationships
const tenant = await this.tenantRepository.findOne({
  where: { id: tenantId },
  relations: ["conversations", "slackUsers", "invitations"],
});

// Accessing related data
const conversations = tenant.conversations; // Type: Conversation[]
const slackUsers = tenant.slackUsers; // Type: SlackUser[]

// Creating with relationships
const conversation = this.conversationRepository.create({
  content: "Hello",
  tenantId: tenant.id,
  tenant: tenant, // Type-safe relationship
});
```

### Database Operations

```typescript
// Always use tenant-scoped queries
const results = await this.repository.find({
  where: { tenantId },
  order: { createdAt: "DESC" },
});
```

### API Patterns

```typescript
// Standard controller pattern
@Post()
@Permissions(OrganizationPermission.MANAGE_MEMBERS)
async create(@Body() dto: CreateDto) {
  return this.service.create(dto);
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE\_\* environment variables
   - Ensure PostgreSQL is running
   - Verify SSL settings

2. **Migration Errors**
   - Run `npm run build` before migration commands
   - Check `data-source.js` configuration

3. **Compilation Errors**
   - Ensure all entity relationships use proper `() => EntityClass` syntax
   - Check that all relationship imports are correct
   - Verify JoinColumn decorators match database column names

4. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check cookie configuration
   - Ensure CORS is properly configured

### Debugging

```bash
# Check database status
npm run db:status

# Run with debug logging
NODE_ENV=development npm run start:dev

# View database queries
# Set logging: true in database configuration
```

## Production Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Use environment variables for all configuration
3. Enable database SSL connections
4. Use secure JWT secrets
5. Set up proper CORS origins

### Database

- Use migrations instead of synchronization
- Enable connection pooling
- Set up backups and monitoring
- Consider read replicas for scaling

### Security

- Use HTTPS in production
- Set secure cookie flags
- Implement rate limiting
- Add request logging
- Set up monitoring and alerting

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Ensure linting passes
5. Submit pull request

## License

MIT License - see LICENSE file for details.
