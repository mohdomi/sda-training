// docs/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SDA Training API',
      version: '1.0.0',
      description: 'Advanced backend API for SDA training program',
      contact: {
        name: 'API Support',
        email: 'support@sda-training.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.sda-training.com/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'User full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'moderator'],
              description: 'User role'
            },
            isActive: {
              type: 'boolean',
              description: 'User account status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp'
            }
          }
        },
        Product: {
          type: 'object',
          required: ['name', 'description', 'price', 'category'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Product unique identifier'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Product name'
            },
            description: {
              type: 'string',
              minLength: 10,
              maxLength: 500,
              description: 'Product description'
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Product price'
            },
            category: {
              type: 'string',
              description: 'Product category'
            },
            stock: {
              type: 'integer',
              minimum: 0,
              description: 'Product stock quantity'
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              description: 'Product image URL'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Product tags'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error message'
                },
                code: {
                  type: 'string',
                  description: 'Error code'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object'
                  },
                  description: 'Error details'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      },
      {
        apiKey: []
      }
    ]
  },
  apis: ['./routes/**/*.js', './models/**/*.js']
};

const specs = swaggerJSDoc(options);

module.exports = { specs, swaggerUi };