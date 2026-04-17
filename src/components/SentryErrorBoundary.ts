import * as React from 'react'
import { logError } from '../utils/log.js'
import { sanitizeError } from '../utils/security/sanitize.js'

interface Props {
  children: React.ReactNode
  /** Optional fallback component to render when an error occurs */
  fallback?: React.ReactNode
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * Error boundary component that catches React rendering errors.
 * Logs sanitized errors to prevent sensitive data exposure.
 */
export class SentryErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Sanitize the error to remove sensitive data before logging
    const sanitizedError = sanitizeError(error)
    
    // Log the sanitized error
    logError(sanitizedError)
    
    // Call optional error handler
    this.props.onError?.(sanitizedError, errorInfo)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Return custom fallback if provided, otherwise null
      return this.props.fallback ?? null
    }

    return this.props.children
  }
}

/**
 * Higher-order component that wraps a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P): React.ReactElement => {
    return React.createElement(
      SentryErrorBoundary,
      boundaryProps,
      React.createElement(Component, props)
    )
  }

  const displayName = Component.displayName || Component.name || 'Component'
  WrappedComponent.displayName = `withErrorBoundary(${displayName})`

  return WrappedComponent
}
