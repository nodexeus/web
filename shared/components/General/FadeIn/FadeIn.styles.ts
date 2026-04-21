import { css, keyframes } from '@emotion/react';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const styles = {
  wrapper: (duration: number, delay: number) => css`
    animation: ${fadeInUp} ${duration}ms ease-out ${delay}ms both;
  `,
};
