export function useAuth() {
  /**
   * Create new account with email and password
   * @name register
   * @description Function that creates new firebase account in Firebase Authentication.
   */

  async function register(email: string, password: string) {}

  /**
   * Login user with email and password
   * @name login
   * @description Function that logins user who has previously created account.
   */

  async function login(email: string, password: string) {}

  /**
   * Logout user
   * @name logout
   * @description Function that logouts currently logged user.
   */

  async function logout() {}

  /**
   * Send forgot password link to user email
   * @name resetPassword
   * @description Function that sends reset password link to user email.
   */

  async function resetPassword(email: string) {}

  /**
   * Function that is used as a callback for Firebase Auth onAuthStateChanged event.
   * @name onUserAuthStateChange
   * @description Function that is used as a callback inside of onAuthStateChanged to subscribe and get if user is logged in or not.
   */

  return {
    register,
    logout,
    login,
    resetPassword,
  };
}
