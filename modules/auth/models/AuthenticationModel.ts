export interface Authentication {
  email: string;
  password: string;
}

export interface User {
  email: string | null;
  userUid: string | null;
  creationTime: string | undefined;
}
