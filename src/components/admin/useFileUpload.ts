import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileValidator } from './uploadRules';

export interface UploadContext {
    signal: AbortSignal;
    // False once the upload was cancelled, reset or replaced: a late result must then be dropped
    isCurrent: () => boolean;
    onProgress: (percent: number) => void;
}

export type UploadTask = (file: File, context: UploadContext) => Promise<void>;

interface FileUploadState {
    file: File | null;
    isUploading: boolean;
    progress: number;
    error: string | null;
    success: boolean;
}

export interface FileUpload extends FileUploadState {
    select: (file: File, validate: FileValidator) => void;
    clearSelection: () => void;
    start: (task: UploadTask) => Promise<void>;
    // Stops the running upload but keeps the selected file, so it can be sent again
    cancel: () => void;
    // Stops the running upload and forgets the selection, errors and success message
    reset: () => void;
}

const INITIAL_STATE: FileUploadState = {
    file: null,
    isUploading: false,
    progress: 0,
    error: null,
    success: false
};

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Erro ao fazer upload');

/**
 * State of one file input: selection, upload progress, errors and cancellation.
 * Each upload gets its own AbortController and run id; cancelling, resetting or unmounting aborts the
 * request and makes `isCurrent()` false, so a late response never writes into a form it no longer belongs to.
 */
export function useFileUpload(): FileUpload {
    const [state, setState] = useState<FileUploadState>(INITIAL_STATE);
    const runIdRef = useRef(0);
    const controllerRef = useRef<AbortController | null>(null);

    const abortRun = useCallback(() => {
        runIdRef.current += 1;
        controllerRef.current?.abort();
        controllerRef.current = null;
    }, []);

    useEffect(() => abortRun, [abortRun]);

    const select = useCallback((file: File, validate: FileValidator) => {
        const error = validate(file);
        setState(prev => (error
            ? { ...prev, error, success: false }
            : { ...prev, file, error: null, success: false, progress: 0 }));
    }, []);

    const clearSelection = useCallback(() => {
        setState(prev => (prev.isUploading ? prev : { ...prev, file: null, error: null }));
    }, []);

    const cancel = useCallback(() => {
        abortRun();
        setState(prev => ({ ...prev, isUploading: false, progress: 0, error: null }));
    }, [abortRun]);

    const reset = useCallback(() => {
        abortRun();
        setState(INITIAL_STATE);
    }, [abortRun]);

    const start = async (task: UploadTask) => {
        const file = state.file;
        if (!file || state.isUploading) return;

        abortRun();
        const runId = runIdRef.current;
        const controller = new AbortController();
        controllerRef.current = controller;
        const isCurrent = () => runId === runIdRef.current && !controller.signal.aborted;
        const onProgress = (progress: number) => {
            if (isCurrent()) setState(prev => ({ ...prev, progress }));
        };

        setState(prev => ({ ...prev, isUploading: true, progress: 0, error: null, success: false }));
        try {
            await task(file, { signal: controller.signal, isCurrent, onProgress });
            if (isCurrent()) setState({ ...INITIAL_STATE, success: true });
        } catch (err) {
            if (isCurrent()) setState(prev => ({ ...prev, isUploading: false, error: getErrorMessage(err) }));
        } finally {
            if (controllerRef.current === controller) controllerRef.current = null;
        }
    };

    return { ...state, select, clearSelection, start, cancel, reset };
}
