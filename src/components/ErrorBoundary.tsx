import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4 p-8 text-center">
          <p className="text-lg font-medium">Algo salió mal al cargar la página.</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Si usas extensiones de Chrome (bloqueadores de anuncios, traductores, etc.),
            prueba desactivarlas o abre la página en modo incógnito.
          </p>
          <button
            className="mt-2 px-4 py-2 rounded bg-primary text-primary-foreground text-sm"
            onClick={() => this.setState({ hasError: false })}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
