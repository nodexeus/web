import { spacing } from 'styles/utils.spacing.styles';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  inline?: boolean;
}

export const LoadingState = ({ 
  message = 'Loading...', 
  size = 'medium',
  inline = false 
}: LoadingStateProps) => {
  const sizeStyles = {
    small: { fontSize: '14px', padding: '8px' },
    medium: { fontSize: '16px', padding: '16px' },
    large: { fontSize: '18px', padding: '24px' }
  };
  
  const spinnerSize = {
    small: '16px',
    medium: '24px',
    large: '32px'
  };
  
  const containerStyle = {
    display: inline ? 'inline-flex' : 'flex',
    alignItems: 'center',
    justifyContent: inline ? 'flex-start' : 'center',
    gap: '8px',
    color: '#666',
    ...sizeStyles[size]
  };
  
  const spinnerStyle = {
    width: spinnerSize[size],
    height: spinnerSize[size],
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };
  
  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={spinnerStyle}></div>
      <span>{message}</span>
    </div>
  );
};