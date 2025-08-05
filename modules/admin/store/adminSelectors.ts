import { selector } from 'recoil';
import { authAtoms } from '../../auth';

const settings = selector<AdminSettings>({
  key: 'admin.settings',
  get: ({ get }) => {
    const userSettings = get(authAtoms.userSettings) as any;
    if (!userSettings?.hasOwnProperty('admin')) return {};

    return JSON.parse(userSettings?.admin ?? '{}');
  },
});

export const adminSelectors = { settings };
