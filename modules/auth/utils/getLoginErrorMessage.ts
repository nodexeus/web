/**
 * Get Login Error Message utility
 * @name getLoginErrorMessage
 * @param {string} errorCode - The error code returned from the login attempt in catch block.
 * @description Utility function that is used to return the error message based on the error code.
 */

export function getLoginErrorMessage(errorCode: string) {
    switch (errorCode) {
        case 'auth/user-not-found':
            return 'User not found';
        case 'auth/wrong-password':
            return 'Wrong password';
        case 'auth/cancelled-popup-request':
            return 'Login cancelled';
        case 'auth/account-exists-with-different-credential':
            return 'Account exists with different credential';
        default:
            return 'Unknown error';
    }
}