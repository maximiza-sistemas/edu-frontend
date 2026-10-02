import { useEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Check, Loader2, Upload, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FileUpload } from './useFileUpload';
import { formatFileSize } from './uploadRules';
import type { FileValidator } from './uploadRules';

type FieldMode = 'attached' | 'selected' | 'empty';

interface FileUploadFieldProps {
    id: string;
    upload: FileUpload;
    accept: string;
    validate: FileValidator;
    icon: LucideIcon;
    selectText: string;
    hint: string;
    successText: string;
    onUpload: () => void;
    // Shows the "attached" box with a remove button instead of the upload area
    attachedText?: string;
    onRemove?: () => void;
    showProgress?: boolean;
    children?: ReactNode;
}

function UploadProgress({ progress }: { progress: number }) {
    const isProcessing = progress >= 100;
    return (
        <div className="upload-progress">
            <div
                className="upload-progress-track"
                role="progressbar"
                aria-label="Progresso do envio"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-valuetext={isProcessing ? 'Processando no servidor' : `${progress}%`}
            >
                <div className="upload-progress-fill" style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
            <span className="upload-progress-label" aria-hidden="true">
                {isProcessing ? 'Processando...' : `${progress}%`}
            </span>
        </div>
    );
}

// When the focused control unmounts (file picked, upload finished), move focus to the new primary control
function useFocusOnModeChange(mode: FieldMode, targets: Record<FieldMode, RefObject<HTMLButtonElement>>) {
    const previousModeRef = useRef(mode);
    useEffect(() => {
        if (previousModeRef.current === mode) return;
        previousModeRef.current = mode;
        const active = document.activeElement;
        const hasLostFocus = !active || active === document.body || !active.isConnected;
        if (hasLostFocus) targets[mode].current?.focus();
    });
}

/** File input with the selected / uploading / attached states, shared by the PDF, cover, video and presentation fields. */
export default function FileUploadField({
    id, upload, accept, validate, icon: FileIcon, selectText, hint, successText,
    onUpload, attachedText, onRemove, showProgress = false, children
}: FileUploadFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const removeRef = useRef<HTMLButtonElement>(null);
    const sendRef = useRef<HTMLButtonElement>(null);
    const pickRef = useRef<HTMLButtonElement>(null);

    const isAttached = !!attachedText && !upload.file;
    const mode: FieldMode = isAttached ? 'attached' : upload.file ? 'selected' : 'empty';
    useFocusOnModeChange(mode, { attached: removeRef, selected: sendRef, empty: pickRef });

    const errorId = `${id}-error`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) upload.select(file, validate);
    };

    return (
        <div className="pdf-upload-container">
            <input ref={inputRef} type="file" accept={accept} onChange={handleChange} hidden tabIndex={-1} />

            {mode === 'attached' && (
                <div className="pdf-uploaded">
                    <Check size={20} className="text-success" aria-hidden="true" />
                    <span>{attachedText}</span>
                    <button ref={removeRef} type="button" className="btn btn-sm" onClick={onRemove}>
                        Remover
                    </button>
                </div>
            )}

            {mode === 'selected' && upload.file && (
                <div className="pdf-selected">
                    <FileIcon size={20} aria-hidden="true" />
                    <span className="pdf-filename">{upload.file.name}</span>
                    <span className="pdf-size">({formatFileSize(upload.file)})</span>
                    <button
                        ref={sendRef}
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={onUpload}
                        disabled={upload.isUploading}
                        aria-describedby={upload.error ? errorId : undefined}
                    >
                        {upload.isUploading
                            ? <><Loader2 size={16} className="spin" aria-hidden="true" /> Enviando...</>
                            : <><Upload size={16} aria-hidden="true" /> Enviar</>}
                    </button>
                    {upload.isUploading ? (
                        <button type="button" className="btn btn-sm" onClick={upload.cancel}>
                            Cancelar envio
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-icon btn-sm"
                            onClick={upload.clearSelection}
                            title="Cancelar seleção"
                            aria-label="Cancelar seleção"
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}

            {mode === 'empty' && (
                <button
                    ref={pickRef}
                    type="button"
                    className="upload-area"
                    onClick={() => inputRef.current?.click()}
                    aria-describedby={upload.error ? errorId : undefined}
                >
                    <Upload size={32} aria-hidden="true" />
                    <span>{selectText}</span>
                    <span className="upload-hint">{hint}</span>
                </button>
            )}

            {showProgress && upload.isUploading && <UploadProgress progress={upload.progress} />}
            {upload.error && <p id={errorId} className="upload-error" role="alert">{upload.error}</p>}
            {upload.success && <p className="upload-success" role="status">{successText}</p>}
            {children}
        </div>
    );
}
