import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp usa binários nativos (.node/.so) carregados via dlopen, não via
  // require/import — se o Turbopack tentar empacotar o módulo, ele perde o
  // rastro do libvips-cpp.so e a função serverless quebra em produção com
  // ERR_DLOPEN_FAILED. Marcando como externo, a própria Vercel rastreia e
  // inclui os binários nativos corretamente.
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-6c6725674d9e493b9e62fa70cc59fd66.r2.dev",
      },
    ],
    // Cota de otimização de imagem do Vercel esgotada (retornando 402 Payment
    // Required em /_next/image para o site inteiro). Sem isso, nenhuma imagem
    // remota (logo ou produto) carrega em produção até o reset da cota/upgrade
    // do plano. As imagens do R2 já são servidas via HTTPS, então não há perda
    // de segurança, só perde o resize/reencode automático do Vercel.
    unoptimized: true,
  },
};

export default nextConfig;
