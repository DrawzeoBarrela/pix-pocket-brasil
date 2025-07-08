
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentOperations } from '@/hooks/usePaymentOperations';
import { PaymentIdInput } from './PaymentStatusChecker/PaymentIdInput';
import { ActionButtons } from './PaymentStatusChecker/ActionButtons';
import { ResultDisplay } from './PaymentStatusChecker/ResultDisplay';

const PaymentStatusChecker = () => {
  const [paymentId, setPaymentId] = useState('');
  const { isAdmin } = useAuth();
  const {
    isChecking,
    result,
    checkPaymentStatus,
    manuallyConfirmPayment,
    testTelegramNotification,
    debugMercadoPago,
    resendNotification
  } = usePaymentOperations();

  if (!isAdmin) return null;

  const handleCheckStatus = () => checkPaymentStatus(paymentId);
  const handleManualConfirm = () => manuallyConfirmPayment(paymentId);
  const handleDebugMercadoPago = () => debugMercadoPago(paymentId);
  const handleResendNotification = () => resendNotification(paymentId);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>🔍 Verificar Status do PIX</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PaymentIdInput 
          paymentId={paymentId}
          onPaymentIdChange={setPaymentId}
        />

        <ActionButtons
          isChecking={isChecking}
          paymentId={paymentId}
          onCheckStatus={handleCheckStatus}
          onManualConfirm={handleManualConfirm}
          onTestTelegram={testTelegramNotification}
          onDebugMercadoPago={handleDebugMercadoPago}
          onResendNotification={handleResendNotification}
        />

        <ResultDisplay result={result} />
      </CardContent>
    </Card>
  );
};

export default PaymentStatusChecker;
