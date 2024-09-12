export interface SampleUploadProps {
  onUpload(upload: File): void;
}

export function FileUpload(props: SampleUploadProps) {
  const { onUpload } = props;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    onUpload(file);
  }

  return (
    <input type="file" accept="audio/*" onChange={handleFileChange}></input>
  );
}
