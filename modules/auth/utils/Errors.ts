export class ApplicationError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
    // Restore prototype chain for correct instanceof behavior in transpiled code
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }
}
