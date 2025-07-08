import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PaymentIdInputProps {
  paymentId: string;
  onPaymentIdChange: (value: string) => void;
}

export const PaymentIdInput: React.FC<PaymentIdInputProps> = ({
  paymentId,
  onPaymentIdChange
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="paymentId">ID do Pagamento (Mercado Pago)</Label>
      <Input
        id="paymentId"
        placeholder="Ex: 117339161722"
        value={paymentId}
        onChange={(e) => onPaymentIdChange(e.target.value)}
      />
    </div>
  );
};