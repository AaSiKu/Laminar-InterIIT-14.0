import { Card, CardContent, Box, Typography, AvatarGroup, Avatar, IconButton, Chip } from "@mui/material";
import { MoreHoriz as MoreHorizIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const WorkflowCard = ({ workflow, isSelected, onClick }) => {
  const theme = useTheme();

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: "pointer",
        borderRadius: "24px",
        bgcolor: isSelected ? 'action.selected' : 'background.elevation1',
        boxShadow: "none",
        outline: "none",
        transition: "all 0.2s ease",
        width: "100%",
        maxWidth: "492px",
        minHeight: "139px",
        "&:hover": {
          bgcolor: 'action.hover',
        },
      }}
    >
      <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", mb: 0.5, color: "text.primary" }}>
              {workflow.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8125rem", mb: 2 }}>
              {workflow.category} · {workflow.location}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
              <AvatarGroup max={5} sx={{ "& .MuiAvatar-root": { width: 24, height: 24, fontSize: "0.625rem", border: `2px solid ${theme.palette.background.paper}` } }}>
                {workflow.team.map((member, index) => (
                  <Avatar 
                    key={index}
                    src={member.avatar}
                    alt={member.name}
                    sx={{ 
                      width: 24, 
                      height: 24,
                    }}
                    title={member.name}
                  />
                ))}
              </AvatarGroup>
              <Chip
                label={workflow.status}
                size="small"
                color={workflow.status === "Active" ? "success" : "default"}
                variant="soft"
                sx={{
                  fontWeight: 500,
                  fontSize: "0.6875rem",
                  height: "22px",
                  borderRadius: "2px",
                }}
              />
            </Box>
          </Box>
          <IconButton size="small" sx={{ color: "text.secondary", ml: 1 }}>
            <MoreHorizIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default WorkflowCard;

