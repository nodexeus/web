import { BrowserStorage } from './BrowserStorage';

export class IdentityRepository {
  private _key = 'identity';
  private _hostProvisionsKey = 'hostProvisionKeys';
  private _storage: BrowserStorage<User>;

  constructor(storage: BrowserStorage<User>) {
    this._storage = storage;
  }

  public getIdentity = () => this._storage.get(this._key);

  public saveIdentity = (user: User) => {
    this._storage.save(this._key, user);
  };

  public updateIdentity = (user: User) => {
    const data = this._storage.get(this._key);
    if (data) {
      const updatedUser = {
        ...data,
        ...user,
        // Preserve tokens if they exist in the current data
        accessToken: data.accessToken || user.accessToken,
        refreshToken: data.refreshToken || user.refreshToken,
      };
      this._storage.save(this._key, updatedUser);
    }
  };
  public deleteIdentity = () => {
    this._storage.delete(this._key);
    this._storage.delete(this._hostProvisionsKey);
  };
}
