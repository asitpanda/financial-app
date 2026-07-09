import { Button as MuiButton, type ButtonProps } from '@mui/material';

export default function AppButton({ sx, ...props }: ButtonProps) {
  return (
    <MuiButton
      {...props}
      sx={[
        { borderRadius: '5px' },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}