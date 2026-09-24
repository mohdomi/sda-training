const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SDA Training API',
      version: '1.0.0',
      description: 'Advanced backend API for SDA training program',
      contact: {
        name: 'API Support',
        email: 'support@sda-training.com',
        url: 'https://sda-training.com/support'
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
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication'
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
              description: 'User unique identifier',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'User full name',
              example: 'John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'moderator'],
              description: 'User role',
              example: 'user'
            },
            isActive: {
              type: 'boolean',
              description: 'User account status',
              example: true
            },
            avatar: {
              type: 'string',
              format: 'uri',
              description: 'User avatar URL',
              example: 'https://example.com/avatar.jpg'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
              example: '2024-01-01T00:00:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
              example: '2024-01-01T00:00:00Z'
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
              description: 'Product unique identifier',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Product name',
              example: 'Wireless Headphones'
            },
            description: {
              type: 'string',
              minLength: 10,
              maxLength: 500,
              description: 'Product description',
              example: 'High-quality wireless headphones with noise cancellation'
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Product price',
              example: 199.99
            },
            category: {
              type: 'string',
              description: 'Product category',
              example: 'Electronics'
            },
            stock: {
              type: 'integer',
              minimum: 0,
              description: 'Product stock quantity',
              example: 50
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              description: 'Product image URL',
              example: 'https://example.com/product.jpg'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Product tags',
              example: ['wireless', 'headphones', 'audio']
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Product creation timestamp',
              example: '2024-01-01T00:00:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Product last update timestamp',
              example: '2024-01-01T00:00:00Z'
            }
          }
        },
        Order: {
          type: 'object',
          required: ['items', 'shippingAddress'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Order unique identifier',
              example: '507f1f77bcf86cd799439011'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User who placed the order',
              example: '507f1f77bcf86cd799439011'
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: {
                    type: 'string',
                    format: 'uuid',
                    description: 'Product ID',
                    example: '507f1f77bcf86cd799439011'
                  },
                  quantity: {
                    type: 'integer',
                    minimum: 1,
                    description: 'Product quantity',
                    example: 2
                  },
                  price: {
                    type: 'number',
                    minimum: 0,
                    description: 'Product price at time of order',
                    example: 199.99
                  }
                }
              },
              description: 'Order items'
            },
            total: {
              type: 'number',
              minimum: 0,
              description: 'Order total amount',
              example: 399.98
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
              description: 'Order status',
              example: 'pending'
            },
            shippingAddress: {
              type: 'object',
              properties: {
                street: {
                  type: 'string',
                  description: 'Street address',
                  example: '123 Main St'
                },
                city: {
                  type: 'string',
                  description: 'City',
                  example: 'New York'
                },
                state: {
                  type: 'string',
                  description: 'State',
                  example: 'NY'
                },
                zipCode: {
                  type: 'string',
                  description: 'ZIP code',
                  example: '10001'
                },
                country: {
                  type: 'string',
                  description: 'Country',
                  example: 'USA'
                }
              },
              description: 'Shipping address'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Order creation timestamp',
              example: '2024-01-01T00:00:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Order last update timestamp',
              example: '2024-01-01T00:00:00Z'
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
                  description: 'Error message',
                  example: 'Validation failed'
                },
                code: {
                  type: 'string',
                  description: 'Error code',
                  example: 'VALIDATION_ERROR'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                        description: 'Field name',
                        example: 'email'
                      },
                      message: {
                        type: 'string',
                        description: 'Field error message',
                        example: 'Invalid email format'
                      }
                    }
                  },
                  description: 'Error details'
                }
              }
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              description: 'Current page number',
              example: 1
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: 'Items per page',
              example: 10
            },
            total: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of items',
              example: 100
            },
            pages: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of pages',
              example: 10
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/**/*.js', './models/**/*.js']
};

const specs = swaggerJSDoc(options);

module.exports = specs;
