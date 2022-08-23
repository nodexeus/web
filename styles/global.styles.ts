import { css } from '@emotion/react';
import { breakpoints } from './variables.styles';

/**
 * Root CSS
 */

export const globalStyles = css`
  :root {
    /** Colors */
    --color-black: #000000;
    --color-white: #ffffff;
    --color-primary: #4f2784;
    --color-progressBar: #d3d9d9;
    --color-secondary: #e94187;
    --color-tertiary: #f77f00;
    --color-text: #2e2e38;
    --color-textNegative: #fcfcfd;
    --color-textLight: #9d9daf;
    --color-textGray: #c7c7d1;
    --color-textGrayLight: #73738c;
    --color-succes: #259a51;
    --color-error: #c32424;
    --color-noted: #e9ad39;
    --color-background: #eaeaea;
    --color-backgroundLight: #f5f5f5;
    --color-backgroundDark: #16191d;
    --color-backgroundGray: #383b43;
    --color-backgroundGrayLight: #73738c;
    --color-border: #c7c7d1;
    --color-borderLight: #d4d4d4;
    --color-borderDark: #727272;
    --color-backgroundHero: #d3d9d9;

    /** Font family */
    --font-family-primary: 'Neutra2-Book, serif';
    --font-family-primaryLight: 'Neutra2-Light, serif';

    /** Font weight */
    --fontWeight-regular: 400;
    --fontWeight-medium: 500;
    --fontWeight-semiBold: 600;
    --fontWeight-bold: 700;
    --fontWeight-extraBold: 800;

    /** Border radius */
    --radius-small: '6px';
    --radius-medium: '16px';
    --radius-rounded: '1000px';
  }

  @font-face {
    font-family: 'Neutra2-Light';
    font-weight: 300;
    src: url('/fonts/Neutra2-Light.otf') format('opentype');
  }

  @font-face {
    font-family: 'Neutra2-Book';
    font-weight: 400;
    src: url('/fonts/Neutra2-Book.otf') format('opentype');
  }

  @font-face {
    font-family: 'Neutra2-Demi';
    font-weight: 600;
    src: url('/fonts/Neutra2-Demi.otf') format('opentype');
  }

  html {
    box-sizing: border-box;
  }

  body {
    min-height: 100vh;
    margin: 0 auto;
    color: var(--color-text);
    max-width: 1720px;

    @media ${breakpoints.toMed} {
      padding: 0 20px;
    }
  }
  *,
  *:before,
  *:after {
    box-sizing: inherit;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a {
    text-decoration: none;
    cursor: pointer;
    &:focus {
      outline: none;
    }
  }
  button {
    &:focus {
      outline: none;
    }
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p,
  ul {
    margin: 0;
    padding: 0;
  }

  ul,
  ol,
  dl {
    margin-block-start: 0px;
    margin-block-end: 0px;
    margin-inline-start: 0px;
    margin-inline-end: 0px;
    padding-inline-start: 0px;
    list-style: none;
  }
`;
