import { css, keyframes } from '@emotion/react';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const styles = {
  wrapper: css`
    display: grid;
    gap: 20px;
    animation: ${fadeIn} 0.3s ease-out both;
  `,
};
