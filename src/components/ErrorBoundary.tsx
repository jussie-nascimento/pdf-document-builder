import React, { Component, ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isRemoveChild = this.state.error?.toString().includes("removeChild");

      return (
        <Alert variant="destructive" className="m-4 max-w-2xl mx-auto shadow-lg">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">Algo deu errado no aplicativo!</AlertTitle>
          <AlertDescription className="space-y-3 mt-2">
            {isRemoveChild && (
              <p className="text-sm font-medium text-amber-200 bg-amber-900/30 p-2 rounded">
                💡 Este erro costuma acontecer quando a tradução automática do navegador (Google Tradutor) altera a página.
              </p>
            )}

            <div className="whitespace-pre-wrap break-words text-xs font-mono bg-destructive/10 p-4 rounded-md max-h-48 overflow-auto border border-destructive/20">
              {this.state.error && this.state.error.toString()}
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={this.handleReload} className="bg-background text-foreground">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar Página
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
