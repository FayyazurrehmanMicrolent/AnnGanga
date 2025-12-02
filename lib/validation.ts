export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function validateCategoryName(input: unknown) {
  if (typeof input !== 'string') {
    return { isValid: false, message: 'Name must be a string.' };
  }

  const name = input.trim();

  if (name.length === 0) {
    return { isValid: false, message: 'Name is required.' };
  }

  if (name.length < 2) {
    return { isValid: false, message: 'Name must be at least 2 characters long.' };
  }

  if (name.length > 100) {
    return { isValid: false, message: 'Name must be at most 100 characters long.' };
  }

  // Must start with a letter (Unicode letters allowed), may contain letters, digits, spaces and common punctuation
  // Note: underscore does not require escaping; ensure dash is escaped or placed last.
  const NAME_REGEX = /^[\p{L}][\p{L}\p{N}\s\- _&()'.]*$/u;
  if (!NAME_REGEX.test(name)) {
    return {
      isValid: false,
      message:
        'Name must start with a letter and can contain letters, digits, spaces and - _ & ( ) \u0027 . characters. It cannot start with a number or be only digits.',
    };
  }

  // Additionally, disallow names that are only digits (even though regex already forces first char letter)
  if (/^\d+$/.test(name)) {
    return { isValid: false, message: 'Name cannot be only numbers.' };
  }

  return { isValid: true, name };
}
