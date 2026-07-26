import React from "react";
import { Box } from "@mui/material";

interface AuthTabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export default function AuthTabPanel({
  children,
  value,
  index,
  ...other
}: AuthTabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null}
    </div>
  );
}
