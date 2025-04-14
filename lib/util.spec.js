const { expect } = require('chai');

const { getRequestBodyContentTypes, getResponseContentTypes } = require('./util');

const testOpenApiObject = {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '0.0.1',
  },
  paths: {
    '/test-one': {
      get: {
        summary: 'Test',
        responses: {
          200: {
            description: 'Test',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                },
              },
              'application/jwt': {
                schema: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
    },
    '/test-two': {
      post: {
        summary: 'Test',
        requestBody: {
          description: 'Test',
          content: {
            'application/json': {
              schema: {
                type: 'object',
              },
            },
            'application/jwt': {
              schema: {
                type: 'object',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Test',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                },
              },
              'application/jwt': {
                schema: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
    },
    '/test-three': {
      post: {
        summary: 'Test',
        requestBody: {
          description: 'Test',
          content: {
            'application/jwt': {
              schema: {
                type: 'object',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Test',
            content: {
              'application/jwt': {
                schema: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
    },
    '/test-four': {
      post: {
        summary: 'Test',
        requestBody: {
          description: 'Test',
          content: {
            'application/jwt': {
              schema: {
                type: 'object',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Test',
            content: {
              'application/jwt': {
                schema: {
                  type: 'object',
                },
              },
              'application/json': {
                schema: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
    },
  },
};

describe(__filename, () => {
  describe('getRequestBodyContentTypes function', () => {
    it('Test request body content types', () => {
      const [resultOne, resultTwo, resultThree] = getRequestBodyContentTypes(
        testOpenApiObject,
        'application/json',
      );

      expect(resultOne.contentType).to.equal('application/json');
      expect(resultTwo.contentType).to.equal('application/jwt');
      expect(resultThree.contentType).to.equal('application/jwt');
    });
  });
  describe('getResponseContentTypes function', () => {
    it('Test response content types', () => {
      const [resultOne, resultTwo, resultThree, resultFour] = getResponseContentTypes(
        testOpenApiObject,
        'application/json',
      );

      expect(resultOne.contentType).to.equal('application/json');
      expect(resultTwo.contentType).to.equal('application/json');
      expect(resultThree.contentType).to.equal('application/jwt');
      expect(resultFour.contentType).to.equal('application/json');
    });
  });
});
