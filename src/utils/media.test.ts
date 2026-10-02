import { describe, expect, it } from 'vitest';
import { uploadApi } from '../services/api';
import type { Book, ContentType } from '../services/api';
import {
    CONTENT_LABELS,
    MAX_PRESENTATION_SIZE_MB,
    MAX_VIDEO_SIZE_MB,
    PRESENTATION_ACCEPT,
    VIDEO_ACCEPT,
    getContentSource,
    getContentType,
    getOfficeViewerUrl,
    hasContent,
    isAllowedPresentationFile,
    isAllowedVideoFile,
    isPubliclyReachableUrl,
    isUploadedFilePath,
    parseExternalVideoUrl,
    resolveVideoSource
} from './media';

type ContentFields = Pick<Book, 'content_type' | 'pdf_url' | 'media_url'>;

const YT_ID = 'dQw4w9WgXcQ';
const VIMEO_ID = '76979871';
const VIMEO_HASH = '4c2fd9b3f6';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const PPT_MIME = 'application/vnd.ms-powerpoint';

function youtube(videoId: string) {
    return {
        kind: 'youtube',
        videoId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
}

function vimeo(videoId: string, privacyHash?: string) {
    return {
        kind: 'vimeo',
        videoId,
        embedUrl: `https://player.vimeo.com/video/${videoId}?${privacyHash ? `h=${privacyHash}&` : ''}dnt=1`
    };
}

function makeFile(name: string, type: string): File {
    return new File(['conteudo'], name, { type });
}

describe('upload constraints', () => {
    it('matches the backend size limits', () => {
        expect(MAX_VIDEO_SIZE_MB).toBe(500);
        expect(MAX_PRESENTATION_SIZE_MB).toBe(10);
    });

    it('lists every allowed extension and MIME type in the accept strings', () => {
        expect(VIDEO_ACCEPT.split(',')).toEqual(expect.arrayContaining([
            '.mp4', '.webm', '.ogv', '.m4v', 'video/mp4', 'video/webm', 'video/ogg', 'video/x-m4v'
        ]));
        expect(PRESENTATION_ACCEPT.split(',')).toEqual(expect.arrayContaining(['.pptx', '.ppt', PPTX_MIME, PPT_MIME]));
    });

    it('has a label set for every content type', () => {
        expect(Object.keys(CONTENT_LABELS).sort()).toEqual(['pdf', 'pptx', 'video']);
        for (const labels of Object.values(CONTENT_LABELS)) {
            expect(labels.name).not.toBe('');
            expect(labels.action).not.toBe('');
            expect(labels.missing).not.toBe('');
        }
    });
});

describe('getContentType', () => {
    it('treats legacy rows without content_type as pdf', () => {
        expect(getContentType({})).toBe('pdf');
        expect(getContentType({ content_type: undefined })).toBe('pdf');
    });

    it('treats a null content_type as pdf', () => {
        expect(getContentType({ content_type: null as unknown as ContentType })).toBe('pdf');
    });

    it.each<ContentType>(['pdf', 'video', 'pptx'])('keeps an explicit %s content_type', contentType => {
        expect(getContentType({ content_type: contentType })).toBe(contentType);
    });

    it.each(['', 'audio', 'PDF', 'Video', 'docx', 'toString', '__proto__'])(
        'falls back to pdf for the unknown content_type %j, so label lookups never fail',
        value => {
            const contentType = getContentType({ content_type: value as ContentType });

            expect(contentType).toBe('pdf');
            expect(CONTENT_LABELS[contentType].name).toBe('Livro');
        }
    );
});

describe('getContentSource and hasContent', () => {
    const cases: Array<[string, ContentFields, string | null]> = [
        ['legacy row with a PDF', { pdf_url: '/uploads/pdfs/livro.pdf' }, '/uploads/pdfs/livro.pdf'],
        ['legacy row without anything attached', {}, null],
        ['legacy row with only media_url', { media_url: `https://youtu.be/${YT_ID}` }, null],
        ['pdf with pdf_url', { content_type: 'pdf', pdf_url: '/uploads/pdfs/livro.pdf', media_url: null }, '/uploads/pdfs/livro.pdf'],
        ['pdf with only media_url', { content_type: 'pdf', pdf_url: null, media_url: '/uploads/videos/aula.mp4' }, null],
        ['pdf with an empty pdf_url', { content_type: 'pdf', pdf_url: '', media_url: '/uploads/videos/aula.mp4' }, null],
        ['uploaded video', { content_type: 'video', pdf_url: null, media_url: '/uploads/videos/aula.mp4' }, '/uploads/videos/aula.mp4'],
        ['video link', { content_type: 'video', media_url: `https://youtu.be/${YT_ID}` }, `https://youtu.be/${YT_ID}`],
        ['video with only pdf_url', { content_type: 'video', pdf_url: '/uploads/pdfs/livro.pdf', media_url: null }, null],
        ['video with an empty media_url', { content_type: 'video', pdf_url: '/uploads/pdfs/livro.pdf', media_url: '' }, null],
        ['video without media_url', { content_type: 'video' }, null],
        ['presentation', { content_type: 'pptx', pdf_url: null, media_url: '/uploads/presentations/aula.pptx' }, '/uploads/presentations/aula.pptx'],
        ['presentation with only pdf_url', { content_type: 'pptx', pdf_url: '/uploads/pdfs/livro.pdf' }, null],
        ['presentation with an empty media_url', { content_type: 'pptx', media_url: '' }, null]
    ];

    it.each(cases)('%s', (_label, book, expected) => {
        expect(getContentSource(book)).toBe(expected);
        expect(hasContent(book)).toBe(expected !== null);
    });
});

describe('isUploadedFilePath', () => {
    it.each(['/uploads/videos/aula.mp4', '/uploads/presentations/aula.pptx'])('accepts %s', path => {
        expect(isUploadedFilePath(path)).toBe(true);
    });

    it.each([
        'uploads/videos/aula.mp4',
        '/uploadsx/aula.mp4',
        '/api/uploads/aula.mp4',
        'https://edu.example.com/uploads/videos/aula.mp4',
        ''
    ])('rejects %s', path => {
        expect(isUploadedFilePath(path)).toBe(false);
    });
});

describe('parseExternalVideoUrl: YouTube', () => {
    it.each([
        ['watch', `https://www.youtube.com/watch?v=${YT_ID}`],
        ['watch without www', `https://youtube.com/watch?v=${YT_ID}`],
        ['watch over http', `http://www.youtube.com/watch?v=${YT_ID}`],
        ['watch with a trailing slash', `https://www.youtube.com/watch/?v=${YT_ID}`],
        ['watch with &t=30s and a playlist', `https://www.youtube.com/watch?v=${YT_ID}&t=30s&list=PL123&index=2`],
        ['watch with v after other params', `https://www.youtube.com/watch?app=desktop&feature=share&v=${YT_ID}`],
        ['watch with a fragment', `https://www.youtube.com/watch?v=${YT_ID}#t=1m`],
        ['mobile host', `https://m.youtube.com/watch?v=${YT_ID}`],
        ['music host', `https://music.youtube.com/watch?v=${YT_ID}&si=abc`],
        ['youtu.be', `https://youtu.be/${YT_ID}`],
        ['youtu.be with share params', `https://youtu.be/${YT_ID}?si=AbCdEf&t=42`],
        ['embed', `https://www.youtube.com/embed/${YT_ID}?start=10`],
        ['shorts', `https://www.youtube.com/shorts/${YT_ID}?feature=share`],
        ['live', `https://www.youtube.com/live/${YT_ID}?si=xyz`],
        ['legacy /v/', `https://www.youtube.com/v/${YT_ID}`],
        ['nocookie embed', `https://www.youtube-nocookie.com/embed/${YT_ID}`],
        ['nocookie without www', `https://youtube-nocookie.com/embed/${YT_ID}`],
        ['uppercase scheme and host', `HTTPS://WWW.YOUTUBE.COM/watch?v=${YT_ID}`],
        ['surrounding whitespace', `  https://youtu.be/${YT_ID}  \n`],
        ['explicit default port', `https://www.youtube.com:443/watch?v=${YT_ID}`]
    ])('parses %s links', (_label, url) => {
        expect(parseExternalVideoUrl(url)).toEqual(youtube(YT_ID));
    });

    it('accepts ids containing - and _', () => {
        expect(parseExternalVideoUrl('https://youtu.be/a-B_c1234XY')).toEqual(youtube('a-B_c1234XY'));
    });

    it('always builds a canonical nocookie embed, dropping start time, playlist and credentials', () => {
        const source = parseExternalVideoUrl(`https://user:pass@www.youtube.com:8443/watch?v=${YT_ID}&t=30s&list=PL123`);

        expect(source).toEqual(youtube(YT_ID));
    });

    it.each([
        ['an id that is too short', 'https://www.youtube.com/watch?v=dQw4w9WgXc'],
        ['an id that is too long', 'https://www.youtube.com/watch?v=dQw4w9WgXcQQ'],
        ['an id with invalid characters', 'https://www.youtube.com/watch?v=dQw4w9WgX.Q'],
        ['an id with injected markup', `https://www.youtube.com/watch?v=${YT_ID}"><script>alert(1)</script>`],
        ['an id with an encoded quote', `https://www.youtube.com/watch?v=${YT_ID}%22`],
        ['an empty v param', 'https://www.youtube.com/watch?v='],
        ['a missing v param', 'https://www.youtube.com/watch?list=PL123'],
        ['youtu.be without an id', 'https://youtu.be/'],
        ['youtu.be with an invalid id', 'https://youtu.be/not-an-id'],
        ['embed without an id', 'https://www.youtube.com/embed/'],
        ['shorts with an invalid id', 'https://www.youtube.com/shorts/abc'],
        ['a channel handle', 'https://www.youtube.com/@canaldaescola'],
        ['a channel page', 'https://www.youtube.com/channel/UC1234567890'],
        ['a playlist page', 'https://www.youtube.com/playlist?list=PL1234567890'],
        ['the home page', 'https://www.youtube.com/'],
        ['a search page carrying a v param', `https://www.youtube.com/results?search_query=aula&v=${YT_ID}`]
    ])('rejects %s', (_label, url) => {
        expect(parseExternalVideoUrl(url)).toBeNull();
    });
});

describe('parseExternalVideoUrl: Vimeo', () => {
    it.each([
        ['a plain id', `https://vimeo.com/${VIMEO_ID}`, vimeo(VIMEO_ID)],
        ['www host', `https://www.vimeo.com/${VIMEO_ID}`, vimeo(VIMEO_ID)],
        ['http', `http://vimeo.com/${VIMEO_ID}`, vimeo(VIMEO_ID)],
        ['a trailing slash and share param', `https://vimeo.com/${VIMEO_ID}/?share=copy`, vimeo(VIMEO_ID)],
        ['an unlisted id/hash', `https://vimeo.com/${VIMEO_ID}/${VIMEO_HASH}`, vimeo(VIMEO_ID, VIMEO_HASH)],
        ['an unlisted id/hash with share param', `https://vimeo.com/${VIMEO_ID}/${VIMEO_HASH}?share=copy`, vimeo(VIMEO_ID, VIMEO_HASH)],
        ['a player link', `https://player.vimeo.com/video/${VIMEO_ID}`, vimeo(VIMEO_ID)],
        ['a player link with ?h=', `https://player.vimeo.com/video/${VIMEO_ID}?h=${VIMEO_HASH}&badge=0`, vimeo(VIMEO_ID, VIMEO_HASH)],
        ['a channels link', `https://vimeo.com/channels/staffpicks/${VIMEO_ID}`, vimeo(VIMEO_ID)],
        ['a channels link with a numeric channel name', `https://vimeo.com/channels/1234/${VIMEO_ID}`, vimeo(VIMEO_ID)],
        ['a groups link', `https://vimeo.com/groups/musica/videos/${VIMEO_ID}`, vimeo(VIMEO_ID)],
        ['a manage page link', `https://vimeo.com/manage/videos/${VIMEO_ID}`, vimeo(VIMEO_ID)],
        ['a video inside a showcase', `https://vimeo.com/showcase/11223344/video/${VIMEO_ID}`, vimeo(VIMEO_ID)],
        ['a video inside a legacy album', `https://vimeo.com/album/11223344/video/${VIMEO_ID}`, vimeo(VIMEO_ID)]
    ])('parses %s', (_label, url, expected) => {
        expect(parseExternalVideoUrl(url)).toEqual(expected);
    });

    it('ignores a following segment that is not alphanumeric when looking for the privacy hash', () => {
        expect(parseExternalVideoUrl(`https://vimeo.com/${VIMEO_ID}/nao-e-hash`)).toEqual(vimeo(VIMEO_ID));
    });

    it('encodes the privacy hash so it cannot add parameters to the embed URL', () => {
        const source = parseExternalVideoUrl(`https://player.vimeo.com/video/${VIMEO_ID}?h=abc%26autoplay%3D1`);

        expect(source).toEqual({
            kind: 'vimeo',
            videoId: VIMEO_ID,
            embedUrl: `https://player.vimeo.com/video/${VIMEO_ID}?h=abc%26autoplay%3D1&dnt=1`
        });
    });

    it.each([
        ['a non-numeric id', 'https://vimeo.com/abcdef'],
        ['a user page', 'https://vimeo.com/user12345'],
        ['an id mixed with letters', 'https://vimeo.com/123abc'],
        ['the home page', 'https://vimeo.com/'],
        ['a channel without a video', 'https://vimeo.com/channels/staffpicks'],
        ['a showcase without a video', 'https://vimeo.com/showcase/11223344'],
        ['a live event (not embeddable as a video)', 'https://vimeo.com/event/11223344'],
        ['a player link without an id', 'https://player.vimeo.com/video/']
    ])('rejects %s', (_label, url) => {
        expect(parseExternalVideoUrl(url)).toBeNull();
    });
});

describe('parseExternalVideoUrl: untrusted input', () => {
    it.each([
        ['a look-alike suffix domain', `https://youtube.com.evil.com/watch?v=${YT_ID}`],
        ['a look-alike www suffix domain', `https://www.youtube.com.evil.com/watch?v=${YT_ID}`],
        ['a look-alike prefix domain', `https://evilyoutube.com/watch?v=${YT_ID}`],
        ['a subdomain that is not allow-listed', `https://evil.youtube.com/watch?v=${YT_ID}`],
        ['youtube.com in the path', `https://evil.com/youtube.com/watch?v=${YT_ID}`],
        ['youtube.com in the query', `https://evil.com/?next=https://www.youtube.com/watch?v=${YT_ID}`],
        ['youtu.be in the fragment', `https://evil.com/#https://youtu.be/${YT_ID}`],
        ['the credentials trick', `https://www.youtube.com@evil.com/watch?v=${YT_ID}`],
        ['the backslash trick', `https://evil.com\\@www.youtube.com/watch?v=${YT_ID}`],
        ['a youtu.be look-alike', `https://youtu.be.evil.com/${YT_ID}`],
        ['a vimeo look-alike', `https://vimeo.com.evil.com/${VIMEO_ID}`],
        ['vimeo.com in the path', `https://evil.com/vimeo.com/${VIMEO_ID}`],
        ['a trailing-dot host (not allow-listed)', `https://www.youtube.com./watch?v=${YT_ID}`],
        ['a direct link to a video file on another site', 'https://cdn.example.com/aula.mp4']
    ])('rejects %s', (_label, url) => {
        expect(parseExternalVideoUrl(url)).toBeNull();
    });

    it.each([
        `javascript:alert(document.cookie)//https://www.youtube.com/watch?v=${YT_ID}`,
        'JavaScript:alert(1)',
        `data:text/html,<iframe src="https://www.youtube.com/embed/${YT_ID}"></iframe>`,
        `ftp://www.youtube.com/watch?v=${YT_ID}`,
        'file:///C:/videos/aula.mp4',
        'blob:https://www.youtube.com/0b4d4b8e-1f7c-4f3a-9c2e-123456789abc',
        `ws://www.youtube.com/watch?v=${YT_ID}`
    ])('rejects the non-http(s) scheme in %s', url => {
        expect(parseExternalVideoUrl(url)).toBeNull();
    });

    it.each([
        '',
        '   ',
        'youtube',
        'not a url',
        'https://',
        'http://:80',
        `//www.youtube.com/watch?v=${YT_ID}`,
        '/uploads/videos/aula.mp4'
    ])('rejects the garbage string %j', raw => {
        expect(parseExternalVideoUrl(raw)).toBeNull();
    });

    // Debatable but intended: links must carry an explicit http(s) scheme, as copied from the browser address bar.
    it.each([`www.youtube.com/watch?v=${YT_ID}`, `youtu.be/${YT_ID}`, `vimeo.com/${VIMEO_ID}`])(
        'rejects the scheme-less link %s',
        raw => {
            expect(parseExternalVideoUrl(raw)).toBeNull();
        }
    );
});

// No module mock of '../services/api' here: on Windows, vitest can load api.ts under two module ids that differ
// only in the drive-letter case (e.g. a lowercase d: cwd with an uppercase root), so a vi.mock registered under
// one id is bypassed by imports resolved to the other. Comparing with the real getFileUrl does not depend on
// module identity, nor on VITE_API_URL from the local .env files.
describe('resolveVideoSource', () => {
    it('resolves an uploaded video to an absolute file URL through getFileUrl', () => {
        const path = '/uploads/videos/1700000000-aula.mp4';

        const source = resolveVideoSource(path);

        expect(source).toEqual({ kind: 'file', url: uploadApi.getFileUrl(path) });
        expect(source?.kind === 'file' && /^https?:\/\/[^/]+\/uploads\/videos\/1700000000-aula\.mp4$/.test(source.url)).toBe(true);
    });

    it('resolves YouTube and Vimeo links to embeds', () => {
        expect(resolveVideoSource(`https://youtu.be/${YT_ID}`)).toEqual(youtube(YT_ID));
        expect(resolveVideoSource(`https://vimeo.com/${VIMEO_ID}/${VIMEO_HASH}`)).toEqual(vimeo(VIMEO_ID, VIMEO_HASH));
    });

    // media_url stores the relative upload path, so an absolute URL to an upload is treated as an external link.
    it.each([
        'https://cdn.example.com/aula.mp4',
        'http://localhost:3001/uploads/videos/aula.mp4',
        'uploads/videos/aula.mp4',
        'javascript:alert(1)',
        ''
    ])('returns null for %j', mediaUrl => {
        expect(resolveVideoSource(mediaUrl)).toBeNull();
    });
});

describe('getOfficeViewerUrl', () => {
    it('embeds the file URL as an encoded src parameter', () => {
        expect(getOfficeViewerUrl('https://edu.example.com/uploads/presentations/aula.pptx')).toBe(
            'https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fedu.example.com%2Fuploads%2Fpresentations%2Faula.pptx'
        );
    });

    it('round-trips spaces, accents, query strings and fragments without leaking extra parameters', () => {
        const fileUrl = 'https://edu.example.com/uploads/presentations/Aula 1 - Ciências%20Naturais.pptx?v=2&wdStartOn=3#slide';

        const viewerUrl = new URL(getOfficeViewerUrl(fileUrl));

        expect(viewerUrl.origin).toBe('https://view.officeapps.live.com');
        expect(viewerUrl.pathname).toBe('/op/embed.aspx');
        expect([...viewerUrl.searchParams.keys()]).toEqual(['src']);
        expect(viewerUrl.searchParams.get('src')).toBe(fileUrl);
        expect(viewerUrl.hash).toBe('');
    });
});

describe('isPubliclyReachableUrl', () => {
    it.each([
        'http://localhost:3001/uploads/presentations/aula.pptx',
        'http://LOCALHOST/uploads/presentations/aula.pptx',
        'http://api.localhost:3001/uploads/presentations/aula.pptx',
        'http://127.0.0.1:3001/uploads/presentations/aula.pptx',
        'http://127.10.20.30/uploads/presentations/aula.pptx',
        'http://2130706433/uploads/presentations/aula.pptx',
        'http://0x7f.1/uploads/presentations/aula.pptx',
        'http://0.0.0.0:3001/uploads/presentations/aula.pptx',
        'http://10.0.0.5/uploads/presentations/aula.pptx',
        'http://10.255.255.255/uploads/presentations/aula.pptx',
        'http://192.168.0.10:3001/uploads/presentations/aula.pptx',
        'http://172.16.0.1/uploads/presentations/aula.pptx',
        'http://172.20.10.2/uploads/presentations/aula.pptx',
        'http://172.31.255.255/uploads/presentations/aula.pptx',
        'http://169.254.169.254/uploads/presentations/aula.pptx',
        'http://[::1]:3001/uploads/presentations/aula.pptx',
        'http://escola.local/uploads/presentations/aula.pptx',
        'http://SERVIDOR.LOCAL/uploads/presentations/aula.pptx',
        'http://100.64.0.1/uploads/presentations/aula.pptx',
        'http://100.127.255.255/uploads/presentations/aula.pptx'
    ])('returns false for the local or private address %s', url => {
        expect(isPubliclyReachableUrl(url)).toBe(false);
    });

    it.each([
        'https://edu.example.com/uploads/presentations/aula.pptx',
        'https://api.edu.example.com:8443/uploads/presentations/aula.pptx',
        'https://localhost.example.com/uploads/presentations/aula.pptx',
        'https://local.example.com/uploads/presentations/aula.pptx',
        'http://203.0.113.10/uploads/presentations/aula.pptx',
        'http://8.8.8.8/uploads/presentations/aula.pptx',
        'http://11.0.0.1/uploads/presentations/aula.pptx',
        'http://172.15.255.255/uploads/presentations/aula.pptx',
        'http://172.32.0.1/uploads/presentations/aula.pptx',
        'http://192.169.0.1/uploads/presentations/aula.pptx',
        'http://169.255.0.1/uploads/presentations/aula.pptx',
        'http://[2001:db8::1]/uploads/presentations/aula.pptx'
    ])('returns true for the public address %s', url => {
        expect(isPubliclyReachableUrl(url)).toBe(true);
    });

    it.each(['', 'not a url', '/uploads/presentations/aula.pptx', 'http://', 'http://999.1.1.1/aula.pptx'])(
        'returns false for the invalid URL %j',
        url => {
            expect(isPubliclyReachableUrl(url)).toBe(false);
        }
    );

    it.each([
        'http://servidor:3001/uploads/presentations/aula.pptx',
        'http://SERVIDOR-ESCOLA/uploads/presentations/aula.pptx',
        'http://servidor.:3001/uploads/presentations/aula.pptx',
        'http://localhost./uploads/presentations/aula.pptx'
    ])('returns false for the single-label intranet host %s', url => {
        expect(isPubliclyReachableUrl(url)).toBe(false);
    });

    it.each([
        'http://servidor.lan/uploads/presentations/aula.pptx',
        'http://edu.escola.internal:3001/uploads/presentations/aula.pptx',
        'http://servidor.home.arpa/uploads/presentations/aula.pptx',
        'http://SERVIDOR.LAN./uploads/presentations/aula.pptx'
    ])('returns false for the local-only domain %s', url => {
        expect(isPubliclyReachableUrl(url)).toBe(false);
    });

    it.each([
        'http://[::]/uploads/presentations/aula.pptx',
        'http://[0:0:0:0:0:0:0:1]:3001/uploads/presentations/aula.pptx',
        'http://[fc00::1]/uploads/presentations/aula.pptx',
        'http://[fd00::1]/uploads/presentations/aula.pptx',
        'http://[FD12:3456:789A::1]:3001/uploads/presentations/aula.pptx',
        'http://[fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff]/uploads/presentations/aula.pptx',
        'http://[fe80::1]/uploads/presentations/aula.pptx',
        'http://[fe80::1ff:fe23:4567:890a]/uploads/presentations/aula.pptx',
        'http://[febf::1]/uploads/presentations/aula.pptx'
    ])('returns false for the private or link-local IPv6 address %s', url => {
        expect(isPubliclyReachableUrl(url)).toBe(false);
    });

    it.each([
        'http://[::ffff:127.0.0.1]/uploads/presentations/aula.pptx',
        'http://[::ffff:10.0.0.5]:3001/uploads/presentations/aula.pptx',
        'http://[::ffff:192.168.0.10]/uploads/presentations/aula.pptx',
        'http://[::ffff:172.16.0.1]/uploads/presentations/aula.pptx',
        'http://[::ffff:169.254.169.254]/uploads/presentations/aula.pptx',
        'http://[::ffff:100.64.0.1]/uploads/presentations/aula.pptx',
        'http://[::ffff:c0a8:a]/uploads/presentations/aula.pptx'
    ])('returns false for the IPv4-mapped private address %s', url => {
        expect(isPubliclyReachableUrl(url)).toBe(false);
    });

    it.each([
        'http://[::ffff:8.8.8.8]/uploads/presentations/aula.pptx',
        'http://[::ffff:203.0.113.10]/uploads/presentations/aula.pptx',
        'http://[fbff::1]/uploads/presentations/aula.pptx',
        'http://[fec0::1]/uploads/presentations/aula.pptx',
        'http://[2606:4700::1111]/uploads/presentations/aula.pptx',
        'http://100.63.255.255/uploads/presentations/aula.pptx',
        'http://100.128.0.1/uploads/presentations/aula.pptx',
        'https://edu.example.lan.com.br/uploads/presentations/aula.pptx',
        'https://internal.example.com/uploads/presentations/aula.pptx'
    ])('returns true for the public address %s next to the private ranges', url => {
        expect(isPubliclyReachableUrl(url)).toBe(true);
    });

    // Known limitation: hostnames are not resolved, so a public name pointing to a private address counts as
    // public (the Office viewer then shows its own error).
    it('treats a public name that resolves to a private address as public', () => {
        expect(isPubliclyReachableUrl('http://10.0.0.5.nip.io/uploads/presentations/aula.pptx')).toBe(true);
    });
});

describe('isAllowedVideoFile', () => {
    it.each([
        ['aula.mp4', 'video/mp4'],
        ['aula.webm', 'video/webm'],
        ['aula.ogv', 'video/ogg'],
        ['aula.m4v', 'video/x-m4v'],
        ['aula.m4v', 'video/mp4'],
        ['AULA.MP4', 'video/mp4'],
        ['Aula.Final.WebM', 'video/webm'],
        ['minha aula (1).mp4', 'video/mp4'],
        ['aula.mp4', ''],
        ['aula.mp4', 'application/octet-stream']
    ])('accepts %s reported as %j', (name, type) => {
        expect(isAllowedVideoFile(makeFile(name, type))).toBe(true);
    });

    it.each([
        ['aula.mov', 'video/quicktime'],
        ['aula.avi', 'video/x-msvideo'],
        ['aula.mkv', 'video/x-matroska'],
        ['aula.mp3', 'audio/mpeg'],
        ['aula.webm', 'audio/webm'],
        ['aula.mp4', 'application/pdf'],
        ['aula.mp4', 'text/html'],
        ['aula.mp4', 'image/png'],
        ['aula.mp4', PPTX_MIME],
        ['aula.pptx', 'video/mp4'],
        ['aula.mp4.exe', 'application/x-msdownload'],
        ['aula.mp4.exe', ''],
        ['aula', 'video/mp4'],
        ['mp4', 'video/mp4'],
        ['aula.', 'video/mp4']
    ])('rejects %s reported as %j', (name, type) => {
        expect(isAllowedVideoFile(makeFile(name, type))).toBe(false);
    });
});

describe('isAllowedPresentationFile', () => {
    it.each([
        ['aula.pptx', PPTX_MIME],
        ['aula.ppt', PPT_MIME],
        ['AULA.PPTX', PPTX_MIME],
        ['Aula.Ppt', PPT_MIME],
        ['aula.ppt', PPTX_MIME],
        ['aula.pptx', ''],
        ['aula.pptx', 'application/octet-stream']
    ])('accepts %s reported as %j', (name, type) => {
        expect(isAllowedPresentationFile(makeFile(name, type))).toBe(true);
    });

    it.each([
        ['aula.pptx', 'video/mp4'],
        ['aula.ppt', 'video/webm'],
        ['aula.mp4', PPTX_MIME],
        ['aula.pdf', 'application/pdf'],
        ['aula.pptx', 'application/pdf'],
        ['aula.ppsx', 'application/vnd.openxmlformats-officedocument.presentationml.slideshow'],
        ['aula.pptm', 'application/vnd.ms-powerpoint.presentation.macroenabled.12'],
        ['aula.potx', 'application/vnd.openxmlformats-officedocument.presentationml.template'],
        ['aula.odp', 'application/vnd.oasis.opendocument.presentation'],
        ['aula.key', 'application/x-iwork-keynote-sffkey'],
        ['aula.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        ['aula.pptx.exe', ''],
        ['pptx', ''],
        // Debatable: a generic zip MIME type is treated as contradicting the .pptx extension.
        ['aula.pptx', 'application/zip']
    ])('rejects %s reported as %j', (name, type) => {
        expect(isAllowedPresentationFile(makeFile(name, type))).toBe(false);
    });
});
