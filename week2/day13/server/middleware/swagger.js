const swaggerUi = require('swagger-ui-express');
const specs = require('../../docs/openapi');

const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    urls: [
      {
        url: '/api/v1/docs/swagger.json',
        name: 'SDA Training API v1'
      }
    ]
  }
};

const setupSwagger = (app) => {
  app.get('/api/v1/docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

  app.get('/api/v1/docs', (req, res) => {
    res.redirect('/api/v1/docs/');
  });
};

module.exports = { setupSwagger };
