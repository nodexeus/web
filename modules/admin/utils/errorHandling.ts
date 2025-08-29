/**
 * Error handling utilities for admin image property operations
 */

export interface AdminError {
  code: string;
  message: string;
  details?: string;
}

export interface PropertyError extends AdminError {
  field?: string;
}

/**
 * Parse gRPC error messages and convert them to user-friendly messages
 */
export const parsePropertyError = (error: any): PropertyError => {
  const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
  
  // Handle specific backend error types
  if (errorMessage.includes('DuplicateKey')) {
    const keyMatch = errorMessage.match(/Property key '([^']+)' already exists/);
    const key = keyMatch ? keyMatch[1] : 'unknown';
    return {
      code: 'DUPLICATE_KEY',
      message: `Property key '${key}' already exists for this image`,
      field: 'key',
      details: 'Please choose a different property key or update the existing property instead.'
    };
  }
  
  if (errorMessage.includes('PropertyInUse')) {
    const matches = errorMessage.match(/Cannot delete property '([^']+)': (\d+) nodes/);
    const key = matches ? matches[1] : 'unknown';
    const count = matches ? matches[2] : 'some';
    return {
      code: 'PROPERTY_IN_USE',
      message: `Cannot delete property '${key}'`,
      details: `${count} nodes are currently using this image. Stop or migrate these nodes before deleting the property.`
    };
  }
  
  if (errorMessage.includes('InvalidConfiguration')) {
    return {
      code: 'INVALID_CONFIGURATION',
      message: 'Invalid property configuration',
      details: errorMessage.replace('Invalid property configuration: ', '')
    };
  }
  
  if (errorMessage.includes('ValidationFailed')) {
    return {
      code: 'VALIDATION_FAILED',
      message: 'Property validation failed',
      details: errorMessage.replace('Property validation failed: ', '')
    };
  }
  
  if (errorMessage.includes('InheritanceFailed')) {
    return {
      code: 'INHERITANCE_FAILED',
      message: 'Property inheritance failed',
      details: errorMessage.replace('Property inheritance failed: ', '')
    };
  }
  
  if (errorMessage.includes('RequiredProperty')) {
    const keyMatch = errorMessage.match(/Cannot modify property '([^']+)'/);
    const key = keyMatch ? keyMatch[1] : 'unknown';
    return {
      code: 'REQUIRED_PROPERTY',
      message: `Cannot modify required property '${key}'`,
      details: 'This property is required by the protocol and cannot be modified or deleted.'
    };
  }
  
  if (errorMessage.includes('PropertyNotFound')) {
    const keyMatch = errorMessage.match(/Property '([^']+)' not found/);
    const key = keyMatch ? keyMatch[1] : 'unknown';
    return {
      code: 'PROPERTY_NOT_FOUND',
      message: `Property '${key}' not found`,
      details: 'The property may have been deleted by another user.'
    };
  }
  
  if (errorMessage.includes('InvalidResourceConfig')) {
    return {
      code: 'INVALID_RESOURCE_CONFIG',
      message: 'Invalid resource configuration',
      details: errorMessage.replace('Invalid resource configuration: ', '')
    };
  }
  
  if (errorMessage.includes('GroupConflict')) {
    const groupMatch = errorMessage.match(/Property group '([^']+)' has conflicting/);
    const group = groupMatch ? groupMatch[1] : 'unknown';
    return {
      code: 'GROUP_CONFLICT',
      message: `Property group '${group}' has conflicting configurations`,
      details: 'Check that group properties have consistent settings and only one default per group.'
    };
  }
  
  // Handle network/connection errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('connection')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection error',
      details: 'Please check your internet connection and try again.'
    };
  }
  
  // Handle permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
    return {
      code: 'PERMISSION_ERROR',
      message: 'Permission denied',
      details: 'You do not have permission to perform this action.'
    };
  }
  
  // Default error
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    details: errorMessage
  };
};

/**
 * Get user-friendly error message for toast notifications
 */
export const getErrorToastMessage = (error: PropertyError): string => {
  switch (error.code) {
    case 'DUPLICATE_KEY':
      return error.message;
    case 'PROPERTY_IN_USE':
      return `${error.message}. ${error.details}`;
    case 'INVALID_CONFIGURATION':
    case 'VALIDATION_FAILED':
      return `${error.message}: ${error.details}`;
    case 'INHERITANCE_FAILED':
      return 'Property inheritance failed. Please try again.';
    case 'REQUIRED_PROPERTY':
      return error.message;
    case 'PROPERTY_NOT_FOUND':
      return `${error.message}. Please refresh the page.`;
    case 'INVALID_RESOURCE_CONFIG':
      return `${error.message}: ${error.details}`;
    case 'GROUP_CONFLICT':
      return error.message;
    case 'NETWORK_ERROR':
      return 'Network error. Please check your connection and try again.';
    case 'PERMISSION_ERROR':
      return 'You do not have permission to perform this action.';
    default:
      return error.message || 'An unexpected error occurred';
  }
};

/**
 * Determine if an error should show a retry button
 */
export const isRetryableError = (error: PropertyError): boolean => {
  return ['NETWORK_ERROR', 'UNKNOWN_ERROR', 'INHERITANCE_FAILED'].includes(error.code);
};

/**
 * Determine if an error should show additional details
 */
export const shouldShowErrorDetails = (error: PropertyError): boolean => {
  return !['NETWORK_ERROR', 'PERMISSION_ERROR'].includes(error.code) && !!error.details;
};

/**
 * Get confirmation message for destructive operations
 */
export const getDeleteConfirmationMessage = (propertyKey: string, propertyName?: string): string => {
  const displayName = propertyName || propertyKey;
  return `Are you sure you want to delete the property "${displayName}"?\n\nThis action cannot be undone and may affect nodes using this image.`;
};

/**
 * Get confirmation message for property inheritance operations
 */
export const getInheritanceConfirmationMessage = (
  sourceVersion: number,
  targetCount: number,
  syncType: 'newer' | 'all' | 'selected'
): string => {
  const typeDescription = {
    newer: 'newer versions',
    all: 'all related versions',
    selected: 'selected versions'
  }[syncType];
  
  return `This will copy properties from build version ${sourceVersion} to ${targetCount} ${typeDescription}.\n\nExisting properties with the same keys will be overwritten. Continue?`;
};