# Deployment Guide for SkillSphere

This guide covers release management, Docker image build/push, and deployment strategies.

---

## Release Strategy

### Versioning Scheme
We use **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`
- `MAJOR`: Breaking changes (v2.0.0)
- `MINOR`: New features, backward compatible (v1.1.0)
- `PATCH`: Bug fixes (v1.0.1)

### Release Checklist

1. **Update version in `package.json` files:**
   ```bash
   # backend/package.json
   "version": "1.0.0"
   
   # frontend/package.json
   "version": "1.0.0"
   ```

2. **Create Git tag:**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0: Initial MVP"
   git push origin v1.0.0
   ```

3. **Run all tests:**
   ```bash
   cd backend && npm test
   cd ../frontend && npm run test:unit && npm run test:e2e:ci
   ```

4. **Build Docker images** (see section below)

5. **Deploy** (see section below)

---

## Docker Image Build & Push

### Prerequisites
- Docker CLI installed
- Docker Hub account (or other registry: ECR, GCR, etc.)
- Logged in: `docker login`

### Build Images Locally

```bash
# Backend
cd backend
docker build -t skillsphere-backend:1.0.0 -t skillsphere-backend:latest .

# Frontend
cd frontend
docker build -t skillsphere-frontend:1.0.0 -t skillsphere-frontend:latest .
```

### Tag for Registry

```bash
# Assuming Docker Hub user: yourname
docker tag skillsphere-backend:1.0.0 yourname/skillsphere-backend:1.0.0
docker tag skillsphere-backend:latest yourname/skillsphere-backend:latest

docker tag skillsphere-frontend:1.0.0 yourname/skillsphere-frontend:1.0.0
docker tag skillsphere-frontend:latest yourname/skillsphere-frontend:latest
```

### Push to Registry

```bash
docker push yourname/skillsphere-backend:1.0.0
docker push yourname/skillsphere-backend:latest

docker push yourname/skillsphere-frontend:1.0.0
docker push yourname/skillsphere-frontend:latest
```

### CI/CD: Automated Docker Builds
Add this to `.github/workflows/deploy.yml` to auto-build and push on tag:

```yaml
name: Build & Push Docker Images

on:
  push:
    tags:
      - 'v*'

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/skillsphere-backend:${{ github.ref_name }}
            ${{ secrets.DOCKER_USERNAME }}/skillsphere-backend:latest
      
      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: ./frontend
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/skillsphere-frontend:${{ github.ref_name }}
            ${{ secrets.DOCKER_USERNAME }}/skillsphere-frontend:latest
```

**GitHub Secrets to add:**
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub personal access token

---

## Deployment Options

### Option 1: Heroku (Recommended for MVP)

**Pros:** Simple, free tier, automatic CI/CD, no DevOps required  
**Cons:** Performance limitations, can't use Docker Compose directly

#### Setup

1. **Create Heroku apps:**
   ```bash
   heroku create skillsphere-backend
   heroku create skillsphere-frontend
   ```

2. **Add MongoDB (MongoDB Atlas):**
   - Create free cluster at https://cloud.mongodb.com/
   - Get connection string
   - Set env var:
     ```bash
     heroku config:set MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/SkillSphere --app skillsphere-backend
     ```

3. **Set environment variables:**
   ```bash
   heroku config:set JWT_SECRET=your_secret --app skillsphere-backend
   heroku config:set STRIPE_SECRET=sk_live_... --app skillsphere-backend
   # ... (set all required env vars)
   ```

4. **Deploy backend (via git):**
   ```bash
   cd backend
   git subtree push --prefix backend heroku main
   ```

5. **Deploy frontend:**
   ```bash
   cd frontend
   git subtree push --prefix frontend heroku main
   ```

**Auto-deploy on tag:**
Add Heroku GitHub integration in Heroku Dashboard → Deploy → GitHub Automatic Deploys.

---

### Option 2: Railway.app

**Pros:** Generous free tier, simple GitHub integration, built-in env management  
**Cons:** Smaller community than Heroku

#### Setup

1. Sign up at https://railway.app
2. Connect GitHub repo
3. Create services:
   - Backend (Node.js)
   - Frontend (Static/Node.js)
   - MongoDB (add from marketplace)
4. Set environment variables in Railway dashboard
5. Railway auto-deploys on push to main

**Deploy specific commits:** Use `railway up --name service-name` to manually deploy.

---

### Option 3: DigitalOcean App Platform

**Pros:** More control, competitive pricing, generous free tier  
**Cons:** Slightly more setup

#### Setup

1. Create DigitalOcean account
2. App Platform → Create App → Connect GitHub
3. Configure:
   - Backend: Auto-detect Node.js
   - Frontend: Auto-detect Node.js (or static)
   - Database: Add managed MongoDB (or use external MongoDB Atlas)
4. Set env vars in platform dashboard
5. Deploy

---

### Option 4: AWS ECS + Docker Compose (Advanced)

**Pros:** Highly scalable, pay-per-use, production-grade  
**Cons:** Complex setup, requires DevOps knowledge

#### Setup (High-level)

1. **Create AWS ECR repositories:**
   ```bash
   aws ecr create-repository --repository-name skillsphere-backend
   aws ecr create-repository --repository-name skillsphere-frontend
   ```

2. **Push images:**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/skillsphere-backend:1.0.0
   ```

3. **Create ECS cluster** and task definitions (use Docker Compose or AWS CloudFormation)

4. **Deploy services** (Fargate or EC2)

5. **Set up load balancer** (ALB) and auto-scaling

---

## Production Checklist

- [ ] All tests passing (unit, e2e)
- [ ] Environment validation enabled (`NODE_ENV=production`)
- [ ] Secrets stored securely (no hardcoding)
- [ ] Database backups configured
- [ ] HTTPS/SSL enabled
- [ ] Rate limiting active (helmet, express-rate-limit)
- [ ] Logging aggregated (CloudWatch, Sentry, etc.)
- [ ] Monitoring & alerts set up (uptime, error rate)
- [ ] Stripe webhook events forwarded from production
- [ ] DNS configured and CNAME records updated
- [ ] Backup & disaster recovery plan documented

---

## Monitoring & Logging

### Application Logging
- Backend logs via Morgan (dev or combined format)
- Frontend errors via Sentry or similar service
- Centralize with: ELK, CloudWatch, Datadog, or Papertrail

### Monitoring
- **Uptime:** Pingdom, UptimeRobot, or platform native
- **Errors:** Sentry, Rollbar, or native platform alerts
- **Performance:** New Relic, DataDog, or Grafana
- **Database:** MongoDB Atlas monitoring dashboard

### Alerting
Set up alerts for:
- Server down/high error rate
- High latency
- Database connection failures
- Stripe webhook failures

---

## Rollback Strategy

1. **Keep previous Docker images tagged** (e.g., `v1.0.0`, `v1.0.1`)
2. **Tag current version as `latest`** only when stable
3. **Rollback command:**
   ```bash
   # If using Docker Compose on server:
   docker-compose down
   docker pull yourname/skillsphere-backend:1.0.0
   docker pull yourname/skillsphere-frontend:1.0.0
   docker-compose up -d
   ```
4. **Platform-specific:** Heroku/Railway have one-click rollback in dashboard

---

## Post-Deployment

1. **Smoke tests:**
   - Navigate to homepage
   - Test login/register
   - Test payment flow (use Stripe test keys)
   - Test messaging

2. **Monitor logs** for errors in first hour

3. **Check metrics:** latency, error rate, user activity

4. **Communicate:** Notify team/users if applicable

---

## Troubleshooting Deployments

### Port already in use
Check for lingering containers: `docker ps -a`, then `docker rm <container-id>`

### Image pull errors
Ensure Docker registry credentials are correct and image is pushed: `docker push yourname/image:tag`

### Env vars not loading
Verify in deployment platform dashboard that all required vars are set. Check app logs for validation errors.

### Database connection timeout
- Verify `MONGO_URI` is accessible from deployment environment
- Check firewall/security group rules
- If using MongoDB Atlas, add deployment IP to whitelist

### Webhook failures
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Ensure endpoint URL is publicly accessible
- Check logs for signature verification errors

---

## References

- [Semantic Versioning](https://semver.org/)
- [Docker Push to Registry](https://docs.docker.com/engine/reference/commandline/push/)
- [Heroku Deployment](https://devcenter.heroku.com/articles/deploying-nodejs)
- [Railway Docs](https://docs.railway.app/)
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform/)
- [AWS ECS](https://docs.aws.amazon.com/AmazonECS/)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
