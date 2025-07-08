export interface PaymentResult {
  status: string;
  message: string;
  operation?: any;
  webhook?: {
    status?: number;
    result?: any;
    error?: string;
  };
  manualConfirmation?: {
    success: boolean;
    message: string;
    notification?: any;
  };
  telegramTest?: any;
  debugResults?: any;
  notification?: any;
  error?: string;
  timestamp?: string;
  paymentId?: string;
}

export interface PaymentOperationHookReturn {
  isChecking: boolean;
  result: PaymentResult | null;
  setResult: (result: PaymentResult | null) => void;
  checkPaymentStatus: (paymentId: string) => Promise<void>;
  manuallyConfirmPayment: (paymentId: string) => Promise<void>;
  testTelegramNotification: () => Promise<void>;
  debugMercadoPago: (paymentId: string) => Promise<void>;
  resendNotification: (paymentId: string) => Promise<void>;
}