import { Node } from '@modules/grpc/library/blockjoy/v1/node copy';
import { display } from 'styles/utils.display.styles';

type Props = Partial<Pick<Node, 'ipGateway'>>;

export const IpGetaway = ({ ipGateway }: Props) => (
  <span css={display.ellipsis}>{ipGateway}</span>
);
