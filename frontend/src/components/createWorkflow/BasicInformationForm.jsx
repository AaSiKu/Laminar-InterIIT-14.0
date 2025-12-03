import { Box, Typography, TextField, MenuItem, Select, FormControl, IconButton } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
import aiIcon from "../../assets/ai_icon.svg";

const BasicInformationForm = ({ formData, onInputChange, onFileChange }) => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Name Field */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography
          component="label"
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          Name
        </Typography>
        <TextField
          fullWidth
          placeholder="Name"
          value={formData.name}
          onChange={onInputChange("name")}
          variant="filled"
          InputProps={{
            disableUnderline: true,
          }}
          sx={{
            "& .MuiFilledInput-root": {
              bgcolor: "background.elevation2",
              borderRadius: 2,
              "&:hover": { bgcolor: "background.elevation1" },
              "&.Mui-focused": {
                bgcolor: "background.elevation1",
                boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
              },
            },
            "& .MuiFilledInput-input": {
              py: 1.5,
              px: 2,
              fontSize: "0.875rem",
              "&::placeholder": { color: "text.secondary", opacity: 1 },
            },
          }}
        />
      </Box>

      {/* Document Upload Field */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography
          component="label"
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          Upload Document
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            component="label"
            htmlFor="document-upload"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              bgcolor: "background.elevation2",
              borderRadius: 2,
              py: 1.5,
              px: 2,
              cursor: "pointer",
              border: "1px dashed",
              borderColor: "divider",
              transition: "all 0.2s ease",
              flex: 1,
              maxWidth: "70%",
              "&:hover": {
                bgcolor: "background.elevation1",
                borderColor: "primary.main",
              },
            }}
          >
            <input
              id="document-upload"
              type="file"
              hidden
              onChange={onFileChange}
              accept=".pdf,.doc,.docx,.txt"
            />
            <UploadFileIcon
              sx={{
                color: formData.document ? "primary.main" : "text.secondary",
                fontSize: 20,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: formData.document ? "text.primary" : "text.secondary",
                flex: 1,
              }}
            >
              {formData.document
                ? formData.document.name
                : "Click to upload from device"}
            </Typography>
            {formData.document && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileChange({ target: { files: [] } });
                  const fileInput = document.getElementById("document-upload");
                  if (fileInput) {
                    fileInput.value = "";
                  }
                }}
                sx={{
                  color: "text.secondary",
                  "&:hover": { color: "error.main" },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          <Box
            component="img"
            src={aiIcon}
            alt="AI Icon"
            sx={{
              width: 38,
              height: 38,
              flexShrink: 0,
            }}
          />
        </Box>
      </Box>

      {/* Description Field */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography
          component="label"
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          Description
        </Typography>
        <TextField
          fullWidth
          placeholder="Description"
          value={formData.description}
          onChange={onInputChange("description")}
          variant="filled"
          multiline
          rows={4}
          InputProps={{
            disableUnderline: true,
          }}
          sx={{
            "& .MuiFilledInput-root": {
              bgcolor: "background.elevation2",
              borderRadius: 2,
              alignItems: "flex-start",
              "&:hover": { bgcolor: "background.elevation1" },
              "&.Mui-focused": {
                bgcolor: "background.elevation1",
                boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
              },
            },
            "& .MuiFilledInput-input": {
              py: 1.5,
              px: 2,
              fontSize: "0.875rem",
              "&::placeholder": { color: "text.secondary", opacity: 1 },
            },
          }}
        />
      </Box>

      {/* Members Field */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography
          component="label"
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          Members
        </Typography>
        <FormControl fullWidth variant="filled">
          <Select
            value={formData.members}
            onChange={onInputChange("members")}
            displayEmpty
            disableUnderline
            IconComponent={KeyboardArrowDownIcon}
            sx={{
              bgcolor: "background.elevation2",
              borderRadius: 2,
              "&:hover": { bgcolor: "background.elevation1" },
              "&.Mui-focused": {
                bgcolor: "background.elevation1",
                boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
              },
              "& .MuiSelect-select": {
                py: 1.5,
                px: 2,
                fontSize: "0.875rem",
                color: formData.members ? "text.primary" : "text.secondary",
              },
              "& .MuiSelect-icon": {
                color: "text.secondary",
                right: 12,
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: { zIndex: 10001 },
              },
            }}
          >
            <MenuItem value="" disabled>
              Select members
            </MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="developer">Developer</MenuItem>
            <MenuItem value="viewer">Viewer</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

export default BasicInformationForm;

