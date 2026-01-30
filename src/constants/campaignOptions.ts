import logoImfilms from '@/assets/logo-imfilms.png';
import tiktokLogo from '@/assets/tiktok-logo.png';
import facebookLogo from '@/assets/facebook-logo.png';
import instagramLogo from '@/assets/instagram-logo.png';
import youtubeLogo from '@/assets/youtube-logo.png';

export const GENRES = [
    "Drama", "Comedia", "Thriller", "Terror", "Acción", "Romance",
    "Documental", "Animación", "Ciencia ficción", "Fantasía", "Otro"
];

export const GOALS = [
    "Awareness del estreno",
    "Vender el máximo de entradas posible",
    "Mantener conversación post-estreno",
    "Apoyo a nominaciones/premios/festivales"
];

export const PLATFORMS_DATA = [
    { name: "Instagram", logo: instagramLogo, description: "Stories, reels y posts para alcanzar audiencias visuales" },
    { name: "Facebook", logo: facebookLogo, description: "Segmentación demográfica precisa y eventos de cine" },
    { name: "TikTok", logo: tiktokLogo, description: "Contenido viral y audiencias jóvenes" },
    { name: "YouTube", logo: youtubeLogo, description: "Pre-rolls y campañas de video premium" },
];
