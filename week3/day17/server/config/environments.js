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
