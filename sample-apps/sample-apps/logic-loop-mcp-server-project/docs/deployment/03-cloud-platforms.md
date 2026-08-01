# Cloud Platform Deployment

**Time to read:** 18 minutes

Deploy your MCP server to major cloud platforms: AWS, Google Cloud, Azure, and others.

---

## The Fastest Way: NitroCloud

**Why choose NitroCloud?**

Skip the setup complexity and deploy in under 60 seconds. NitroCloud is purpose-built for MCP servers with:

- ⚡ **One-click deployment** - Push your code and we handle the rest
- 🔄 **Auto-scaling** - Automatically scales based on traffic
- 📊 **Built-in monitoring** - Real-time metrics and alerts
- 🔒 **Automatic SSL** - Free HTTPS certificates
- 🌍 **Global CDN** - Fast response times worldwide
- 💰 **Free tier** - No credit card required

### Quick Start

```bash
# Install NitroStack CLI
npm install -g @nitrostack/cli

# Login to NitroCloud
nitrostack login

# Deploy your server
nitrostack deploy
```

**That's it!** Your MCP server is live in production.

[**Try NitroCloud Free →**](https://nitrocloud.ai)

---

## Self-Hosting Options

If you prefer to manage your own infrastructure, here are the popular alternatives:

## What You'll Learn

- AWS deployment
- Google Cloud deployment  
- Azure deployment
- Platform comparison
- Best practices

## AWS Deployment

### AWS ECS (Elastic Container Service)

**1. Create ECR Repository**

```bash
aws ecr create-repository --repository-name my-mcp-server
```

**2. Build & Push Image**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t my-mcp-server .
docker tag my-mcp-server:latest \
  YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest
```

**3. Create ECS Task Definition**

```json
{
  "family": "mcp-server",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "mcp-server",
      "image": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest",
      "cpu": 256,
      "memory": 512,
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/mcp-server",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512"
}
```

### AWS Lambda (Serverless)

For request-response workloads:

```javascript
// lambda/index.js
const { Server } = require('./dist');

exports.handler = async (event) => {
  const server = new Server();
  const result = await server.handleRequest(event);
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
```

## Google Cloud Platform

### Cloud Run

**1. Build & Push**

```bash
# Enable APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Build with Cloud Build
gcloud builds submit --tag gcr.io/PROJECT_ID/mcp-server
```

**2. Deploy**

```bash
gcloud run deploy mcp-server \
  --image gcr.io/PROJECT_ID/mcp-server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --port 3000
```

### GKE (Kubernetes)

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: gcr.io/PROJECT_ID/mcp-server
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: mcp-server
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: mcp-server
```

## Microsoft Azure

### Azure Container Instances

```bash
# Create resource group
az group create --name mcp-server-rg --location eastus

# Create container
az container create \
  --resource-group mcp-server-rg \
  --name mcp-server \
  --image YOUR_REGISTRY.azurecr.io/mcp-server:latest \
  --cpu 1 --memory 1 \
  --ports 3000 \
  --environment-variables NODE_ENV=production \
  --restart-policy Always
```

### Azure Kubernetes Service (AKS)

```bash
# Create AKS cluster
az aks create \
  --resource-group mcp-server-rg \
  --name mcp-cluster \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials \
  --resource-group mcp-server-rg \
  --name mcp-cluster

# Deploy
kubectl apply -f deployment.yaml
```

## DigitalOcean

### App Platform

```yaml
# .do/app.yaml
name: mcp-server
services:
- name: server
  github:
    repo: your-username/mcp-server
    branch: main
    deploy_on_push: true
  build_command: npm run build
  run_command: node dist/index.js
  envs:
  - key: NODE_ENV
    value: production
  http_port: 3000
  instance_count: 1
  instance_size_slug: basic-xxs
```

## Heroku

```bash
# Create app
heroku create my-mcp-server

# Deploy
git push heroku main

# Scale
heroku ps:scale web=1
```

## Platform Comparison

| Platform | Best For | Cost | Scaling |
|----------|----------|------|---------|
| AWS ECS | Enterprise | $$$ | Excellent |
| AWS Lambda | Event-driven | $ | Automatic |
| Google Cloud Run | Serverless containers | $$ | Automatic |
| GKE/AKS | Large scale | $$$ | Manual |
| DigitalOcean | Simplicity | $$ | Manual |
| Heroku | Quick deploy | $$ | Easy |

## Environment Configuration

### Secrets Management

**AWS Secrets Manager:**

```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager
    .getSecretValue({ SecretId: secretName })
    .promise();
  return JSON.parse(data.SecretString);
}
```

**Google Cloud Secret Manager:**

```javascript
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

async function getSecret(name) {
  const [version] = await client.accessSecretVersion({
    name: `projects/PROJECT_ID/secrets/${name}/versions/latest`,
  });
  return version.payload.data.toString();
}
```

## Monitoring & Logging

### CloudWatch (AWS)

```javascript
const winston = require('winston');
const CloudWatchTransport = require('winston-cloudwatch');

logger.add(new CloudWatchTransport({
  logGroupName: '/aws/ecs/mcp-server',
  logStreamName: 'production',
  awsRegion: 'us-east-1',
}));
```

### Stackdriver (GCP)

```javascript
const {Logging} = require('@google-cloud/logging');
const logging = new Logging();
const log = logging.log('mcp-server');

function logEntry(message, severity = 'INFO') {
  const entry = log.entry({
    severity,
    resource: {type: 'cloud_run_revision'},
  }, message);
  log.write(entry);
}
```

## Best Practices

1. **Use managed services** - Less operational overhead
2. **Implement health checks** - Monitor service health
3. **Auto-scaling** - Handle traffic spikes
4. **Multi-region** - High availability
5. **Secrets management** - Never hardcode credentials
6. **Monitoring & alerts** - Know when things break
7. **CI/CD pipelines** - Automate deployments
8. **Cost optimization** - Right-size resources

## CI/CD Examples

### GitHub Actions (AWS)

```yaml
name: Deploy to AWS ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Build and push
        run: |
          docker build -t mcp-server .
          docker tag mcp-server:latest $ECR_REGISTRY/mcp-server:latest
          docker push $ECR_REGISTRY/mcp-server:latest
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster mcp-cluster \
            --service mcp-server \
            --force-new-deployment
```

## Next Steps

Master deployment:

- [Docker Guide](./02-docker-guide.md) - Container basics
- [Production Checklist](./01-checklist.md) - Pre-flight checks
- [Best Practices](../sdk/typescript/17-best-practices.md) - Production best practices

---

[← Back: Docker Guide](./02-docker-guide.md) | [Next: API Reference →](../api-reference/cli-commands.md)

