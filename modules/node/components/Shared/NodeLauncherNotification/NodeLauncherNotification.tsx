import { css } from '@emotion/react';
import { EmptyColumn, Modal } from '@shared/components';
import { styles } from './NodeLauncherNotification.styles';

type NodeLauncherNotificationProps = {
  handleClose: VoidFunction;
};

export const NodeLauncherNotification = ({
  handleClose,
}: NodeLauncherNotificationProps) => {
  return (
    <Modal
      portalId="modal-node-launched"
      isOpen={true}
      isActive={false}
      handleClose={handleClose}
      additionalStyles={[styles.modal]}
    >
      <EmptyColumn
        hasMaxWidth={false}
        title="Your Request is In!"
        description={
          <>
            <p>
              Thanks for choosing to launch a node with us. Our team is already
              working on it and will be in touch!
            </p>
            <br />
          </>
        }
        additionalStyles={styles.emptyColumn}
      />
    </Modal>
  );
};
