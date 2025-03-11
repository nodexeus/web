import { useRecoilState } from 'recoil';
import { commandAtoms } from '@modules/commands';
import { commandClient } from '@modules/grpc';
import { CommandExitCode } from '@modules/grpc/library/blockjoy/v1/command';

type Args = string | string[] | undefined;

export const useCommands = () => {
  const [commands, setCommands] = useRecoilState(commandAtoms.commands);
  const [loadingState, setLoadingState] = useRecoilState(
    commandAtoms.commandsLoadingState,
  );

  const getCommands = async ({
    nodeId,
    hostId,
    exitCode,
  }: {
    nodeId?: Args;
    hostId?: Args;
    exitCode?: CommandExitCode;
  }) => {
    setLoadingState('initializing');

    try {
      const response = await commandClient.listCommands(
        nodeId as string,
        nodeId as string,
        exitCode,
      );

      setCommands(response);
    } catch (err) {
      console.error('Error occured while fetching Commands', err);
      setCommands([]);
    } finally {
      setLoadingState('finished');
    }
  };

  return {
    commands,
    loadingState,

    getCommands,
  };
};
