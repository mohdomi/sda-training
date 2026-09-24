# Day 15: DevOps & Environment Management

## 🎯 Learning Objectives

- Master DevOps concepts and environment management
- Implement multi-environment configurations (dev/staging/prod)
- Set up environment variables and secrets management
- Create infrastructure as code with configuration management
- Establish monitoring and logging systems

## 📚 Theory & Concepts

### DevOps Fundamentals
- **DevOps Culture**: Collaboration between development and operations
- **CI/CD Pipeline**: Continuous integration and deployment
- **Infrastructure as Code**: Managing infrastructure through code
- **Configuration Management**: Environment-specific configurations
- **Monitoring**: System health and performance tracking

### Environment Management
- **Development**: Local development environment
- **Staging**: Production-like testing environment
- **Production**: Live application environment
- **Secrets Management**: Secure handling of sensitive data
- **Configuration**: Environment-specific settings

### Best Practices
- **Version Control**: Infrastructure and configuration versioning
- **Automation**: Automated deployment and testing
- **Security**: Secure configuration and secrets management
- **Monitoring**: Proactive system monitoring
- **Documentation**: Comprehensive operational documentation

## 🛠️ Hands-on Tasks

### Task 1: Set Up Multi-Environment Configuration
Create comprehensive environment management system:

```javascript
// config/environments.js
const environments = {
  development: {
    name: 'development',
    port: process.env.PORT || 3000,
    database: {
      mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sda-training-dev',
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true
        }
      },
      postgresql: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'sda_training_dev',
        username: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password'
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        options: {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3
        }
      }
    },
    api: {
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
      timeout: 30000,
      retries: 3
    },
    security: {
      jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      bcryptRounds: 10
    },
    logging: {
      level: 'debug',
      format: 'combined',
      file: 'logs/dev.log'
    }
  },
  
  staging: {
    name: 'staging',
    port: process.env.PORT || 3000,
    database: {
      mongodb: {
        uri: process.env.MONGODB_URI,
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          ssl: true,
          sslValidate: true
        }
      },
      postgresql: {
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB,
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      redis: {
        url: process.env.REDIS_URL,
        options: {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          tls: {}
        }
      }
    },
    api: {
      baseUrl: process.env.API_BASE_URL,
      timeout: 30000,
      retries: 3
    },
    security: {
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
      bcryptRounds: 12
    },
    logging: {
      level: 'info',
      format: 'json',
      file: 'logs/staging.log'
    }
  },
  
  production: {
    name: 'production',
    port: process.env.PORT || 3000,
    database: {
      mongodb: {
        uri: process.env.MONGODB_URI,
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          ssl: true,
          sslValidate: true,
          authSource: 'admin'
        }
      },
      postgresql: {
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB,
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        ssl: {
          require: true,
          rejectUnauthorized: true
        },
        pool: {
          min: 2,
          max: 10,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200
        }
      },
      redis: {
        url: process.env.REDIS_URL,
        options: {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          tls: {},
          lazyConnect: true
        }
      }
    },
    api: {
      baseUrl: process.env.API_BASE_URL,
      timeout: 30000,
      retries: 3
    },
    security: {
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
      bcryptRounds: 12
    },
    logging: {
      level: 'warn',
      format: 'json',
      file: 'logs/production.log'
    }
  }
};

const getEnvironment = () => {
  const env = process.env.NODE_ENV || 'development';
  return environments[env] || environments.development;
};

module.exports = {
  getEnvironment,
  environments
};
```

### Task 2: Implement Secrets Management
Create secure secrets management system:

```javascript
// config/secrets.js
const crypto = require('crypto');

class SecretsManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateKey();
    this.algorithm = 'aes-256-gcm';
  }

  generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
    cipher.setAAD(Buffer.from('sda-training', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
    decipher.setAAD(Buffer.from('sda-training', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  validateSecrets() {
    const requiredSecrets = [
      'JWT_SECRET',
      'MONGODB_URI',
      'POSTGRES_PASSWORD',
      'REDIS_URL'
    ];

    const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);
    
    if (missingSecrets.length > 0) {
      throw new Error(`Missing required secrets: ${missingSecrets.join(', ')}`);
    }

    return true;
  }

  getSecret(name, defaultValue = null) {
    const value = process.env[name];
    if (!value && !defaultValue) {
      throw new Error(`Secret ${name} is required but not found`);
    }
    return value || defaultValue;
  }
}

module.exports = new SecretsManager();
```

### Task 3: Create Infrastructure as Code
Implement infrastructure configuration:

```yaml
# infrastructure/docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - MONGODB_URI=${MONGODB_URI}
      - POSTGRES_URL=${POSTGRES_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongodb
      - postgresql
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  mongodb:
    image: mongo:5.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USERNAME}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    restart: unless-stopped

  postgresql:
    image: postgres:13
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgresql_data:/var/lib/postgresql/data
      - ./scripts/postgres-init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    restart: unless-stopped

  redis:
    image: redis:6.0-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongodb_data:
  postgresql_data:
  redis_data:
```

### Task 4: Implement Monitoring and Logging
Create comprehensive monitoring system:

```javascript
// monitoring/health-check.js
const healthCheck = {
  async checkDatabase() {
    try {
      const mongoose = require('mongoose');
      const connection = mongoose.connection;
      
      return {
        status: connection.readyState === 1 ? 'healthy' : 'unhealthy',
        message: connection.readyState === 1 ? 'Connected' : 'Disconnected',
        details: {
          host: connection.host,
          port: connection.port,
          name: connection.name,
          readyState: connection.readyState
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: { error: error.stack }
      };
    }
  },

  async checkRedis() {
    try {
      const redis = require('redis');
      const client = redis.createClient(process.env.REDIS_URL);
      
      await client.ping();
      await client.quit();
      
      return {
        status: 'healthy',
        message: 'Connected',
        details: { url: process.env.REDIS_URL }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: { error: error.stack }
      };
    }
  },

  async checkPostgreSQL() {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.POSTGRES_URL
      });
      
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      await pool.end();
      
      return {
        status: 'healthy',
        message: 'Connected',
        details: { url: process.env.POSTGRES_URL }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: { error: error.stack }
      };
    }
  },

  async getSystemInfo() {
    const os = require('os');
    const process = require('process');
    
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: {
        loadavg: os.loadavg(),
        cpus: os.cpus().length
      },
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version
    };
  },

  async performHealthCheck() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkPostgreSQL(),
      this.getSystemInfo()
    ]);

    const results = {
      database: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'unhealthy', message: checks[0].reason.message },
      redis: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'unhealthy', message: checks[1].reason.message },
      postgresql: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'unhealthy', message: checks[2].reason.message },
      system: checks[3].status === 'fulfilled' ? checks[3].value : { status: 'unhealthy', message: checks[3].reason.message }
    };

    const overallStatus = Object.values(results).every(check => check.status === 'healthy') ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }
};

module.exports = healthCheck;
```

### Task 5: Create Environment Documentation
Build comprehensive environment documentation:

```markdown
# Environment Management Guide

## Environment Overview

### Development Environment
- **Purpose**: Local development and testing
- **Database**: Local MongoDB, PostgreSQL, Redis
- **Security**: Relaxed security for development
- **Logging**: Debug level logging
- **Port**: 3000

### Staging Environment
- **Purpose**: Production-like testing environment
- **Database**: Cloud databases with SSL
- **Security**: Production-like security
- **Logging**: Info level logging
- **Port**: 3000

### Production Environment
- **Purpose**: Live application environment
- **Database**: High-availability cloud databases
- **Security**: Maximum security configuration
- **Logging**: Warning level logging
- **Port**: 3000

## Environment Variables

### Required Variables
- `NODE_ENV`: Environment name (development/staging/production)
- `PORT`: Application port
- `MONGODB_URI`: MongoDB connection string
- `POSTGRES_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing secret

### Optional Variables
- `API_BASE_URL`: API base URL
- `JWT_EXPIRES_IN`: JWT expiration time
- `BCRYPT_ROUNDS`: Bcrypt salt rounds
- `LOG_LEVEL`: Logging level

## Security Considerations

### Secrets Management
- Use environment variables for secrets
- Never commit secrets to version control
- Use encryption for sensitive data
- Rotate secrets regularly

### Database Security
- Use SSL connections in staging/production
- Implement connection pooling
- Use strong passwords
- Enable authentication

### Network Security
- Use HTTPS in production
- Implement CORS properly
- Use rate limiting
- Monitor for suspicious activity
```

## 📝 Documentation Tasks

### Create DevOps Guide
Create `week3/day15/docs/devops-guide.md`:

```markdown
# DevOps Guide

## Environment Management
- **Multi-Environment**: Development, staging, production
- **Configuration**: Environment-specific settings
- **Secrets**: Secure secrets management
- **Infrastructure**: Infrastructure as code
- **Monitoring**: System health and performance

## Best Practices
- **Version Control**: Infrastructure and configuration versioning
- **Automation**: Automated deployment and testing
- **Security**: Secure configuration and secrets management
- **Monitoring**: Proactive system monitoring
- **Documentation**: Comprehensive operational documentation
```

## 🧪 Testing & Validation

### Environment Testing
- [x] All environments work correctly
- [x] Secrets are properly managed
- [x] Configuration is environment-specific
- [x] Monitoring works correctly
- [x] Health checks work

### Security Testing
- [x] Secrets are not exposed
- [x] Database connections are secure
- [x] Environment isolation works
- [x] Access controls work
- [x] Audit logging works

## 📊 Success Criteria

By the end of Day 15, you should have:

✅ **DevOps Mastery**: Environment management and configuration  
✅ **Secrets Management**: Secure handling of sensitive data  
✅ **Infrastructure as Code**: Configuration management  
✅ **Monitoring**: System health and performance tracking  
✅ **Documentation**: Comprehensive operational documentation  

## 🔄 Next Steps

1. **Commit your work**: `git add . && git commit -m "Complete Day 15: DevOps & Environment Management"`
2. **Create PR**: Submit pull request for code review
3. **Prepare for Day 16**: Review Docker and containerization concepts
4. **Update progress**: Document your learning in the daily summary

## 📚 Additional Resources

- [DevOps Best Practices](https://aws.amazon.com/devops/what-is-devops/)
- [Environment Management](https://12factor.net/config)
- [Secrets Management](https://www.vaultproject.io/)
- [Infrastructure as Code](https://www.terraform.io/)

---

**Ready for Day 16? Check out [Day 16: Docker & Compose](../day16/README.md)!** 🚀
