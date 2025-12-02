import { Box, Avatar, AvatarGroup } from "@mui/material";

export function AvatarStack({ count }) {
  const displayCount = Math.min(count, 3);
  const extraCount = count > 3 ? count - 3 : 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <AvatarGroup
        max={3}
        sx={{
          '& .MuiAvatar-root': {
            width: 28,
            height: 28,
            fontSize: '0.625rem',
            border: '2px solid',
            borderColor: 'background.paper',
            ml: -0.5,
            '&:first-of-type': {
              ml: 0,
            },
          },
        }}
      >
      {Array.from({ length: displayCount }).map((_, i) => (
          <Avatar
            key={i}
            src={`https://i.pravatar.cc/40?img=${i + 10}`}
            alt="Member"
          />
      ))}
      {extraCount > 0 && (
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontSize: '0.625rem',
              fontWeight: 600,
            }}
          >
            +{extraCount}
          </Avatar>
      )}
      </AvatarGroup>
    </Box>
  );
}

