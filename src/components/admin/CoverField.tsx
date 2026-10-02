import { ImageIcon } from 'lucide-react';
import { uploadApi } from '../../services/api';
import FileUploadField from './FileUploadField';
import type { MaterialForm } from './materialForm';
import type { MaterialMedia } from './useMaterialMedia';
import { MAX_COVER_SIZE_MB, validateCoverFile } from './uploadRules';

interface CoverFieldProps {
    form: MaterialForm;
    media: MaterialMedia;
}

/** Cover image upload with a preview of the current cover (uploaded or generated from the material). */
export default function CoverField({ form, media }: CoverFieldProps) {
    const showPreview = !!form.coverUrl && !media.cover.file;
    return (
        <div className="input-group">
            <label>Capa</label>
            <FileUploadField
                id="material-cover"
                upload={media.cover}
                accept="image/*"
                validate={validateCoverFile}
                icon={ImageIcon}
                selectText="Clique para selecionar uma capa"
                hint={`Formatos: JPG, PNG (menos de ${MAX_COVER_SIZE_MB}MB)`}
                successText="Capa enviada com sucesso!"
                onUpload={media.uploadCover}
            >
                {showPreview && (
                    <div className="cover-preview">
                        <img src={uploadApi.getFileUrl(form.coverUrl)} alt="Prévia da capa" />
                    </div>
                )}
            </FileUploadField>
        </div>
    );
}
