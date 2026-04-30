import { useId } from "react";

import { appCopy } from "../copy";
import { PrototypeIcon } from "../ui/icons";
import { BottomSheet } from "../ui/BottomSheet";

type AttachmentSheetProps = {
  open: boolean;
  onClose: () => void;
  onCamera: (file: File) => void;
  onImage: (file: File) => void;
  onAudio: (file: File) => void;
  onEditMeta: () => void;
};

export function AttachmentSheet({ open, onClose, onCamera, onImage, onAudio, onEditMeta }: AttachmentSheetProps) {
  const cameraId = useId();
  const imageId = useId();
  const audioId = useId();
  void onEditMeta;

  return (
    <BottomSheet onClose={onClose} open={open} title={appCopy.session.attach}>
      <div className="upload-grid">
        <label className="upload-option upload-option--tile" htmlFor={imageId}>
          <span className="upload-option__icon">
            <PrototypeIcon.image color="var(--accent)" />
          </span>
          <strong>{appCopy.session.attachImage}</strong>
        </label>
        <label className="upload-option upload-option--tile" htmlFor={cameraId}>
          <span className="upload-option__icon">
            <PrototypeIcon.camera color="var(--accent)" />
          </span>
          <strong>{appCopy.session.attachCamera}</strong>
        </label>
        <label className="upload-option upload-option--tile" htmlFor={audioId}>
          <span className="upload-option__icon">
            <PrototypeIcon.mic color="var(--accent)" />
          </span>
          <strong>{appCopy.session.attachVoice}</strong>
        </label>
      </div>
      <input
        accept="image/*"
        id={cameraId}
        capture="environment"
        className="upload-option__input"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onCamera(file);
            onClose();
          }
          event.target.value = "";
        }}
      />
      <input
        accept="image/*"
        id={imageId}
        className="upload-option__input"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImage(file);
            onClose();
          }
          event.target.value = "";
        }}
      />
      <input
        accept="audio/*"
        id={audioId}
        className="upload-option__input"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onAudio(file);
            onClose();
          }
          event.target.value = "";
        }}
      />
    </BottomSheet>
  );
}
