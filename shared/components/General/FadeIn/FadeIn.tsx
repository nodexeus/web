import { ReactNode } from 'react';
import { styles } from './FadeIn.styles';

type Props = {
  children: ReactNode;
  /** Animation duration in milliseconds. Default: 400 */
  duration?: number;
  /** Delay before animation starts in milliseconds. Default: 0 */
  delay?: number;
};

export const FadeIn = ({ children, duration = 400, delay = 0 }: Props) => (
  <div css={styles.wrapper(duration, delay)}>{children}</div>
);
