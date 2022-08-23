import { useAuth } from '@modules/auth';
import { NextPage } from 'next';
import { useState } from 'react';
import { button } from 'styles/button.styles';
import { SEO } from 'ui';

const LoginPage: NextPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, resetPassword, loginWithGoogle, loginWithFacebook } =
    useAuth();

  return (
    <>
      <SEO
        title="Login | Next Prototyp Template"
        description="Learn more about us and our culture &amp; values"
      />
      <div>
        <form
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => e.preventDefault()}
        >
          <div>
            <input
              id="email"
              placeholder="Enter your email address"
              type="text"
              onChange={(e: React.FormEvent<HTMLInputElement>) =>
                setEmail(e?.currentTarget.value)
              }
            />
            <label htmlFor="email">Email Address</label>
          </div>

          <div>
            <input
              id="password"
              placeholder="Enter your email address"
              type="password"
              onChange={(e: React.FormEvent<HTMLInputElement>) =>
                setPassword(e?.currentTarget.value)
              }
            />
            <label htmlFor="password">Password</label>
          </div>
          <div>
            <button
              css={button.primary}
              type="submit"
              onClick={() => login(email, password)}
            >
              Login
            </button>
            <button type="submit" onClick={() => register(email, password)}>
              Register
            </button>
            <button type="submit" onClick={() => resetPassword(email)}>
              Forgot password
            </button>
            <br />
            <button type="button" onClick={loginWithGoogle}>
              Google
            </button>
            <button type="button" onClick={loginWithFacebook}>
              Facebook
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default LoginPage;
