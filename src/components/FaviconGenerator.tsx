
import React, { useEffect } from 'react';

const FaviconGenerator = () => {
  useEffect(() => {
    // Criar favicon dinamicamente
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Fundo azul
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, 64, 64);
      
      // Bordas arredondadas
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      ctx.roundRect(0, 0, 64, 64, 12);
      ctx.fill();
      
      // Resetar composite operation
      ctx.globalCompositeOperation = 'source-over';
      
      // Texto "PP" em branco
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PP', 32, 32);
    }

    // Converter para data URL e definir como favicon
    const faviconUrl = canvas.toDataURL('image/png');
    
    // Atualizar favicon existente ou criar novo
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = 'image/png';
      document.head.appendChild(favicon);
    }
    favicon.href = faviconUrl;

    // Criar também apple-touch-icon
    const canvas2 = document.createElement('canvas');
    canvas2.width = 180;
    canvas2.height = 180;
    const ctx2 = canvas2.getContext('2d');

    if (ctx2) {
      // Fundo azul
      ctx2.fillStyle = '#2563eb';
      ctx2.fillRect(0, 0, 180, 180);
      
      // Bordas arredondadas
      ctx2.globalCompositeOperation = 'destination-in';
      ctx2.beginPath();
      ctx2.roundRect(0, 0, 180, 180, 30);
      ctx2.fill();
      
      // Resetar composite operation
      ctx2.globalCompositeOperation = 'source-over';
      
      // Texto "PP" em branco
      ctx2.fillStyle = '#ffffff';
      ctx2.font = 'bold 70px Arial';
      ctx2.textAlign = 'center';
      ctx2.textBaseline = 'middle';
      ctx2.fillText('PP', 90, 90);
    }

    const appleTouchUrl = canvas2.toDataURL('image/png');
    
    let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (!appleTouchIcon) {
      appleTouchIcon = document.createElement('link');
      appleTouchIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleTouchIcon);
    }
    appleTouchIcon.href = appleTouchUrl;

    // Criar Open Graph image
    const ogCanvas = document.createElement('canvas');
    ogCanvas.width = 1200;
    ogCanvas.height = 630;
    const ogCtx = ogCanvas.getContext('2d');

    if (ogCtx) {
      // Gradiente de fundo
      const gradient = ogCtx.createLinearGradient(0, 0, 1200, 630);
      gradient.addColorStop(0, '#dbeafe');
      gradient.addColorStop(1, '#e0e7ff');
      ogCtx.fillStyle = gradient;
      ogCtx.fillRect(0, 0, 1200, 630);

      // Ícone PP centralizado
      ogCtx.fillStyle = '#2563eb';
      ogCtx.beginPath();
      ogCtx.roundRect(450, 150, 120, 120, 20);
      ogCtx.fill();
      
      ogCtx.fillStyle = '#ffffff';
      ogCtx.font = 'bold 48px Arial';
      ogCtx.textAlign = 'center';
      ogCtx.textBaseline = 'middle';
      ogCtx.fillText('PP', 510, 210);

      // Título
      ogCtx.fillStyle = '#1f2937';
      ogCtx.font = 'bold 64px Arial';
      ogCtx.textAlign = 'center';
      ogCtx.fillText('PPPoker Pay', 600, 350);

      // Subtítulo
      ogCtx.fillStyle = '#6b7280';
      ogCtx.font = '32px Arial';
      ogCtx.fillText('Plataforma de Pagamentos', 600, 420);
      ogCtx.fillText('Saques e Depósitos Seguros', 600, 470);
    }

    // Criar um link temporário para download (desenvolvimento)
    const ogImageUrl = ogCanvas.toDataURL('image/png');
    
    // Atualizar meta tags Open Graph
    let ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
    if (ogImage) {
      ogImage.content = ogImageUrl;
    }

    let twitterImage = document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement;
    if (twitterImage) {
      twitterImage.content = ogImageUrl;
    }

  }, []);

  return null;
};

export default FaviconGenerator;
