export const openGrafanaUrl = (
  key: string,
  folder: 'nodes' | 'node-logs' = 'nodes',
) =>
  window.open(
    `https://grafana.nodexeus.io/d/${folder}/linux-node-overview?var-instance=${key}`,
  );
