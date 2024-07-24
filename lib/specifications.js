const SwaggerParser = require('@apidevtools/swagger-parser');
const $RefParser = require('@apidevtools/json-schema-ref-parser');

// const logging = require('./logging');
const { getJsonPath } = require('./util');
const SchemaObject = require('./schema-object');

const explodeOpenApi = async (
  input,
  filename,
  includeUnreferencedSchemaObjects,
  delimiter = 'ç',
  requestContentType = null,
  responseContentType = null,
) => {
  // Save raw input
  const rawInput = JSON.parse(JSON.stringify(input));

  // Dereference the OpenAPI document
  const api = await SwaggerParser.dereference(input);

  // Trash any example objects as they are not required for this exercise
  getJsonPath('$..example', api)
    .filter((result) => result.parent.type)
    .forEach((result) => {
      delete result.parent.example; // eslint-disable-line no-param-reassign
    });

  const requestBodies = requestContentType
    ? getJsonPath(`paths.*.*.requestBody.content.['${requestContentType}'].schema`, api)
    : [];
  const responseBodies = responseContentType
    ? getJsonPath(`paths.*.*.responses.*.content.['${responseContentType}'].schema`, api)
    : [];
  const unreferencedSchemaObjects = [];

  if (requestContentType && requestBodies.length === 0) {
    throw new Error(`Could not match Content-Type ${requestContentType} in request bodies from ${filename}`);
  }

  if (responseContentType && responseBodies.length === 0) {
    throw new Error(`Could not match Content-Type ${responseContentType} in response bodies from ${filename}`);
  }

  if (includeUnreferencedSchemaObjects) {
    // Build a map of Reference Objects, keyed on the target object name
    // @ts-ignore
    const references = [...new Set(getJsonPath("$..['$ref']", rawInput)
      .map((reference) => reference.value))]
      .reduce((output, reference) => Object.assign(output, { [reference.split('/').pop()]: true }), {});

    // Loop over Schema Objects and find any that are unreferenced
    // @ts-ignore
    Object.entries(api.components.schemas)
      .forEach(([key, value]) => {
        if (!references[key]) {
          unreferencedSchemaObjects.push({ schemaObjectName: key, value });
        }
      });
  }

  const requests = requestBodies
    .map((schemaObject) => new SchemaObject(schemaObject, delimiter)
      .getProperties())
    .reduce((output, result) => output.concat(result), []);
  const responses = responseBodies
    .filter((result) => result.path[5].match(/^2[0-9]+$/))
    .map((schemaObject) => new SchemaObject(schemaObject, delimiter)
      .getProperties())
    .reduce((output, result) => output.concat(result), []);
  const unreferenced = unreferencedSchemaObjects
    .map((schemaObject) => new SchemaObject(schemaObject, delimiter)
      .getProperties())
    .reduce((output, result) => output.concat(result), []);

  // Return array of schema object definitions
  return []
    .concat(requests, responses, unreferenced);
};

const explodeJsonSchema = async (input, delimiter) => {
  const schema = await $RefParser.dereference(input);
  const allPaths = {
    path: Array.from(new Array(7), () => 'N/A'),
    value: schema,
  };

  return new SchemaObject(allPaths, delimiter)
    .getProperties();
};

module.exports = { explodeJsonSchema, explodeOpenApi };
