# Contributing to SkillSphere

Thank you for your interest in contributing! This guide will help you get started.

---

## Code of Conduct

Be respectful, inclusive, and professional. Harassment, discrimination, and hate speech are not tolerated.

---

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/yourusername/SkillSphere.git
cd SkillSphere
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch naming:**
- `feature/user-auth-improvements`
- `fix/payment-webhook-bug`
- `docs/update-readme`
- `chore/update-dependencies`

### 3. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install --legacy-peer-deps
```

### 4. Set Up Environment

Create `.env` in `backend/`:
```env
MONGO_URI=mongodb://localhost:27017/SkillSphere
JWT_SECRET=dev_secret_key_min_32_chars
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
NODE_ENV=development
```

### 5. Start Development Servers

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

---

## Development Workflow

### Writing Code

- Follow the existing code style (2-space indentation, const/let, arrow functions)
- Use meaningful variable and function names
- Add JSDoc comments for functions
- Keep components small and focused

### Example (React Component)

```jsx
import React from 'react';

/**
 * Button component for user actions
 * @param {string} label - Button label text
 * @param {function} onClick - Click handler
 * @param {string} variant - 'primary' or 'secondary' (default: 'primary')
 */
export function Button({ label, onClick, variant = 'primary' }) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
```

### Example (Express Controller)

```javascript
/**
 * Get user profile
 * Protected route: requires JWT
 */
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
```

---

## Testing

### Running Tests

```bash
# Backend tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm run test:unit

# Frontend E2E tests
cd frontend && npm run test:e2e
```

### Writing Tests

**Backend (Jest + Supertest):**

```javascript
// tests/auth.test.js
const request = require('supertest');
const createApp = require('../app');

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
```

**Frontend (Vitest + Testing Library):**

```jsx
// src/components/__tests__/Button.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('should render and handle clicks', async () => {
    const handleClick = vi.fn();
    render(<Button label="Click me" onClick={handleClick} />);

    const button = screen.getByText('Click me');
    await userEvent.click(button);

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Test Requirements

- All new features must include tests
- All bug fixes should include a test that reproduces the issue
- Tests must pass before PR is merged (CI requirement)

---

## Commit Guidelines

Use clear, descriptive commit messages:

```
feat(auth): add email verification on registration

- Send verification link to registered email
- Add verify endpoint to confirm email
- Store verificationToken in User model
- Add 24h expiry to verification tokens

Fixes #123
```

**Commit prefixes:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring (no behavior change)
- `test:` Adding/updating tests
- `chore:` Dependencies, configs, build
- `perf:` Performance improvement

---

## Pull Request Process

### 1. Before Submitting

- [ ] Tests pass locally (`npm test`)
- [ ] Linter passes (ESLint / Prettier)
- [ ] Code follows style guidelines
- [ ] Commit messages are clear
- [ ] Branch is up-to-date with `main`

### 2. Create PR

**Title format:**
```
[Type] Brief description

Example: [Feature] Add two-factor authentication support
```

**Description template:**

```markdown
## Description
Brief summary of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## How to Test
Steps to verify the changes:
1. Navigate to...
2. Click...
3. Verify...

## Screenshots (if UI change)
[If applicable]

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Tested locally
```

### 3. CI Checks

GitHub Actions will run:
- Backend tests (Jest)
- Frontend unit tests (Vitest)
- Frontend build
- Frontend E2E tests (Playwright)

All must pass before merge.

### 4. Review & Merge

- Maintainers will review within 48 hours
- Address review comments
- Squash and merge to `main`

---

## Project Structure

```
backend/
├── config/          # Configuration (DB, OAuth, env validation)
├── controllers/     # Route handlers
├── middleware/      # Custom middleware
├── models/          # MongoDB schemas
├── routes/          # API endpoints
├── utils/           # Utilities (email, token generation)
├── tests/           # Unit & integration tests
└── server.js        # Entry point

frontend/
├── src/
│   ├── components/  # React components
│   │   └── __tests__/  # Unit tests
│   ├── pages/       # Page components
│   ├── services/    # API clients
│   ├── hooks/       # Custom hooks
│   ├── context/     # Context providers
│   └── utils/       # Utilities
├── tests/
│   └── e2e/         # Playwright E2E tests
└── vite.config.js
```

---

## Common Issues & Solutions

### Port already in use
```bash
# Kill process on port 5000
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### MongoDB connection failed
```bash
# Ensure MongoDB is running
mongod
# or start Docker container
docker run -d -p 27017:27017 mongo
```

### npm peer dependency conflicts
```bash
npm install --legacy-peer-deps
```

### Playwright browser not installed
```bash
npx playwright install --with-deps
```

---

## Coding Standards

### JavaScript/Node.js
- Use ES6+ (arrow functions, destructuring, const/let)
- Async/await preferred over callbacks
- Error handling required (try/catch or .catch())
- No console.log in production code (use logger)

### React
- Functional components with hooks (no class components)
- Prop validation (JSDoc or PropTypes)
- One component per file
- File names match component names (PascalCase)

### CSS/Styling
- Use TailwindCSS classes (prefer utility-first)
- No inline styles
- Mobile-first responsive design
- Consistent spacing (use Tailwind scale)

### API Design
- RESTful endpoints
- Consistent response format: `{ success: boolean, data?: any, message?: string }`
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Server Error
- Validation on all inputs

---

## Reporting Issues

### Security Issues
**Do not open a public issue.** Email security concerns to [security email if available] or mention privately in discussions.

### Bug Reports
Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- OS, Node version, browser
- Screenshots if applicable

### Feature Requests
Describe:
- Use case / problem it solves
- Proposed solution
- Alternatives considered
- Affected users

---

## Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## Questions?

- Open a discussion in GitHub Discussions
- Join our community chat (if applicable)
- Email maintainers

---

Thank you for contributing to SkillSphere! 🚀
