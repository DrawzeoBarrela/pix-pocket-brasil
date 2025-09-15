import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TelegramTestButton = () => {
  const { toast } = useToast();

  const testTelegramNotification = async () => {
    try {
      const testData = {
        type: 'deposit',
        amount: 10.00,
        userName: 'Teste Usuario',
        ppokerId: 'TEST123',
        status: 'confirmed'
      };

      const { data, error } = await supabase.functions.invoke('send-telegram-notification', {
        body: testData
      });

      if (error) {
        console.error('Error testing Telegram:', error);
        toast({
          title: "Erro no teste",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      console.log('Telegram test result:', data);
      toast({
        title: "Teste enviado!",
        description: "Verifique o canal do Telegram para confirmar o recebimento",
        variant: "default"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar teste do Telegram",
        variant: "destructive"
      });
    }
  };

  return (
    <Button 
      onClick={testTelegramNotification}
      className="mb-4"
    >
      🚀 Testar Telegram Bot
    </Button>
  );
};

export default TelegramTestButton;