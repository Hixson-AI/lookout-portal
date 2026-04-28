/**
 * Lightweight JSON Schema Validator
 * Validates step config against inputSchema with support for:
 * - required fields
 * - type checking
 * - enum values
 * - min/max for numbers
 * - minLength/maxLength for strings
 * - pattern regex for strings
 */

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a config object against a JSON Schema.
 * Returns array of validation errors (empty if valid).
 */
type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
};

export function validateSchema(
  config: Record<string, unknown>,
  schema: JsonSchema
): ValidationError[] {
  const errors: ValidationError[] = [];
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);

  // Check required fields
  for (const field of required) {
    if (!(field in config) || config[field] === undefined || config[field] === null) {
      errors.push({ field, message: 'Required field is missing' });
    }
  }

  // Validate each property
  for (const [field, value] of Object.entries(config)) {
    const fieldSchema = properties[field];
    if (!fieldSchema) continue; // Unknown fields are allowed

    // Skip validation if value is empty and field is not required
    if (
      (value === undefined || value === null || value === '') &&
      !required.has(field)
    ) {
      continue;
    }

    const fieldErrors = validateField(field, value, fieldSchema);
    errors.push(...fieldErrors);
  }

  return errors;
}

function validateField(field: string, value: unknown, schema: JsonSchema): ValidationError[] {
  const errors: ValidationError[] = [];

  // Type validation
  if (schema.type && value !== undefined && value !== null) {
    const typeError = validateType(field, value, schema.type);
    if (typeError) errors.push(typeError);
  }

  // Enum validation
  if (Array.isArray(schema.enum) && value !== undefined && value !== null) {
    if (!schema.enum.includes(value)) {
      errors.push({
        field,
        message: `Must be one of: ${schema.enum.join(', ')}`,
      });
    }
  }

  // Numeric constraints
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push({ field, message: `Must be at least ${schema.minimum}` });
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      errors.push({ field, message: `Must be at most ${schema.maximum}` });
    }
  }

  // String constraints
  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      errors.push({
        field,
        message: `Must be at least ${schema.minLength} characters`,
      });
    }
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
      errors.push({
        field,
        message: `Must be at most ${schema.maxLength} characters`,
      });
    }
    if (schema.pattern && typeof schema.pattern === 'string') {
      try {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push({ field, message: 'Does not match required format' });
        }
      } catch {
        // Invalid regex - ignore
      }
    }
  }

  return errors;
}

function validateType(field: string, value: unknown, expectedType: string): ValidationError | null {
  switch (expectedType) {
    case 'string':
      if (typeof value !== 'string') {
        return { field, message: 'Must be a string' };
      }
      break;
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { field, message: 'Must be a number' };
      }
      break;
    case 'integer':
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return { field, message: 'Must be an integer' };
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        return { field, message: 'Must be a boolean' };
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        return { field, message: 'Must be an array' };
      }
      break;
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { field, message: 'Must be an object' };
      }
      break;
    default:
      // Unknown types - skip validation
      break;
  }
  return null;
}
