import { Node } from '@modules/grpc/library/blockjoy/v1/node';
import { Copy } from '@shared/components';
import { styles } from '@shared/components/Buttons/NextLink/NextLink.styles';
import { getNodeRpcUrl } from './getNodeRpcUrl';
import { styles as CopyStyles } from '@shared/components/General/Copy/Copy.styles';

export const mapNodeToDetails = (node: Node) => {
  const rpcUrl = getNodeRpcUrl(node.dnsName);

  const nodeType = node.versionMetadata.find(
    (m) => m.metadataKey === 'node-type',
  )?.value;

  const network = node.versionMetadata.find(
    (m) => m.metadataKey === 'network',
  )?.value;

  const client = node.versionMetadata.find(
    (m) => m.metadataKey === 'client',
  )?.value;

  const details: {
    label: string | any;
    data: any | undefined;
  }[] = [
    {
      label: 'SQD Name',
      data: node.sqd_name || '-',
    },
    {
      label: 'Peer ID',
      data:
        (
          <>
            <a css={CopyStyles.text}>
              {node.p2pAddress}
              <span css={CopyStyles.copyButton}>
                <Copy value={node.p2pAddress} />
              </span>
            </a>
          </>
        ) || '-',
    },
    {
      label: 'Jailed',
      data: node.jailed ? 'Yes' : 'No',
    },
    ...(node.jailed
      ? [
          {
            label: 'Jailed Reason',
            data: node.jailedReason || '-',
          },
        ]
      : []),
    {
      label: 'Current APR',
      data: node.apr?.toFixed(2) + '%' || '-',
    },
    {
      label: 'Dashboard URL',
      data:
        (
          <>
            <a
              css={styles.link}
              target="_blank"
              rel="noopener noreferrer"
              href={
                node.versionKey?.variantKey?.includes('mainnet')
                  ? `https://network.subsquid.io/workers/${node.p2pAddress}?backPath=/dashboard`
                  : node.versionKey?.variantKey?.includes('tethys')
                  ? `https://tethys.subsquid.io/workers/${node.p2pAddress}?backPath=/dashboard`
                  : `https://network.subsquid.io/workers/${node.p2pAddress}?backPath=/dashboard`
              }
            >
              SQD Dashboard
              <span css={styles.copyButton}>
                <Copy
                  value={
                    node.versionKey?.variantKey?.includes('mainnet')
                      ? `https://network.subsquid.io/workers/${node.p2pAddress}?backPath=/dashboard`
                      : node.versionKey?.variantKey?.includes('tethys')
                      ? `https://tethys.subsquid.io/workers/${node.p2pAddress}?backPath=/dashboard`
                      : `https://network.subsquid.io/workers/${node.p2pAddress}?backPath=/dashboard`
                  }
                />
              </span>
            </a>
          </>
        ) || '-',
    },
    {
      label: 'Version',
      data: node.semanticVersion || 'Latest',
    },
  ];

  // if (client) {
  //   details.unshift({
  //     label: 'Client',
  //     data: client,
  //   });
  // }

  if (nodeType) {
    details.push({
      label: 'Network',
      data: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
    });
  }

  // if (nodeType) {
  //   details.unshift({
  //     label: 'Node Type',
  //     data: nodeType,
  //   });
  // }

  // if (rpcUrl) {
  //   details.unshift({
  //     label: 'RPC URL',
  //     data:
  //       (
  //         <>
  //           <a
  //             css={styles.link}
  //             target="_blank"
  //             rel="noopener noreferrer"
  //             href={rpcUrl}
  //           >
  //             {rpcUrl}

  //             <span css={styles.copyButton}>
  //               <Copy value={rpcUrl} />
  //             </span>
  //           </a>
  //         </>
  //       ) || '-',
  //   });
  // }

  return details;
};
