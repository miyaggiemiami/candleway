import { Loader2 } from "lucide-react";

function FullPageLoader() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export { FullPageLoader };
