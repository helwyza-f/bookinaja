export {};

type MidtransSnapResult = {
  order_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  status_code?: string;
  status_message?: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        opts?: {
          onSuccess?: (result: MidtransSnapResult) => void;
          onPending?: (result: MidtransSnapResult) => void;
          onError?: (result: MidtransSnapResult) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}
