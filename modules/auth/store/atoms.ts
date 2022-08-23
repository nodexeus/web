import { atom } from 'recoil';

const emailAtom = atom<string | null>({
    key: 'authentication.user.email',
    default: null,
});

const userUidAtom = atom<string | null>({
    key: 'authentication.user.uid',
    default: '',
});

const creationTimeAtom = atom<string | undefined>({
    key: 'authentication.user.creationTime',
    default: undefined,
});



export const authAtoms = {
    emailAtom,
    userUidAtom,
    creationTimeAtom,

}