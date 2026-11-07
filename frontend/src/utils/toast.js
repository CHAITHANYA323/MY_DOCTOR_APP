import { toast } from 'react-toastify';

/**
 * Standardized notification helper wrapping react-toastify.
 * Provides consistent durations, positions, and styling across MediConnect.
 */
export const notify = {
  success: (message, options = {}) => {
    return toast.success(message, {
      autoClose: 3500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      ...options,
    });
  },

  error: (message, options = {}) => {
    return toast.error(message, {
      autoClose: 4500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      ...options,
    });
  },

  warning: (message, options = {}) => {
    return toast.warning(message, {
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      ...options,
    });
  },

  info: (message, options = {}) => {
    return toast.info(message, {
      autoClose: 3500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      ...options,
    });
  },
};

export default notify;

