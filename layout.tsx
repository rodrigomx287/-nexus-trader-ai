import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title:'Nexus Trader AI', description:'Plataforma de análisis y educación de trading con IA' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es"><body>{children}</body></html>; }
