
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl: string;
}

const QRCodeModal = ({ isOpen, onClose, qrCodeUrl }: QRCodeModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode size={20} />
            QR Code PIX
          </DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            Escaneie o QR Code abaixo para efetuar o pagamento PIX
          </p>
          {qrCodeUrl && (
            <img 
              src={qrCodeUrl} 
              alt="QR Code PIX" 
              className="mx-auto rounded-lg shadow-md"
            />
          )}
          <p className="text-xs text-gray-500">
            Após o pagamento, sua solicitação será processada automaticamente.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;
