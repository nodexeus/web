import '@testing-library/jest-dom';

// Mock Next.js router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  pathname: '/admin',
  query: {},
  asPath: '/admin',
  route: '/admin',
  back: vi.fn(),
  forward: vi.fn(),
  reload: vi.fn(),
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
};

vi.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock Recoil
vi.mock('recoil', () => ({
  useRecoilValue: vi.fn(),
  useRecoilState: vi.fn(),
  useSetRecoilState: vi.fn(),
  atom: vi.fn(),
  selector: vi.fn(),
}));
