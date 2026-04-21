import { css } from '@emotion/react';
import { ITheme } from 'types/theme';
import { normalize } from './normalize.styles';
import { breakpoints } from './variables.styles';

/**
 * Root CSS
 */

export const globalStyles = (theme: ITheme) => css`
  ${normalize}

  :root {
    /* --- PRIMARY --- */
    --color-primary: hsl(9, 81%, 53%);
    --color-primary-o0: hsla(9, 81%, 53%, 0);
    --color-primary-o30: hsla(8, 89.2%, 60%, 0.3);

    /* --- SECONDARY --- */
    --color-secondary: hsla(30, 15.4%, 94.9%, 0.69);
    --color-secondary-o0: hsla(29, 82%, 80%, 0);
    --color-secondary-o30: hsla(30, 68.4%, 92.5%, 0.3);

    /* --- TERTIARY --- */
    --color-tertiary: hsl(240, 3%, 85%);

    /* --- TEXT --- */
    --color-text-1: hsl(240, 3%, 10%);
    --color-text-1-o20: hsla(240, 3%, 10%, 0.2);
    --color-text-1-o30: hsla(240, 3%, 10%, 0.3);
    --color-text-1-o70: hsla(240, 3%, 10%, 0.7);
    --color-text-2: hsl(240, 2%, 37%);
    --color-text-3: hsl(240, 2%, 65%);
    --color-text-4: hsl(240, 2%, 81%);
    --color-text-5: hsl(240, 5%, 95%);
    --color-text-5-o3: hsla(240, 5%, 95%, 0.03);
    --color-text-5-o10: hsla(240, 5%, 95%, 0.1);
    --color-text-5-o20: hsla(240, 5%, 95%, 0.2);
    --color-text-5-o30: hsla(240, 5%, 95%, 0.3);

    /* --- UTILITY --- */
    --color-utility-success: hsl(160, 60%, 50%);
    --color-utility-success-o10: hsla(160, 60%, 50%, 0.1);
    --color-utility-warning: hsl(0, 79%, 69%);
    --color-utility-warning-o10: hsla(0, 69%, 45%, 0.1);
    --color-utility-warning-o30: hsla(0, 69%, 45%, 0.3);
    --color-utility-note: hsl(40, 80%, 57%);

    /* --- BACKGROUND --- */
    --color-overlay-background-1: hsl(240, 3%, 18%);
    --color-overlay-background-2: hsl(240, 3%, 12%);
    --color-overlay-background-2-o50: hsla(240, 3%, 12%, 0.5);
    --color-background: hsl(240, 3%, 9%);

    /* --- BORDER --- */
    --color-border-1: hsl(240, 3%, 10%);
    --color-border-2: hsl(240, 2%, 37%);
    --color-border-3: hsl(240, 2%, 73%);
    --color-border-4: hsl(240, 2%, 83%);
    --color-border-5: hsl(240, 5%, 95%);
    --color-border-5-o10: hsla(240, 5%, 95%, 0.1);

    /* --- INPUT --- */
    --color-input-background: hsl(240, 3%, 14%);
    --color-input-placeholder: hsl(240, 2%, 46%);

    /* --- OTHERS --- */
    --color-foreground-secondary: hsl(240, 3%, 10%); /* Black */
    --color-foreground-secondary-o10: hsla(240, 3%, 10%, 0.1); /* Black */
    --color-foreground-tertiary: hsl(240, 3%, 16%); /* Black 2 */
    --color-shadow-o10: hsla(0, 0%, 0%, 0.1);
    --color-shadow-o80: hsla(0, 0%, 0%, 0.8);
  }

  /* --- LIGHT THEME --- */
  :root.theme--light {
    --color-overlay-background-1: hsl(240, 20%, 85%);

    --color-text-3: hsl(160, 4%, 14%);
    --color-text-1: hsl(96, 3%, 65%);
  }

  :root {
    /* --- FONT SIZES --- */
    --root-font-size: 16;
    --font-size-button: calc((16 / var(--root-font-size)) * 1rem);
    --font-size-button-small: calc((13 / var(--root-font-size)) * 1rem);
    --font-size-microlabel: calc((10 / var(--root-font-size)) * 1rem);
    --font-size-micro: calc((10 / var(--root-font-size)) * 1rem);
    --font-size-tiny: calc((12 / var(--root-font-size)) * 1rem);
    --font-size-label: calc((12 / var(--root-font-size)) * 1rem);
    --font-size-smaller: calc((13 / var(--root-font-size)) * 1rem);
    --font-size-small: calc((14 / var(--root-font-size)) * 1rem);
    --font-size-base: calc((16 / var(--root-font-size)) * 1rem);
    --font-size-medium: calc((20 / var(--root-font-size)) * 1rem);
    --font-size-large: calc((24 / var(--root-font-size)) * 1rem);
    --font-size-xlarge: calc((32 / var(--root-font-size)) * 1rem);
    --font-size-xxlarge: calc((40 / var(--root-font-size)) * 1rem);
    --font-size-xxxlarge: calc((48 / var(--root-font-size)) * 1rem);
    --font-size-huge: calc((60 / var(--root-font-size)) * 1rem);

    /* --- LINE HEIGHTS--- */
    --line-height-micro: calc((12 / var(--root-font-size)) * 1rem);
    --line-height-tiny: calc((16 / var(--root-font-size)) * 1rem);
    --line-height-microlabel: calc((16 / var(--root-font-size)) * 1rem);
    --line-height-label: calc((16 / var(--root-font-size)) * 1rem);
    --line-height-smaller: calc((20 / var(--root-font-size)) * 1rem);
    --line-height-small: calc((20 / var(--root-font-size)) * 1rem);
    --line-height-base: calc((24 / var(--root-font-size)) * 1rem);
    --line-height-button-small: calc((20 / var(--root-font-size)) * 1rem);
    --line-height-button: calc((24 / var(--root-font-size)) * 1rem);
    --line-height-medium: calc((28 / var(--root-font-size)) * 1rem);
    --line-height-large: calc((32 / var(--root-font-size)) * 1rem);
    --line-height-xlarge: calc((40 / var(--root-font-size)) * 1rem);
    --line-height-xxlarge: calc((44 / var(--root-font-size)) * 1rem);
    --line-height-xxxlarge: calc((52 / var(--root-font-size)) * 1rem);
    --line-height-huge: calc((64 / var(--root-font-size)) * 1rem);

    /* --- LETTER SPACINGS --- */
    --letter-spacing-huge: calc((-2 / var(--root-font-size)) * 1rem);
    --letter-spacing-xxxlarge: calc((-2 / var(--root-font-size)) * 1rem);
    --letter-spacing-xxlarge: calc((-1 / var(--root-font-size)) * 1rem);
    --letter-spacing-button: calc((-0.5 / var(--root-font-size)) * 1rem);
    --letter-spacing-default: calc((0 / var(--root-font-size)) * 1rem);
    --letter-spacing-microlabel: calc((1 / var(--root-font-size)) * 1rem);
    --letter-spacing-label: calc((1.25 / var(--root-font-size)) * 1rem);

    /* --- FONT FAMILIES --- */
    --font-family-primary:
      'Styrene A LC', -apple-system, BlinkMacSystemFont, avenir next, avenir,
      segoe ui, helvetica neue, helvetica, Ubuntu, roboto, noto, arial,
      sans-serif;

    /* --- FONT WEIGHTS --- */
    --font-weight-normal: 400;
    --font-weight-medium: 500;
    --font-weight-bold: 700;

    /** --- LEVELS --- */
    --level-n1: -1;
    --level-1: 1;
    --level-2: 2;
    --level-3: 3;
    --level-4: 4;
    --level-9: 9;

    /* --- TRANSITION EASING --- */
    --transition-easing-cubic: cubic-bezier(0.55, 0.06, 0.68, 0.19);

    @font-face {
      font-family: 'Styrene A LC';
      font-style: italic;
      font-weight: 400;
      font-display: swap;
      src: url('/assets/fonts/StyreneALC-RegularItalic.woff2') format('woff2');
    }

    @font-face {
      font-family: 'Styrene A LC';
      font-style: italic;
      font-weight: 700;
      font-display: swap;
      src: url('/assets/fonts/StyreneALC-BoldItalic.woff2') format('woff2');
    }

    @font-face {
      font-family: 'Styrene A LC';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url('/assets/fonts/StyreneALC-Regular.woff2') format('woff2');
    }

    @font-face {
      font-family: 'Styrene A LC';
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url('/assets/fonts/StyreneALC-Bold.woff2') format('woff2');
    }

    @font-face {
      font-family: 'Styrene A LC';
      font-style: normal;
      font-weight: 500;
      font-display: swap;
      src: url('/assets/fonts/StyreneALC-Medium.otf') format('opentype');
    }
  }

  @keyframes rotateClockwise {
    from {
      transform: rotate3d(0, 0, 1, 0deg) translate3d(0, 0, 0);
    }
    to {
      transform: rotate3d(0, 0, 1, 360deg) translate3d(0, 0, 0);
    }
  }

  @keyframes blink {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  html {
    box-sizing: border-box;
    scroll-behavior: smooth;
    overflow-x: hidden;
    overflow-y: auto;
    height: 100%;
  }

  #__next {
    isolation: isolate;
  }

  .scroll-locked {
    @media ${breakpoints.toLrg} {
      overflow: hidden;
    }
  }

  body {
    color: var(--color-text);
    font-family: var(--font-family-primary);

    background-color: var(--color-foreground-secondary);
    color: var(--color-text-5);

    *::-webkit-scrollbar,
    *::-webkit-scrollbar-track {
      border-radius: 8px;
    }

    ::-webkit-scrollbar {
      width: 8px;
      padding-right: 8px;
    }

    ::-webkit-scrollbar-track {
      background: rgb(255 255 255 / 2%);
    }
  }
  *,
  *:before,
  *:after {
    box-sizing: inherit;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body,
  #__next {
    height: 100%;
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
  figure,
  ul {
    margin: 0;
    padding: 0;
    font-weight: var(--font-weight-normal);
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

  address {
    font-style: normal;
  }

  @media screen and (prefers-reduced-motion: reduce), (update: slow) {
    * {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }

  *::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    background: transparent;
  }

  *::-webkit-scrollbar-track {
    background: var(--color-text-1);
  }

  *::-webkit-scrollbar-thumb {
    background: rgb(255 255 255 / 10%);
    border-radius: 8px;
    outline: 0;

    &:hover,
    &:active {
      background: rgb(255 255 255 / 20%);
    }
  }
`;
