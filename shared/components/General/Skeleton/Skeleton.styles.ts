import { css, keyframes } from '@emotion/react';

const shimmer = keyframes`
  0% {
    background-position: -400px 0;
  }
  100% {
    background-position: 400px 0;
  }
`;

export const styles = {
  skeleton: css`
    display: block;
    border-radius: 4px;
    width: 100px;
    height: 20px;
    background: linear-gradient(
      90deg,
      #1e1e20 0%,
      #2a2a2c 40%,
      #333336 50%,
      #2a2a2c 60%,
      #1e1e20 100%
    );
    background-size: 800px 100%;
    animation: ${shimmer} 1.8s ease-in-out infinite;
  `,
  skeletonGrid: (padding: string) => css`
    display: grid;
    gap: 20px;
    padding: ${padding};
  `,
};
