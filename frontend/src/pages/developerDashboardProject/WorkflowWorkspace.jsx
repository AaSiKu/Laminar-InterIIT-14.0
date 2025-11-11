import { Alert, Box, Container, Snackbar } from "@mui/material";
import PropertyEditor from "../../components/developerDashboardProject/PropertyEditor";
import WorkflowCanvas from "../../components/developerDashboardProject/WorkflowCanvas";

const WorkflowWorkspace = ({
  nodes,
  edges,
  nodeTypes,
  selectedNode,
  propertyDrafts,
  primaryActionLabel,
  snackbar,
  onPropertyChange,
  onCancel,
  onSave,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onCloseSnackbar,
}) => {
  return (
    <Container
      maxWidth="xl"
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, lg: 2.75 },
        py: { xs: 2, lg: 2.5 },
        px: { xs: 2.25, lg: 4 },
        pb: { xs: 2.5, lg: 3 },
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flex: 1,
          gap: { xs: 2.25, lg: 3.25 },
          alignItems: "stretch",
          flexWrap: { xs: "wrap", lg: "nowrap" },
          minHeight: 0,
        }}
      >
        <PropertyEditor
          selectedNode={selectedNode}
          propertyDrafts={propertyDrafts}
          onPropertyChange={onPropertyChange}
          onCancel={onCancel}
          onSave={onSave}
          primaryActionLabel={primaryActionLabel}
        />

        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
        />
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4500}
        onClose={onCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={onCloseSnackbar} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default WorkflowWorkspace;


