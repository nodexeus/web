import { toast } from 'react-toastify';

/**
 * Use Toast Hook
 * @name useToast
 * @description Hook that is used to display toast messages.
 */

export function useToast() {
  return {
    successToast: toast.success,
    warningToast: toast.warning,
    infoToast: toast.info,
    errorToast: toast.error,
    noConnectionToast: toast.dark,
    dissmissToast: toast.dismiss,
  };
}
