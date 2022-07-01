const { JSONPath } = require('jsonpath-plus');

const getJsonPathAsArray = (path) => path.replace(/'/g, '')
  .split(/(?:\]\[)|\[|\]/g)
  .filter((fragment) => fragment && fragment.trim() !== '');

module.exports = {
  getJsonPathAsArray,
  getJsonPath: (path, json) => JSONPath({
    path, json, resultType: 'all', wrap: true,
  })
    .map((result) => Object.assign(result, { path: getJsonPathAsArray(result.path) })),
};
