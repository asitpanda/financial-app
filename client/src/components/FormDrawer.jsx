import React from "react";
import { Box, Drawer, Typography } from "@mui/material";
import Button from "./common/AppButton";

export default function FormDrawer({
  open,
  onClose,
  onSubmit,
  title,
  submitLabel,
  children,
  width = { xs: "100vw", sm: 640, md: 760 },
  headerHeight = 80,
  footerHeight = 64,
  bodyPadding = 3,
  cancelLabel = "Cancel",
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width,
          maxWidth: "100vw",
        },
      }}
      PaperProps={{
        sx: {
          width,
          maxWidth: "100vw",
          overflow: "hidden",
        },
      }}
    >
      <Box component="form" noValidate onSubmit={onSubmit} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            height: headerHeight,
            minHeight: headerHeight,
            px: 2,
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            p: bodyPadding,
            overflowY: "auto",
            "& .drawer-form-field": {
              minHeight: 72,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
            },
            "& .drawer-form-field .MuiFormHelperText-root": {
              minHeight: 20,
            },
            "& .drawer-form-field .MuiInputBase-root.MuiInputBase-sizeSmall": {
              minHeight: 40,
            },
          }}
        >
          {children}
        </Box>

        <Box
          sx={{
            height: footerHeight,
            minHeight: footerHeight,
            px: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button type="button" variant="outlined" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" variant="contained">
              {submitLabel}
            </Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
