import { useHostView } from '@modules/host';
import { NetdataDashboard } from '@shared/components';

export const HostViewSidePanel = () => {
  const { host } = useHostView();
  console.log("Host:", host?.networkName);
  return <NetdataDashboard id={host?.networkName!} name={host?.networkName!} />;
};
