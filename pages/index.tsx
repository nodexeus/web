import { useAuth } from '@modules/auth';
import type { NextPage } from 'next';
import { SEO } from 'ui';

const Home: NextPage = () => {
  const { logout } = useAuth();
  const url = process.env.NEXT_PUBLIC_URL || '';

  return (
    <div>
      <SEO
        title="Homepage | Next Prototyp Template"
        description="No nonsense nationwide platform that makes hard money loans easy"
      />
      <main>
        Hello world
        <br />
        <button type="button" onClick={logout}>
          Logout
        </button>
      </main>
    </div>
  );
};

export default Home;
