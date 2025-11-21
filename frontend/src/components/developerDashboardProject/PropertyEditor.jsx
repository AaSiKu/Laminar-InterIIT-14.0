import { Alert, Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";
import { PropertyInput } from "../PropertyInput";

const PropertyEditor = ({
  selectedNode,
  propertyDrafts,
  onPropertyChange,
  onCancel,
  onSave,
  primaryActionLabel,
}) => {
  const hasProperties = selectedNode && propertyDrafts.length > 0;

  return (
    <Paper
      elevation={0}
      sx={{
        flexBasis: { xs: "100%", lg: "26%" },
        maxWidth: { xs: "100%", lg: "26%" },
        minWidth: 300,
        flexShrink: 0,
        borderRadius: 3,
        border: "1px solid rgba(30, 58, 138, 0.2)",
        backgroundColor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.95)" : "rgba(248, 250, 252, 1)",
        display: "flex",
        flexDirection: "column",
        p: { xs: 2.25, lg: 2.75 },
        gap: 2.25,
        height: { xs: "auto", lg: "100%" },
        minHeight: { xs: "auto", lg: 480 },
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 4px 18px rgba(0, 0, 0, 0.45)"
            : "0 6px 26px rgba(30, 58, 138, 0.06)",
      }}
    >
      <Box sx={{ pt: 0.25 }}>
        <Typography
          variant="caption"
          sx={{ color: "rgba(71, 85, 105, 1)", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}
        >
          Property Editor
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "rgba(15, 23, 42, 1)", mt: 0.25 }}>
          {selectedNode?.data?.ui?.label || selectedNode?.id || "No node selected"}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(100, 116, 139, 1)", mt: 0.25 }}>
          Complete node configuration to move forward.
        </Typography>
      </Box>

      <Divider />

      {!selectedNode ? (
        <Alert severity="info">Select a node from the canvas to configure its properties.</Alert>
      ) : !hasProperties ? (
        <Alert severity="info">This node has no configurable properties.</Alert>
      ) : (
        <Stack spacing={1.75} sx={{ flexGrow: 1, overflowY: "auto", pr: 0.5, pt: 0.25 }}>
          {propertyDrafts.map((prop, index) => (
            <PropertyInput
              key={`${prop.label}-${index}`}
              property={prop}
              onChange={(event) => onPropertyChange(index, event.target.value)}
              required={false}
            />
          ))}
        </Stack>
      )}

      <Stack direction="row" spacing={1.25} justifyContent="flex-end">
        <Button variant="outlined" color="inherit" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onSave}
          disabled={!selectedNode || propertyDrafts.length === 0}
        >
          {primaryActionLabel}
        </Button>
      </Stack>
    </Paper>
  );
};

export default PropertyEditor;

