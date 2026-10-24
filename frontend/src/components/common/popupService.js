let alertRequest = null;
let confirmRequest = null;
let popupListener = null;

function notifyPopup() {
  popupListener?.(alertRequest, confirmRequest);
}

export function customAlert(message, type = 'info') {
  return new Promise((resolve) => {
    alertRequest = { message, type, resolve };
    notifyPopup();
  });
}

export function customConfirm(message) {
  return new Promise((resolve) => {
    confirmRequest = { message, resolve };
    notifyPopup();
  });
}

export function subscribePopup(listener) {
  popupListener = listener;

  return () => {
    if (popupListener === listener) {
      popupListener = null;
    }
  };
}

export function resolveAlert() {
  if (!alertRequest) return;

  const { resolve } = alertRequest;

  alertRequest = null;
  notifyPopup();
  resolve();
}

export function resolveConfirm(confirmed) {
  if (!confirmRequest) return;

  const { resolve } = confirmRequest;

  confirmRequest = null;
  notifyPopup();
  resolve(confirmed);
}
