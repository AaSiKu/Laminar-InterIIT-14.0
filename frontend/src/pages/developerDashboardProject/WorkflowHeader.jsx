import { AppBar, Box, Toolbar, Typography } from "@mui/material";
import WorkflowStepper from "../../components/developerDashboardProject/WorkflowStepper";

const WorkflowHeader = ({ workflowName, nodes, selectedNodeId, onSelectNode }) => {
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        backdropFilter: "blur(6px)",
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 46, md: 52 },
          px: { xs: 1.75, md: 3, lg: 4 },
          py: { xs: 0.25, md: 0.4 },
          display: "flex",
          alignItems: "center",
          justifyContent: { xs: "flex-start", md: "center" },
          flexWrap: { xs: "wrap", md: "nowrap" },
          gap: { xs: 1.25, md: 2.5 },
          position: "relative",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.25,
            flex: { xs: "1 1 100%", md: "0 0 auto" },
            textAlign: { xs: "center", md: "left" },
            zIndex: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "rgba(71, 85, 105, 1)",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {/* Workflow */}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "rgba(15, 23, 42, 1)" }}>
            {/* {workflowName} */}
          </Typography>
        </Box>

        <Box
          sx={{
            order: { xs: 2, md: 0 },
            width: { xs: "100%", md: "auto" },
            display: "flex",
            justifyContent: "center",
            position: { md: "absolute" },
            left: { md: "50%" },
            top: { md: "50%" },
            transform: { md: "translate(-50%, -50%)" },
            pointerEvents: { md: "none" },
            zIndex: 2,
          }}
        >
          <Box
            sx={{
              pointerEvents: "auto",
              width: "100%",
              maxWidth: { xs: "100%", md: 720 },
              display: "flex",
              justifyContent: "center",
            }}
          >
            <WorkflowStepper
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          </Box>
        </Box>

        <Box
          aria-hidden
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            gap: 0.25,
            visibility: "hidden",
            zIndex: 1,
          }}
        >
          <Typography variant="caption">Workflow</Typography>
          <Typography variant="subtitle1">{workflowName}</Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default WorkflowHeader;


