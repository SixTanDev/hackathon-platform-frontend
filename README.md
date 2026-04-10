# Hackathon Platform Frontend

Frontend de plataforma universitaria de hackathones (Next.js 14 + TypeScript) que consume una API externa.

## Requisitos
- Node.js 20+ (recomendado LTS)
- npm 10+

## Configuración
1. Copiar variables de entorno:
   - `cp .env.example .env` (Linux/macOS)
   - `Copy-Item .env.example .env` (PowerShell)
2. Ajustar valores en `.env` si usas otro backend.

## Ejecutar en desarrollo
```bash
npm install
npm run dev
```

## Verificación rápida
```bash
npm run build
npm run lint
```
