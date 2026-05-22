# DevPulse – Internal Tech Issue & Feature Tracker

A collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.

**Live URL:** https://assignment-2-nine-pearl.vercel.app

---

## 🚀 Features

- **User Authentication** – Secure registration and login with JWT tokens
- **Role-Based Access Control** – `contributor` and `maintainer` roles with different permissions
- **Issue Management** – Create, view, update, and delete bug reports and feature requests
- **Workflow Status Tracking** – Issues move through `open → in_progress → resolved`
- **Filtering & Sorting** – Filter issues by type or status; sort by newest or oldest
- **Internal Metrics** – Maintainer-only dashboard with system-wide statistics
- **Input Validation** – Strict validation on all endpoints with descriptive error messages

---

## 🛠️ Tech Stack

| Technology   | Usage                                  |
|--------------|----------------------------------------|
| Node.js      | LTS runtime (24.x)                     |
| TypeScript   | Strict typing throughout               |
| Express.js   | Modular router architecture            |
| PostgreSQL    | Relational database (NeonDB)           |
| Raw SQL      | Direct `pool.query()` calls, no ORM    |
| bcrypt       | Password hashing (salt rounds: 10)     |
| jsonwebtoken | JWT generation & verification          |

---

## ⚙️ Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/jmmohiuddin/NextLeavelA2.git
cd NextLeavelA2
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
PORT=3000
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d
BCRYPT_SALT_ROUNDS=10

# Option A: Individual DB fields
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=devpulse

# Option B: Connection string (takes priority)
# DATABASE_URL=postgresql://user:password@host:5432/devpulse
```

### 4. Set up the database

Run the SQL schema against your PostgreSQL instance:

```bash
psql -U postgres -d devpulse -f db/schema.sql
```

### 5. Run in development

```bash
npm run dev
```

### 6. Build for production

```bash
npm run build
npm start
```

---

## 🌐 API Endpoints

### Authentication

| Method | Endpoint           | Access | Description            |
|--------|--------------------|--------|------------------------|
| POST   | `/api/auth/signup` | Public | Register a new user    |
| POST   | `/api/auth/login`  | Public | Login and receive JWT  |

### Issues

| Method | Endpoint          | Access                        | Description                  |
|--------|-------------------|-------------------------------|------------------------------|
| POST   | `/api/issues`     | Authenticated                 | Create a new issue           |
| GET    | `/api/issues`     | Public                        | Get all issues (with filters)|
| GET    | `/api/issues/:id` | Public                        | Get a single issue           |
| PATCH  | `/api/issues/:id` | Maintainer / Issue Owner      | Update an issue              |
| DELETE | `/api/issues/:id` | Maintainer only               | Delete an issue              |

**Query Parameters for `GET /api/issues`:**

| Param    | Values                          | Default  |
|----------|---------------------------------|----------|
| `sort`   | `newest`, `oldest`              | `newest` |
| `type`   | `bug`, `feature_request`        | (none)   |
| `status` | `open`, `in_progress`, `resolved` | (none) |

### Metrics

| Method | Endpoint        | Access     | Description              |
|--------|-----------------|------------|--------------------------|
| GET    | `/api/metrics`  | Maintainer | System-wide statistics   |

---

## 🗄️ Database Schema

### `users` table

| Column       | Type      | Constraints                              |
|--------------|-----------|------------------------------------------|
| `id`         | SERIAL    | PRIMARY KEY                              |
| `name`       | TEXT      | NOT NULL                                 |
| `email`      | TEXT      | NOT NULL, UNIQUE                         |
| `password`   | TEXT      | NOT NULL (bcrypt hashed)                 |
| `role`       | TEXT      | NOT NULL, DEFAULT `contributor`, CHECK   |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW()                  |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW()                  |

### `issues` table

| Column        | Type         | Constraints                              |
|---------------|--------------|------------------------------------------|
| `id`          | SERIAL       | PRIMARY KEY                              |
| `title`       | VARCHAR(150) | NOT NULL                                 |
| `description` | TEXT         | NOT NULL (min 20 chars enforced in app)  |
| `type`        | TEXT         | NOT NULL, CHECK (`bug`, `feature_request`) |
| `status`      | TEXT         | NOT NULL, DEFAULT `open`, CHECK          |
| `reporter_id` | INTEGER      | NOT NULL (validated in app logic)        |
| `created_at`  | TIMESTAMP    | NOT NULL, DEFAULT NOW()                  |
| `updated_at`  | TIMESTAMP    | NOT NULL, DEFAULT NOW()                  |

---

## 👥 Roles & Permissions

| Action                         | Contributor | Maintainer |
|--------------------------------|:-----------:|:----------:|
| Register / Login               | ✅          | ✅         |
| Create issues                  | ✅          | ✅         |
| View all issues                | ✅          | ✅         |
| Update own open issues         | ✅          | ✅         |
| Update any issue               | ❌          | ✅         |
| Change issue status            | ❌          | ✅         |
| Delete any issue               | ❌          | ✅         |
| Access system metrics          | ❌          | ✅         |
