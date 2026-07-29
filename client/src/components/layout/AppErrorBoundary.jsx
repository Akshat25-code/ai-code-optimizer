import React from "react";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App crashed:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "var(--bg-color, #0f172a)",
            color: "var(--fg-color, #e2e8f0)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "680px",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "14px",
              padding: "20px",
              background: "rgba(15, 23, 42, 0.45)",
            }}
          >
            <h1 style={{ margin: 0, fontSize: "1.3rem" }}>Something went wrong</h1>
            <p style={{ marginTop: "10px", opacity: 0.9 }}>
              The app hit an unexpected error. Reload to recover.
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  marginTop: "14px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "rgba(2, 6, 23, 0.55)",
                  color: "#fca5a5",
                  overflow: "auto",
                  fontSize: "0.85rem",
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              style={{
                marginTop: "14px",
                border: "none",
                borderRadius: "8px",
                background: "#0ea5e9",
                color: "#ffffff",
                padding: "10px 14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;

