import { Node } from '@modules/grpc/library/blockjoy/v1/node';
import { display } from 'styles/utils.display.styles';

type Props = Partial<Pick<Node, 'p2pAddress'>>;

export const P2pAddress = ({ p2pAddress }: Props) => (
  <span css={display.ellipsis}>{p2pAddress}</span>
);
