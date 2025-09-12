import { useRecoilValue } from 'recoil';
import { NodeItems } from '@shared/components';
import { NODE_PROGRESS_STATUSES, useNodeView } from '@modules/node';
import { styles } from './NodeViewStatus.styles';
import { authSelectors } from '@modules/auth';

export const NodeViewStatus = () => {
  const { node } = useNodeView();

  const isSuperUser = useRecoilValue(authSelectors.isSuperUser);

  if (!node?.nodeId) return null;

  return (
    <>
      <div css={styles.wrapper}>
        {(node.blockHeight != null && node.blockHeight > -1) && (
          <div css={styles.card}>
            <NodeItems.BlockHeight blockHeight={node.blockHeight} view="card" />
            <h3 css={styles.cardLabel}>Block Height</h3>
          </div>
        )}
        {((node.apr != null && node.apr > -1 && node.protocolName === 'SQD')) && (
          <div css={styles.card}>
            <NodeItems.Apr apr={node.apr} view="card" />
            <h3 css={styles.cardLabel}>Current APR</h3>
          </div>
        )}
        {((node.jailed != null && node.protocolName === 'SQD')) && (
          <div css={styles.card}>
            <NodeItems.Jailed jailed={node.jailed} view="card" />
            <h3 css={styles.cardLabel}>Jailed Status</h3>
          </div>
        )}
        {(!NODE_PROGRESS_STATUSES.includes(node.nodeStatus?.protocol?.state!) ||
          isSuperUser) && (
          <div css={styles.card}>
            <NodeItems.NodeStatus
              nodeStatus={node.nodeStatus}
              view="card"
            />
            <h3 css={styles.cardLabel}>Node Status</h3>
          </div>
        )}
        {Boolean(node.nodeStatus?.protocol?.health) &&
          node.protocolName !== 'SQD' && (
            <div css={styles.card}>
              <NodeItems.ProtocolHealth
                nodeStatus={node.nodeStatus}
                view="card"
              />
              <h3 css={styles.cardLabel}>Online Health</h3>
            </div>
          )}
        {Boolean(node.nodeStatus?.protocol?.state) &&
          node.protocolName !== 'SQD' && (
            <div css={styles.card}>
              <NodeItems.ProtocolStatus
                nodeStatus={node.nodeStatus}
                view="card"
              />
              <h3 css={styles.cardLabel}>Protocol Status</h3>
            </div>
          )}
      </div>
    </>
  );
};
