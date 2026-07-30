

# Hyperliquid Trading Dashboard

Una interfaz de trading descentralizada moderna y segura para [Hyperliquid](https://hyperliquid.xyz/) - construida con Next.js 15, TypeScript y carteras integradas (embedded wallets) de Privy.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Privy](https://img.shields.io/badge/Privy-3.0-purple?style=flat)](https://privy.io/)

## Características

### Gestión Segura de Carteras
- **Carteras Integradas** vía [Privy](https://privy.io/) - no se necesitan frases semilla
- **Soporte para Carteras Externas** - conecta MetaMask, Coinbase Wallet, etc.
- **Firma en el Lado del Cliente** - todas las transacciones se firman localmente, cero secretos en el servidor

### Capacidades de Trading
- **Futuros Perpetuos** - Opera BTC, ETH, SOL y más de 10 activos adicionales
- **Trading Spot** - Compra directa de activos
- **Órdenes de Mercado y Límite** - Soporte completo para tipos de órdenes
- **Precios en Tiempo Real** - Datos del mercado en vivo desde Hyperliquid

### Gestión de Fondos
- **Transferencias Spot ↔ Perps** - Mueve fondos entre cuentas al instante
- **Retiros** - Envía fondos a cualquier cartera externa
- **Seguimiento de Saldo** - Monitoreo en tiempo real del valor de la cuenta
- **Soporte Multi-Cartera** - Gestiona tanto carteras integradas como externas

## Arquitectura

### Diseño Centrado en el Frontend
Esta aplicación utiliza una **arquitectura directa de frontend** con creación automática de carteras:

```
User Login → Privy Auth → Auto-Create Embedded Wallet → Client-Side Signing → Hyperliquid
```

**Principales Beneficios:**
- **Creación automática de carteras** - las carteras se crean al iniciar sesión por primera vez
- **Cero lógica de cartera en el backend** - toda la gestión de carteras se realiza en el frontend
- **Ejecución más rápida** - sin viajes de ida y vuelta al servidor para operaciones de cartera
- **Mayor seguridad** - los usuarios controlan las claves privadas a través de MPC de Privy
- **Infraestructura simplificada** - menos endpoints de API para mantener

### Gestión de Carteras
- **Carteras Integradas**: Creadas automáticamente mediante la configuración `createOnLogin` de Privy
- **Carteras Externas**: Conexión opcional con MetaMask/Coinbase Wallet
- **Soporte Multi-Cartera**: Gestiona sin problemas ambos tipos de carteras
- **Seguimiento de Saldo**: Monitoreo en tiempo real en todas las carteras conectadas

## Cómo Empezar

### Requisitos Previos

- Node.js 18+ y pnpm instalados
- Cuenta en Privy ([regístrate aquí](https://privy.io/))
- Acceso a Hyperliquid testnet/mainnet

### 1. Clonar el Repositorio

```bash
git clone https://github.com/Aayushgoyal00/Hyperliquid-privy-setup.git
cd Hyperliquid-privy-setup
```

### 2. Instalar Dependencias

```bash
pnpm install
```

### 3. Configuración del Entorno

Crea un archivo `.env.local` en el directorio raíz:

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here

# Optional: Server-side features (if needed)
PRIVY_APP_SECRET=your_privy_app_secret_here

# Optional: Network Configuration
NEXT_PUBLIC_HYPERLIQUID_NETWORK=testnet  # or mainnet
```

**Obtén tus Credenciales de Privy:**
1. Ve al [Privy Dashboard](https://dashboard.privy.io/)
2. Crea una nueva aplicación
3. Copia tu App ID (requerido)
4. Habilita "Embedded Wallets" en la configuración
5. Configura "Create on Login" a `users-without-wallets`

**Nota:** `PRIVY_APP_SECRET` solo es necesario si usas características del lado del servidor. Para la gestión básica de carteras y trading, solo se requiere `NEXT_PUBLIC_PRIVY_APP_ID`.

### 4. Ejecutar el Servidor de Desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto

```
privy-setup/
├── src/
│   ├── app/                    # Páginas del Next.js App Router
│   │   ├── page.tsx           # Página de aterrizaje (redirige al dashboard)
│   │   ├── dashboard/         # Página principal del dashboard
│   │   ├── layout.tsx         # Diseño raíz con PrivyWrapper
│   │   └── globals.css        # Estilos globales
│   ├── components/            # Componentes React
│   │   ├── PrivyWrapper.tsx   # Proveedor de Privy con configuración de cartera automática
│   │   ├── TradingForm.tsx    # UI para colocación de órdenes
│   │   ├── WithdrawForm.tsx   # UI para retiros
│   │   ├── SpotPerpsTransfer.tsx  # Transferencia entre cuentas
│   │   ├── WalletInfo.tsx     # Componente de visualización de cartera
│   │   ├── MarketData.tsx     # Datos del mercado en tiempo real
│   │   └── FundingStatus.tsx  # Estado de financiación de la cuenta
│   ├── services/              # Lógica de negocio
│   │   └── hyperliquid.ts     # Cliente API de Hyperliquid
│   ├── utils/                 # Funciones utilitarias
│   │   ├── hyperliquid-config.ts  # Configuración de red
│   │   └── error-parser.ts    # Utilidades de manejo de errores
│   └── types/                 # Definiciones de TypeScript
│       └── trading.ts         # Tipos relacionados con trading
├── docs/                      # Documentación
│   ├── WALLET_FLOW.md         # Arquitectura de gestión de carteras
│   └── MIGRATION_GUIDE.md     # Migración de backend a frontend
├── public/                    # Recursos estáticos
├── .env.local                 # Variables de entorno (créalo)
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## Guía de Uso

### 1. Autenticación y Creación de Cartera
- Haz clic en "Iniciar sesión" en la página de aterrizaje
- Elige el método de inicio de sesión (correo electrónico, Google o cartera externa)
- **La cartera se crea automáticamente** al iniciar sesión por primera vez mediante Privy
- No se requieren frases semilla ni configuración manual

### 2. Financiar tu Cartera
- Ve al **Dashboard** - la información de la cartera se muestra automáticamente
- Copia la dirección de tu cartera integrada
- Envía USDC o ETH a la dirección (en la red Arbitrum)
- **O** conecta una cartera externa (MetaMask) y transfiere fondos

### 3. Colocar Órdenes
- Navega a la pestaña **Colocar Órdenes**
- Selecciona el activo (BTC, ETH, SOL, etc.)
- Elige orden de Mercado o Límite
- Ingresa el tamaño y el precio
- Haz clic en Comprar/Vender - firma con tu cartera integrada

### 4. Transferir entre Cuentas
- Ve a la pestaña **Transferencia Spot-Perps**
- Selecciona la dirección (Spot → Perps o viceversa)
- Ingresa la cantidad
- Confirma la transferencia

### 5. Retirar Fondos
- Navega a la pestaña **Retirar**
- Ingresa la dirección de la cartera de destino
- Ingresa la cantidad
- Confirma el retiro - los fondos se enviarán a la dirección especificada


## Agradecimientos

- [Hyperliquid](https://hyperliquid.xyz/) - Por la potente infraestructura de trading
- [Privy](https://privy.io/) - Por la solución de carteras integradas sin interrupciones
- [@nktkas/hyperliquid](https://www.npmjs.com/package/@nktkas/hyperliquid) - Excelente SDK de Hyperliquid

**Desarrollado por [@Aayushgoyal00](https://github.com/Aayushgoyal00)**

*¡Dale una estrella a este repositorio si te resulta útil!*
