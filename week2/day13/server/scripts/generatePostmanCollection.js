const fs = require('fs');
const path = require('path');

const generatePostmanCollection = (specs) => {
  const collection = {
    info: {
      name: 'SDA Training API',
      description: 'API collection for SDA Training program',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{jwt_token}}',
          type: 'string'
        }
      ]
    },
    variable: [
      {
        key: 'base_url',
        value: 'http://localhost:3000/api/v1',
        type: 'string'
      },
      {
        key: 'jwt_token',
        value: '',
        type: 'string'
      }
    ],
    item: []
  };

  if (specs.paths) {
    Object.keys(specs.paths).forEach(path => {
      Object.keys(specs.paths[path]).forEach(method => {
        const operation = specs.paths[path][method];

        const item = {
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: [],
            url: {
              raw: '{{base_url}}' + path,
              host: ['{{base_url}}'],
              path: path.split('/').filter(p => p)
            }
          },
          response: []
        };

        if (operation.security) {
          item.request.header.push({
            key: 'Authorization',
            value: 'Bearer {{jwt_token}}',
            type: 'text'
          });
        }

        if (operation.parameters) {
          operation.parameters.forEach(param => {
            if (param.in === 'query') {
              if (!item.request.url.query) {
                item.request.url.query = [];
              }
              item.request.url.query.push({
                key: param.name,
                value: param.schema?.default || '',
                description: param.description
              });
            }
          });
        }

        if (operation.requestBody) {
          const content = operation.requestBody.content;
          if (content['application/json']) {
            item.request.body = {
              mode: 'raw',
              raw: JSON.stringify({}, null, 2),
              options: {
                raw: {
                  language: 'json'
                }
              }
            };
          }
        }

        collection.item.push(item);
      });
    });
  }

  return collection;
};

const specs = require('../../docs/openapi');
const collection = generatePostmanCollection(specs);

const outputPath = path.join(__dirname, '../../docs/postman-collection.json');
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

console.log('Postman collection generated successfully!');
console.log(`Output: ${outputPath}`);

module.exports = { generatePostmanCollection };
