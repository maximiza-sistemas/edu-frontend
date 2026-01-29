import './Skeleton.css';

interface SkeletonProps {
    width?: string;
    height?: string;
    borderRadius?: string;
    className?: string;
}

export function Skeleton({
    width = '100%',
    height = '1rem',
    borderRadius = 'var(--radius-md)',
    className = ''
}: SkeletonProps) {
    return (
        <div
            className={`skeleton ${className}`}
            style={{ width, height, borderRadius }}
        />
    );
}

interface BookCardSkeletonProps {
    count?: number;
}

export function BookCardSkeleton({ count = 1 }: BookCardSkeletonProps) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="book-card-skeleton">
                    <Skeleton height="200px" borderRadius="var(--radius-lg) var(--radius-lg) 0 0" />
                    <div className="book-card-skeleton-content">
                        <Skeleton width="80%" height="1.25rem" />
                        <Skeleton width="50%" height="0.875rem" />
                        <div className="book-card-skeleton-tags">
                            <Skeleton width="60px" height="1.5rem" borderRadius="var(--radius-full)" />
                            <Skeleton width="80px" height="1.5rem" borderRadius="var(--radius-full)" />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}

export default Skeleton;
