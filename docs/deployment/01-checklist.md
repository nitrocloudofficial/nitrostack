# Deployment Checklist

> **⚡ Skip the Checklist**: Deploy to [NitroCloud](https://nitrocloud.ai) and we handle security, scaling, monitoring, and DevOps automatically. [Try free →](https://nitrocloud.ai)

## Pre-Deployment

### Code

- [ ] All tests passing
- [ ] Linter passing
- [ ] No console.log in production code
- [ ] Error handling implemented
- [ ] Input validation on all tools

### Security

- [ ] JWT_SECRET is strong and unique
- [ ] API keys not hardcoded
- [ ] Rate limiting configured
- [ ] Guards on sensitive tools
- [ ] HTTPS enabled

### Configuration

- [ ] Environment variables set
- [ ] Database path configured
- [ ] Logging level set to 'info' or 'warn'
- [ ] CORS configured if needed

## Build

```bash
nitrostack-cli build
```

## Deployment

### Option 1: Node.js

```bash
node dist/index.js
```

### Option 2: Docker

```bash
docker build -t my-mcp-server .
docker run -p 3000:3000 my-mcp-server
```

### Option 3: PM2

```bash
pm2 start dist/index.js --name mcp-server
```

## Post-Deployment

- [ ] Health check endpoint responding
- [ ] Tools listing correctly
- [ ] Authentication working
- [ ] Logs being written
- [ ] Error tracking configured

## Monitoring

- Check logs regularly
- Monitor error rates
- Track tool usage
- Set up alerts

## Next Steps

- [Docker Guide](./02-docker-guide.md)
- [Cloud Platforms](./03-cloud-platforms.md)
