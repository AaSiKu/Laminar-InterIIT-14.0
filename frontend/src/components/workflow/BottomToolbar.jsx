import { Box, IconButton } from "@mui/material";
import { Add as AddIcon, Undo as UndoIcon, Redo as RedoIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const BottomToolbar = ({ onAddClick, onUndoClick, onRedoClick, addDisabled = false, undoDisabled = false, redoDisabled = false, onHoverChange }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 52,
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
        disabled={addDisabled}
        onMouseEnter={() => onHoverChange && onHoverChange('add')}
        onMouseLeave={() => onHoverChange && onHoverChange(null)}
        sx={{
          bgcolor: addDisabled ? 'action.disabledBackground' : 'background.paper',
          color: addDisabled ? 'text.disabled' : "text.primary",
          "&:hover": { bgcolor: addDisabled ? 'action.disabledBackground' : 'action.hover' },
          width: 30,
          height: 30,
          borderRadius: "6px",
          cursor: addDisabled ? "not-allowed" : "pointer",
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
        disabled={undoDisabled}
        onMouseEnter={() => onHoverChange && onHoverChange('undo')}
        onMouseLeave={() => onHoverChange && onHoverChange(null)}
        sx={{
          color: undoDisabled ? 'text.disabled' : "text.primary",
          "&:hover": { bgcolor: undoDisabled ? "transparent" : 'action.hover' },
          width: 30,
          height: 30,
          borderRadius: "6px",
          cursor: undoDisabled ? "not-allowed" : "pointer",
        }}
      >
        <UndoIcon sx={{ fontSize: 18 }} />
      </IconButton>

      <IconButton
        onClick={onRedoClick}
        disabled={redoDisabled}
        onMouseEnter={() => onHoverChange && onHoverChange('redo')}
        onMouseLeave={() => onHoverChange && onHoverChange(null)}
        sx={{
          color: redoDisabled ? 'text.disabled' : "text.primary",
          "&:hover": { bgcolor: redoDisabled ? "transparent" : 'action.hover' },
          width: 30,
          height: 30,
          borderRadius: "6px",
          cursor: redoDisabled ? "not-allowed" : "pointer",
        }}
      >
        <RedoIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
};

export default BottomToolbar;

