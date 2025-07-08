import React from 'react';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  isChecking: boolean;
  paymentId: string;
  onCheckStatus: () => void;
  onManualConfirm: () => void;
  onTestTelegram: () => void;
  onDebugMercadoPago: () => void;
  onResendNotification: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  isChecking,
  onCheckStatus,
  onManualConfirm,
  onTestTelegram,
  onDebugMercadoPago,
  onResendNotification
}) => {
  return (
    <div className="space-y-3">
      <Button 
        onClick={onCheckStatus}
        disabled={isChecking}
        className="w-full"
      >
        {isChecking ? 'Verificando...' : 'Verificar Status'}
      </Button>

      <Button 
        onClick={onManualConfirm}
        disabled={isChecking}
        className="w-full bg-orange-600 hover:bg-orange-700"
        variant="secondary"
      >
        Confirmar Manualmente
      </Button>

      <Button 
        onClick={onTestTelegram}
        disabled={isChecking}
        className="w-full bg-blue-600 hover:bg-blue-700"
        variant="secondary"
      >
        🔔 Testar Telegram
      </Button>

      <Button 
        onClick={onDebugMercadoPago}
        disabled={isChecking}
        className="w-full bg-purple-600 hover:bg-purple-700"
        variant="secondary"
      >
        🔍 Debug Mercado Pago
      </Button>

      <Button 
        onClick={onResendNotification}
        disabled={isChecking}
        className="w-full bg-green-600 hover:bg-green-700"
        variant="secondary"
      >
        🔔 Reenviar Notificação
      </Button>
    </div>
  );
};