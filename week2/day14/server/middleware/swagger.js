const swaggerUi = require('swagger-ui-express');
// docs/openapi.js lives outside the Docker build context (day14/docs), so it
// may be absent inside the image — degrade to an empty spec, never crash boot.
let specs = { openapi: '3.0.0', info: { title: 'SDA Training API', version: '1.0.0' }, paths: {} };
try {
  specs = require('../../docs/openapi');
} catch {
  console.warn('OpenAPI spec not found (docs/openapi.js) — serving empty spec');
}

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
