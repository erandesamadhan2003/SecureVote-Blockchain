import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    // optionally: send to remote logging
    // console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-6 bg-red-50 text-red-800 rounded">
          <h3 className="font-semibold">Something went wrong</h3>
          <pre className="mt-2 text-xs text-gray-700">{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
