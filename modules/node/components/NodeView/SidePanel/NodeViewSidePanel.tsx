import { useNodeView } from '@modules/node';
import { NetdataDashboard, NodeItems } from '@shared/components';
import { styles } from './NodeViewSidePanel.styles';

export const NodeViewSidePanel = () => {
  const { node } = useNodeView();
  return (
    <>
      <div css={styles.form}>
        <h3 css={styles.formHeader}>APR</h3>
        <div css={styles.aprWrapper}>
          <NodeItems.Apr apr={node?.apr} view="card" />
        </div>
      </div>
      {node?.apr! > -1 && (
        <NetdataDashboard
          id={node?.nodeId!}
          name={node?.nodeName!}
          is_node="true"
        />
      )}
    </>
  );
};
