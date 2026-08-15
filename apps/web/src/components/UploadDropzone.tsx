import { useRef, useState, DragEvent, ChangeEvent, ReactNode } from "react";
import { UploadCloud } from "lucide-react";

interface UploadDropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  children: ReactNode;
}

/** Wraps the file browser area so drag-and-drop works anywhere over it, in addition to the explicit Upload button. */
export function UploadDropzone({ onFiles, disabled, children }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    if (disabled) return;
    if (e.dataTransfer.types.includes("Files")) {
      dragCounter.current += 1;
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  }

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5">
          <div className="flex flex-col items-center gap-2 text-primary">
            <UploadCloud className="h-10 w-10" />
            <p className="font-medium">Drop files to upload</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function UploadButtonInput({
  onFiles,
  disabled,
  children,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  children: (openPicker: () => void) => ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    e.target.value = "";
  }

  return (
    <>
      <input ref={inputRef} type="file" multiple hidden disabled={disabled} onChange={handleChange} />
      {children(() => inputRef.current?.click())}
    </>
  );
}
