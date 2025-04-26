import { Node } from '@modules/grpc/library/blockjoy/v1/node';
import { display } from 'styles/utils.display.styles';
import { css } from '@emotion/react';
import { Copy } from '@shared/components/General/Copy/Copy';

type Props = Partial<Pick<Node, 'p2pAddress'>>;

export const P2pAddress = ({ p2pAddress }: Props) => (
  <div css={css`
    display: flex;
    align-items: center;
    gap: 4px;
  `}>
    <span css={[display.ellipsis, { fontSize: '11px' }]}>{p2pAddress}</span>
    {p2pAddress && <Copy value={p2pAddress} />}
  </div>
);
