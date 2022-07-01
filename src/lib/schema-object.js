const { getJsonPath } = require('./util');

const keywords = ['items', 'type', 'properties', 'required', 'additionalProperties', 'minLength', 'maxLength', 'minItems', 'maxItems', 'minProperties', 'maxProperties', 'enum', 'format', 'title', 'pattern', 'allOf', 'oneOf', 'anyOf', 'not'];

const isKeywordExtensionOrIndex = (fragment) => keywords
  .indexOf(fragment) !== -1 || Number.isInteger(parseInt(fragment)) || fragment.match(/x-.*/);

const getSerialisationPath = (path) => path
  .filter((fragment) => !isKeywordExtensionOrIndex(fragment));

const getParentArrayPath = (path, arrays) => Object.entries(arrays)
  .filter(([key, value]) => path.startsWith(key)) // eslint-disable-line no-unused-vars
  .map(([source, replacement]) => ({ source, replacement }))
  .pop();

const normaliseDescription = (description) => (description || '').replace(/\n|\s{2,}/g, ' ').replace(/ +/g, ' ');

const getArrayRequirement = (dataPath, isRequired, child, arrays) => {
  const coreRequirement = {
    type: () => 'array',
    required: () => isRequired,
    minItems: () => child.value.minItems || '',
    maxItems: () => child.value.maxItems || '',
    additionalProperties: () => 'N/A',
    description: () => normaliseDescription(child.value.description),
  };

  // Get any parent arrays and update path with parent
  const parentArray = getParentArrayPath(dataPath, arrays);
  const rawArrayPath = parentArray
    ? dataPath.replace(parentArray.source, parentArray.replacement)
    : dataPath;

  const arrayPath = rawArrayPath.match(/\[0\]$/) ? rawArrayPath : `${rawArrayPath}[*]`;
  arrays[dataPath.replace(/\[[0-9]+\]/, '')] = arrayPath; // eslint-disable-line no-param-reassign

  return {
    coreRequirement,
    ...(child.value.items.type !== 'object' ? {
      additionalRequirement: {
        additionalDataPath: arrayPath,
        value: child.value.items,
      },
    } : {}),
  };
};

const getObjectRequirement = (
  dataPath,
  isRequired,
  child,
) => ({
  type: () => 'object',
  required: () => isRequired,
  additionalProperties: () => child.additionalProperties !== 'false',
  description: () => normaliseDescription(child.value.description),
});

const getStringRequirement = (
  dataPath,
  isRequired,
  child,
) => ({
  type: () => 'string',
  required: () => isRequired,
  minLength: () => child.value.minLength || '',
  maxLength: () => child.value.maxLength || '',
  format: () => child.value.format || '',
  pattern: () => child.value.maxLength || '',
  enum: () => (child.value.enum || []).join(', '),
  additionalProperties: () => 'N/A',
  description: () => normaliseDescription(child.value.description),
});

const getIntegerRequirement = (
  dataPath,
  isRequired,
  child,
) => ({
  type: () => 'integer',
  required: () => isRequired,
  format: () => child.value.format || '',
  additionalProperties: () => 'N/A',
  description: () => normaliseDescription(child.value.description),
});

const getNumberRequirement = (
  dataPath,
  isRequired,
  child,
) => ({
  type: () => 'number',
  required: () => isRequired,
  format: () => child.value.format || '',
  additionalProperties: () => 'N/A',
  description: () => normaliseDescription(child.value.description),
});

// eslint-disable-next-line no-unused-vars
const getBooleanRequirement = (
  dataPath,
  isRequired,
  child,
) => ({
  type: () => 'boolean',
  required: () => isRequired,
  additionalProperties: () => 'N/A',
  description: () => normaliseDescription(child.value.description),
});

const getTypeFunction = (type, definition, requirementType) => {
  const requirementFunction = {
    array: getArrayRequirement,
    boolean: getBooleanRequirement,
    integer: getIntegerRequirement,
    number: getNumberRequirement,
    object: getObjectRequirement,
    string: getStringRequirement,
  };

  const fn = requirementFunction[type];

  if (!fn) {
    console.error(definition);
    throw new Error(`Could not match type value to transform function ${type} in ${requirementType} requirement`);
  }

  return fn;
};

class SchemaObject {
  constructor(schemaObject, delimiter = '|') {
    this.arrays = [];
    this.schemaObject = schemaObject;
    this.delimiter = delimiter;
  }

  getDelimitedValues(responseSignature, mappings) {
    const columnLayout = [
      'type',
      'required',
      'minLength',
      'maxLength',
      'minItems',
      'maxItems',
      'pattern',
      'format',
      'additionalProperties',
      'enum',
      'description',
    ];

    return responseSignature
      .concat(columnLayout
        .map((column) => {
          const fn = mappings[column];

          if (fn) {
            return fn();
          }

          return '';
        }))
      .join(this.delimiter);
  }

  getTests() {
    // Get the required properties for the response
    const required = getJsonPath('$..required', this.schemaObject.value)
      .reduce((output, child) => output.concat(child.value.map((p) => getSerialisationPath(child.path).concat(p).join('.'))), []);

    // Get all the important children i.e. those that can be serialised
    const children = getJsonPath('$..*', this.schemaObject.value)
      .filter((child) => ['description', 'required'].indexOf(child.path.slice(-1)[0]) === -1);

    return children
      .reduce((output, child) => {
        // Only process items that can actually be seriailised i.e a named schema object
        if (child.value.type && !isKeywordExtensionOrIndex(child.path.slice(-1).pop())) {
          const dataPath = getSerialisationPath(child.path).join('.');
          const parentArray = getParentArrayPath(dataPath, this.arrays);
          const isRequired = required.indexOf(dataPath) !== -1;
          const fn = getTypeFunction(child.value.type, child.value, 'core');
          const returnCode = this.schemaObject.path[5] === 'content' ? 'Request Body' : this.schemaObject.path[5];
          const requirement = fn(dataPath, isRequired, child, this.arrays);
          const dereferencedSchemaPath = child.path.join('.');
          const coreRequirementResponseSignature = [
            this.schemaObject.path[2],
            this.schemaObject.path[3],
            returnCode,
            dataPath,
            dereferencedSchemaPath,
          ];

          // additionalRequirement caters for arrays of items as these are described
          // using their own schema object under the "items" property. If additional
          // requirement is not set then concatenate now and exit
          if (!requirement.additionalRequirement) {
            const delimitedData = this.getDelimitedValues(
              coreRequirementResponseSignature,
              requirement.coreRequirement || requirement,
            );

            return output.concat(
              parentArray
                ? delimitedData
                  .replace(
                    parentArray.source,
                    parentArray.replacement,
                  )
                : delimitedData,
            );
          }

          const { additionalDataPath, value } = requirement.additionalRequirement;

          // An additional requirement can of course be more than one schema object, if described
          // using schema composition (allOf, oneOf, etc). Check for this upfront, fail if type or
          // composition keyword is missing
          if (!value.type && !('allOf' in value || 'oneOf' in value || 'anyOf' in value)) {
            throw new Error('Type not found on additional requirement and missing a valid schema composition keyword');
          }

          const additionalRequirementResponseSignature = [
            this.schemaObject.path[2],
            this.schemaObject.path[3],
            returnCode,
            additionalDataPath,
            `${dereferencedSchemaPath}.items`,
          ];

          // Catch-all loop over additional requirements
          const additionalRequirements = (
            value.type
              ? [value] // Has a type set
              : Object.values(value).pop()) // Has a composition keyword set
            .map((additionaPropertyValue) => {
              const additionalRequirementFn = getTypeFunction(additionaPropertyValue.type, additionaPropertyValue, 'additional');

              return this.getDelimitedValues(
                additionalRequirementResponseSignature,
                additionalRequirementFn(
                  additionalDataPath,
                  isRequired,
                  { value: additionaPropertyValue },
                  this.arrays,
                ),
              );
            });

          return output.concat(
            [
              parentArray
                ? this.getDelimitedValues(
                  coreRequirementResponseSignature,
                  requirement.coreRequirement,
                )
                  .replace(parentArray.source, parentArray.replacement)
                : this.getDelimitedValues(
                  coreRequirementResponseSignature,
                  requirement.coreRequirement,
                ),
            ].concat(additionalRequirements),
          );
        }

        return output;
      }, [])
      .map((test) => test.replace(/ +/g, ' ').trim())
      .sort();
  }
}

module.exports = SchemaObject;
