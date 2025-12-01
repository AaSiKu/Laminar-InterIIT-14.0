import { Box, IconButton } from "@mui/material";
import { Add as AddIcon, Undo as UndoIcon, Redo as RedoIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const BottomToolbar = ({ onAddClick, onUndoClick, onRedoClick }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 0.5,
        bgcolor: 'background.elevation1',
        borderRadius: "8px",
        padding: "4px 8px",
        boxShadow: theme.shadows[2],
        zIndex: 1000,
      }}
    >
      <IconButton
        onClick={onAddClick}
        sx={{
          bgcolor: 'background.paper',
          color: "text.primary",
          "&:hover": { bgcolor: 'action.hover' },
          width: 30,
          height: 30,
          borderRadius: "6px",
        }}
      >
        <AddIcon sx={{ fontSize: 18 }} />
      </IconButton>

      <Box
        sx={{
          width: "1px",
          bgcolor: 'divider',
          mx: 0.3,
        }}
      />

      <IconButton
        onClick={onUndoClick}
        sx={{
          color: "text.primary",
          "&:hover": { bgcolor: 'action.hover' },
          width: 30,
          height: 30,
          borderRadius: "6px",
        }}
      >
        <UndoIcon sx={{ fontSize: 18 }} />
      </IconButton>

      <IconButton
        onClick={onRedoClick}
        sx={{
          color: "text.primary",
          "&:hover": { bgcolor: 'action.hover' },
          width: 30,
          height: 30,
          borderRadius: "6px",
        }}
      >
        <RedoIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
};

export default BottomToolbar;

