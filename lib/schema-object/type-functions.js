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
) => {
  const { additionalProperties, description } = child.value;

  return {
    type: () => 'object',
    required: () => isRequired,
    additionalProperties: () => additionalProperties !== false,
    description: () => normaliseDescription(description),
  };
};

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
  pattern: () => child.value.pattern || '',
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

module.exports = {
  getArrayRequirement,
  getBooleanRequirement,
  getIntegerRequirement,
  getNumberRequirement,
  getObjectRequirement,
  getParentArrayPath,
  getStringRequirement,
  getTypeFunction,
};
