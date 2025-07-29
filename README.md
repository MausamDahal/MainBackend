## 🧾 NestCRM – Main Backend (Tenant Provisioning & Auth API)

This repository contains the **backend API** for the public-facing NestCRM application.  
It powers:

- Signup and tenant provisioning
- Login and secure session cookies
- Subscription creation via Stripe
- AWS provisioning (EC2, Load Balancer, Route 53)
- API for token validation and subscription status check

This backend is **shared by all tenants** and hosted at:  
`https://mausamcrm.site/api/*`

---

## Key Features

- Multi-tenant provisioning (dynamic subdomain generation)
- Secure JWT-based login with `.mausamcrm.site` cookie support
- Stripe integration (trial setup, plan selection, metadata storage)
- AWS EC2 + Route53 automation (via SDK)
- Token validation + logout + subscription sync API
- Subscription check for CloudFront via Lambda@Edge (optional)

---

## Tech Stack

- Node.js (TypeScript)
- Bun (preferred runtime)
- Express.js
- AWS SDK (EC2, Route53, S3)
- Stripe SDK
- JWT + bcrypt
- DynamoDB (NestCRM-Tenant & NestCRM-Subscription)
- CloudFront (for tenant-level access control)

---

## Project Structure

```bash
src/
├── cli/                   # AWS provisioning scripts (EC2, Route53, etc.)
├── application/           # Use cases for tenant logic
├── infrastructure/        # Database + external API logic
├── interfaces/            # Express routes + controllers
├── utils/                 # Helper methods (crypto, validation)
└── server.ts              # Main entrypoint
```

## Install Bun MacOS
```bash
curl -fsSL https://bun.sh/install | bash
```
## Windows (WSL Recommended)
```bash
curl -fsSL https://bun.sh/install | bash
```

# repository
cd NestCRM-Main-Backend

# Install dependencies
bun install

# Run dev server
bun run dev