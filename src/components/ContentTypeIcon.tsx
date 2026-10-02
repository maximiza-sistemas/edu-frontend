import { BookOpen, PlayCircle, Presentation } from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import type { ContentType } from '../services/api';

const CONTENT_ICONS: Record<ContentType, LucideIcon> = {
    pdf: BookOpen,
    video: PlayCircle,
    pptx: Presentation
};

interface ContentTypeIconProps extends LucideProps {
    type: ContentType;
}

export default function ContentTypeIcon({ type, ...iconProps }: ContentTypeIconProps) {
    const Icon = CONTENT_ICONS[type];
    return <Icon {...iconProps} />;
}
