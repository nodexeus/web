import { Global } from '@emotion/react';
import type { AppProps } from 'next/app';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { RecoilRoot } from 'recoil';
import { globalStyles } from 'styles/global.styles';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <RecoilRoot>
      <Global styles={globalStyles} />
      <Component {...pageProps} />
      <ToastContainer position="bottom-left" />
    </RecoilRoot>
  );
}

export default MyApp;
