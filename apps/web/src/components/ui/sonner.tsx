import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "bg-background text-foreground border shadow-lg",
        },
      }}
    />
  );
}

export { toast } from "sonner";
