import { uploadApi } from '../services/api';
import type { Book, ContentType } from '../services/api';

// Upload limits; must match the backend multer limits in uploadController.ts
export const MAX_VIDEO_SIZE_MB = 500;
// The Microsoft Office Online viewer refuses PowerPoint files larger than 10 MB
export const MAX_PRESENTATION_SIZE_MB = 10;

export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.m4v'];
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/x-m4v'];
export const VIDEO_ACCEPT = [...VIDEO_EXTENSIONS, ...VIDEO_MIME_TYPES].join(',');

export const PRESENTATION_EXTENSIONS = ['.pptx', '.ppt'];
export const PRESENTATION_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint'
];
export const PRESENTATION_ACCEPT = [...PRESENTATION_EXTENSIONS, ...PRESENTATION_MIME_TYPES].join(',');

export const CONTENT_LABELS: Record<ContentType, { name: string; action: string; missing: string }> = {
    pdf: { name: 'Livro', action: 'Ler Agora', missing: 'Sem PDF' },
    video: { name: 'Vídeo', action: 'Assistir', missing: 'Sem vídeo' },
    pptx: { name: 'Apresentação', action: 'Ver Slides', missing: 'Sem apresentação' }
};

type BookContentFields = Pick<Book, 'content_type' | 'pdf_url' | 'media_url'>;

const KNOWN_CONTENT_TYPES: readonly ContentType[] = ['pdf', 'video', 'pptx'];

/**
 * Rows created before content_type existed are PDF books. Unknown values (e.g. a format added by a newer
 * backend) also fall back to pdf, so lookups such as CONTENT_LABELS[type] never return undefined.
 */
export function getContentType(book: Pick<Book, 'content_type'>): ContentType {
    const contentType = book.content_type;
    return contentType && KNOWN_CONTENT_TYPES.includes(contentType) ? contentType : 'pdf';
}

/** The stored URL of the material's main content, or null when nothing is attached. */
export function getContentSource(book: BookContentFields): string | null {
    const source = getContentType(book) === 'pdf' ? book.pdf_url : book.media_url;
    return source ? source : null;
}

/** Whether the material can be opened in the viewer. */
export function hasContent(book: BookContentFields): boolean {
    return getContentSource(book) !== null;
}

function getExtension(filename: string): string {
    const dot = filename.lastIndexOf('.');
    return dot === -1 ? '' : filename.slice(dot).toLowerCase();
}

// Browsers report an empty or generic MIME type for some files (e.g. .pptx without Office installed),
// so the extension is the primary check and the MIME type only has to not contradict it.
function matchesAllowedFile(file: File, extensions: string[], mimeTypes: string[]): boolean {
    if (!extensions.includes(getExtension(file.name))) return false;
    return !file.type || file.type === 'application/octet-stream' || mimeTypes.includes(file.type);
}

export function isAllowedVideoFile(file: File): boolean {
    return matchesAllowedFile(file, VIDEO_EXTENSIONS, VIDEO_MIME_TYPES);
}

export function isAllowedPresentationFile(file: File): boolean {
    return matchesAllowedFile(file, PRESENTATION_EXTENSIONS, PRESENTATION_MIME_TYPES);
}

/** Paths returned by our own upload endpoints (served by the backend under /uploads). */
export function isUploadedFilePath(url: string): boolean {
    return url.startsWith('/uploads/');
}

export type VideoSource =
    | { kind: 'file'; url: string }
    | { kind: 'youtube'; videoId: string; embedUrl: string; thumbnailUrl: string }
    | { kind: 'vimeo'; videoId: string; embedUrl: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];
const VIMEO_HOSTS = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'];
// A numeric segment right after one of these is a showcase/album/channel/group/event id, not a video id.
const VIMEO_CONTAINER_SEGMENTS = ['showcase', 'album', 'channels', 'groups', 'event'];

function buildYoutubeSource(videoId: string): VideoSource | null {
    if (!YOUTUBE_ID.test(videoId)) return null;
    return {
        kind: 'youtube',
        videoId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
}

/**
 * Parses a YouTube or Vimeo link into an embeddable source.
 * Returns null for anything else, so arbitrary sites are never embedded in an iframe.
 */
export function parseExternalVideoUrl(raw: string): VideoSource | null {
    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);

    if (host === 'youtu.be') {
        return segments[0] ? buildYoutubeSource(segments[0]) : null;
    }

    if (YOUTUBE_HOSTS.includes(host)) {
        if (segments[0] === 'watch') {
            const id = url.searchParams.get('v');
            return id ? buildYoutubeSource(id) : null;
        }
        if (['embed', 'shorts', 'live', 'v'].includes(segments[0]) && segments[1]) {
            return buildYoutubeSource(segments[1]);
        }
        return null;
    }

    if (VIMEO_HOSTS.includes(host)) {
        // vimeo.com/123, vimeo.com/123/abcdef (unlisted), player.vimeo.com/video/123?h=abcdef,
        // vimeo.com/channels/staffpicks/123, vimeo.com/showcase/456/video/123
        const idIndex = segments.findIndex((segment, i) => /^\d+$/.test(segment) && !VIMEO_CONTAINER_SEGMENTS.includes(segments[i - 1]));
        if (idIndex === -1) return null;
        const videoId = segments[idIndex];
        const nextSegment = segments[idIndex + 1];
        const privacyHash = url.searchParams.get('h') || (nextSegment && /^[A-Za-z0-9]+$/.test(nextSegment) ? nextSegment : null);
        // dnt=1 asks the Vimeo player not to set tracking cookies or collect session data
        const hashParam = privacyHash ? `h=${encodeURIComponent(privacyHash)}&` : '';
        const embedUrl = `https://player.vimeo.com/video/${videoId}?${hashParam}dnt=1`;
        return { kind: 'vimeo', videoId, embedUrl };
    }

    return null;
}

/** Resolves a stored video media_url (uploaded file or external link) into something playable. */
export function resolveVideoSource(mediaUrl: string): VideoSource | null {
    if (isUploadedFilePath(mediaUrl)) {
        return { kind: 'file', url: uploadApi.getFileUrl(mediaUrl) };
    }
    return parseExternalVideoUrl(mediaUrl);
}

/** Embed URL of the Microsoft Office Online viewer; the file URL must be reachable from the internet. */
export function getOfficeViewerUrl(absoluteFileUrl: string): string {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteFileUrl)}`;
}

const LOCAL_HOSTNAME_SUFFIXES = ['.localhost', '.local', '.lan', '.internal', '.home.arpa'];

function isPrivateIpv4(a: number, b: number): boolean {
    if (a === 0 || a === 10 || a === 127) return true; // "this" network, private, loopback
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT (also used by VPNs such as Tailscale)
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    return a === 192 && b === 168;
}

/** host is the bracket-less IPv6 literal as normalized by URL (lowercase, compressed, hex only). */
function isPrivateIpv6(host: string): boolean {
    if (host === '::' || host === '::1') return true; // unspecified, loopback
    // IPv4-mapped (::ffff:a.b.c.d), which URL normalizes to ::ffff:xxxx:xxxx
    const mapped = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mapped) {
        const high = parseInt(mapped[1], 16);
        return isPrivateIpv4(high >> 8, high & 0xff);
    }
    const firstHextet = host.startsWith('::') ? 0 : parseInt(host.split(':')[0], 16);
    if ((firstHextet & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
    return (firstHextet & 0xffc0) === 0xfe80; // link-local fe80::/10
}

/**
 * False for localhost, intranet names and private-network addresses, which the Office Online viewer cannot
 * fetch. Hostnames are not resolved, so a public name pointing to a private address still counts as public.
 */
export function isPubliclyReachableUrl(absoluteUrl: string): boolean {
    let host: string;
    try {
        host = new URL(absoluteUrl).hostname.toLowerCase().replace(/\.$/, '');
    } catch {
        return false;
    }
    if (!host) return false;
    if (host.startsWith('[')) return !isPrivateIpv6(host.slice(1, -1));
    // Single-label names (http://servidor:3001) only resolve inside the local network
    if (!host.includes('.')) return false;
    if (LOCAL_HOSTNAME_SUFFIXES.some(suffix => host.endsWith(suffix))) return false;
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    return !(ipv4 && isPrivateIpv4(Number(ipv4[1]), Number(ipv4[2])));
}
