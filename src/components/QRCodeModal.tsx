
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl: string;
  pixCode?: string;
}

const QRCodeModal = ({ isOpen, onClose, qrCodeUrl, pixCode }: QRCodeModalProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyPixCode = async () => {
    if (pixCode) {
      try {
        await navigator.clipboard.writeText(pixCode);
        setCopied(true);
        toast({
          title: "Código PIX copiado!",
          description: "O código PIX foi copiado para a área de transferência.",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível copiar o código PIX.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode size={20} />
            QR Code PIX - Mercado Pago
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
              className="mx-auto rounded-lg shadow-md max-w-[250px]"
            />
          )}
          
          {pixCode && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Ou copie o código PIX:
              </p>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-xs font-mono break-all text-gray-800">
                  {pixCode}
                </p>
              </div>
              <Button
                onClick={copyPixCode}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={copied}
              >
                {copied ? (
                  <>
                    <Check size={16} className="mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={16} className="mr-2" />
                    Copiar Código PIX
                  </>
                )}
              </Button>
            </div>
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
