const { JSONPath } = require('jsonpath-plus');

const logging = require('./logging');

const getJsonPathAsArray = (path) => path.replace(/'/g, '')
  .split(/(?:\]\[)|\[|\]/g)
  .filter((fragment) => fragment && fragment.trim() !== '');

const getContentTypes = (objects, targetContentType, payload) => Object
  .values(objects
    .reduce((output, schema) => {
      const { key, contentType } = schema;

      if (output[key]) {
        const { data, contentTypes } = output[key];

        return Object.assign(
          output,
          {
            [key]: {
              data: data.concat(schema),
              contentTypes: contentTypes.concat(contentType),
            },
          },
        );
      }

      return Object.assign(
        output,
        { [key]: { data: [schema], contentTypes: [contentType] } },
      );
    }, {}))
  .map(({ data, contentTypes }) => {
    const index = contentTypes.indexOf(targetContentType);

    if (index !== -1) {
      return data[index];
    }
    const { path } = data[0];

    logging.warn(`Defaulting to ${payload} content type ${contentTypes[0]} for path ${path[2]}, method ${path[3]}`);
    // Return the first value if contentType not set
    return data[0];
  });

module.exports = {
  getJsonPathAsArray,
  getJsonPath: (path, json) => JSONPath({
    path, json, resultType: 'all', wrap: true,
  })
    .map((result) => Object.assign(result, { path: getJsonPathAsArray(result.path) })),

  getRequestBodyContentTypes: (json, targetContentType) => getContentTypes(
    module.exports
      .getJsonPath('paths.*.*.requestBody.content.*.schema', json)
      .map((schema) => {
        const { path } = schema;
        const key = path.slice(0, 4).join('');
        const contentType = path[6];

        return Object.assign(schema, { key, contentType });
      }),
    targetContentType,
    'request',
  ),
  getResponseContentTypes: (json, targetContentType) => getContentTypes(
    module.exports
      .getJsonPath('paths.*.*.responses.*.content.*.schema', json)
      .map((schema) => {
        const { path } = schema;
        const key = path.slice(0, 4).join('');
        const contentType = path[7];

        return Object.assign(schema, { key, contentType });
      }),
    targetContentType,
    'response',
  ),

};
