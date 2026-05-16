import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Log } from 'logging_middleware';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error);
    Log('frontend', 'fatal', 'component', `ErrorBoundary caught: ${msg}`).catch(() => {});
  }

  handleReset = (): void => {
    this.setState({ hasError: false, message: '' });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="200px"
          gap={2}
          p={4}
        >
          <Typography variant="h6" color="error">
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {this.state.message}
          </Typography>
          <Button variant="contained" onClick={this.handleReset}>
            Try again
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
