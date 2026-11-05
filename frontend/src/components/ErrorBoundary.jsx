import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-danger m-4">
          <h4>Something went wrong rendering this section.</h4>
          <p className="mb-0 mt-2"><strong>Error:</strong> {this.state.error?.message}</p>
          <button className="btn btn-outline-danger btn-sm mt-3" onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}