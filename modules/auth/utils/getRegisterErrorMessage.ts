/**
 * Get Register Error Message utility
 * @name getRegisterErrorMessage
 * @param {string} errorCode - The error code returned from the register attempt in catch block.
 * @description Utility function that is used to return the error message based on the error code.
 */

export function getRegisterErrorMessage(errorCode: string) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'Email is already in use';
        case 'auth/internal-error':
            return 'Internal error';
        case 'auth/invalid-email':
            return 'Invalid email';
        default:
            return 'Unknown error';
    }
}