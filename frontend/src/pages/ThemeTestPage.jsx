import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Alert,
  Paper,
  Stack,
  Divider,
  Switch,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  TextField,
  Select,
  MenuItem,
  Rating,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Avatar,
  AvatarGroup,
  Breadcrumbs,
  Link,
  Pagination,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Home as HomeIcon,
  Favorite as FavoriteIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

const ThemeTestPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [rating, setRating] = useState(3);
  const [checked, setChecked] = useState(true);
  const [radioValue, setRadioValue] = useState('option1');

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Theme Components Test Page
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This page showcases various theme components to verify they're working correctly.
      </Typography>

      <Divider sx={{ my: 4 }} />

      {/* Buttons Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Buttons
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
          <Button variant="contained" color="primary">
            Primary Contained
          </Button>
          <Button variant="contained" color="secondary">
            Secondary Contained
          </Button>
          <Button variant="contained" color="success">
            Success Contained
          </Button>
          <Button variant="contained" color="error">
            Error Contained
          </Button>
          <Button variant="outlined" color="primary">
            Primary Outlined
          </Button>
          <Button variant="outlined" color="secondary">
            Secondary Outlined
          </Button>
          <Button variant="text" color="primary">
            Primary Text
          </Button>
          <Button variant="soft" color="primary">
            Primary Soft
          </Button>
          <Button variant="soft" color="success">
            Success Soft
          </Button>
          <Button size="small">Small</Button>
          <Button size="medium">Medium</Button>
          <Button size="large">Large</Button>
        </Stack>
      </Box>

      {/* Chips Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Chips
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
          <Chip label="Default Chip" />
          <Chip label="Primary" color="primary" />
          <Chip label="Secondary" color="secondary" />
          <Chip label="Success" color="success" />
          <Chip label="Error" color="error" />
          <Chip label="Warning" color="warning" />
          <Chip label="Info" color="info" />
          <Chip label="Soft Primary" variant="soft" color="primary" />
          <Chip label="Outlined" variant="outlined" color="primary" />
          <Chip label="Filled" variant="filled" color="primary" />
          <Chip label="Deletable" onDelete={() => {}} />
          <Chip label="Clickable" onClick={() => {}} />
          <Chip label="Small" size="small" />
          <Chip label="Medium" size="medium" />
          <Chip label="Large" size="large" />
        </Stack>
      </Box>

      {/* Alerts Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Alerts
        </Typography>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Alert severity="error">This is an error alert!</Alert>
          <Alert severity="warning">This is a warning alert!</Alert>
          <Alert severity="info">This is an info alert!</Alert>
          <Alert severity="success">This is a success alert!</Alert>
          <Alert severity="error" variant="outlined">
            Outlined error alert
          </Alert>
          <Alert severity="success" variant="filled">
            Filled success alert
          </Alert>
        </Stack>
      </Box>

      {/* Paper Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Paper Components
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Paper elevation={1} sx={{ p: 2, minWidth: 200 }}>
            <Typography>Elevation 1</Typography>
          </Paper>
          <Paper elevation={3} sx={{ p: 2, minWidth: 200 }}>
            <Typography>Elevation 3</Typography>
          </Paper>
          <Paper elevation={6} sx={{ p: 2, minWidth: 200 }}>
            <Typography>Elevation 6</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, minWidth: 200 }}>
            <Typography>Outlined</Typography>
          </Paper>
        </Stack>
      </Box>

      {/* Form Controls Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Form Controls
        </Typography>
        <Stack spacing={3} sx={{ mb: 2 }}>
          <TextField label="Standard Text Field" variant="standard" />
          <TextField label="Outlined Text Field" variant="outlined" />
          <TextField label="Filled Text Field" variant="filled" />
          <TextField label="With Helper Text" helperText="Some helpful text" />
          
          <FormControl>
            <FormLabel>Radio Group</FormLabel>
            <RadioGroup value={radioValue} onChange={(e) => setRadioValue(e.target.value)}>
              <FormControlLabel value="option1" control={<Radio />} label="Option 1" />
              <FormControlLabel value="option2" control={<Radio />} label="Option 2" />
              <FormControlLabel value="option3" control={<Radio />} label="Option 3" />
            </RadioGroup>
          </FormControl>

          <FormControlLabel
            control={<Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />}
            label="Checkbox"
          />
          
          <FormControlLabel
            control={<Switch checked={checked} onChange={(e) => setChecked(e.target.checked)} />}
            label="Switch"
          />

          <FormControl fullWidth>
            <FormLabel>Select</FormLabel>
            <Select value="option1">
              <MenuItem value="option1">Option 1</MenuItem>
              <MenuItem value="option2">Option 2</MenuItem>
              <MenuItem value="option3">Option 3</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Rating Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Rating
        </Typography>
        <Stack spacing={2}>
          <Rating value={rating} onChange={(e, newValue) => setRating(newValue)} />
          <Rating value={4} readOnly />
          <Rating value={2.5} precision={0.5} />
        </Stack>
      </Box>

      {/* Accordion Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Accordion
        </Typography>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Accordion 1</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              This is the content of the first accordion panel. It can contain any content.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Accordion 2</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              This is the content of the second accordion panel.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Tabs Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Tabs
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Tab 1" />
            <Tab label="Tab 2" />
            <Tab label="Tab 3" />
          </Tabs>
        </Box>
        <Typography>Selected tab: {tabValue + 1}</Typography>
      </Box>

      {/* Cards Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Cards
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Card sx={{ minWidth: 275 }}>
            <CardContent>
              <Typography variant="h5" component="div">
                Card Title
              </Typography>
              <Typography color="text.secondary">
                Card content goes here
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">Action</Button>
            </CardActions>
          </Card>
          <Card sx={{ minWidth: 275 }}>
            <CardContent>
              <Typography variant="h5" component="div">
                Another Card
              </Typography>
              <Typography color="text.secondary">
                More card content
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">Learn More</Button>
            </CardActions>
          </Card>
        </Stack>
      </Box>

      {/* Avatars Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Avatars
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar>H</Avatar>
          <Avatar sx={{ bgcolor: 'primary.main' }}>JD</Avatar>
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            <PersonIcon />
          </Avatar>
          <AvatarGroup max={4}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>A</Avatar>
            <Avatar sx={{ bgcolor: 'secondary.main' }}>B</Avatar>
            <Avatar sx={{ bgcolor: 'success.main' }}>C</Avatar>
            <Avatar sx={{ bgcolor: 'error.main' }}>D</Avatar>
            <Avatar sx={{ bgcolor: 'warning.main' }}>E</Avatar>
          </AvatarGroup>
        </Stack>
      </Box>

      {/* Breadcrumbs Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Breadcrumbs
        </Typography>
        <Breadcrumbs aria-label="breadcrumb">
          <Link color="inherit" href="#">
            Home
          </Link>
          <Link color="inherit" href="#">
            Category
          </Link>
          <Typography color="text.primary">Current Page</Typography>
        </Breadcrumbs>
      </Box>

      {/* Progress Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Progress Indicators
        </Typography>
        <Stack spacing={2}>
          <CircularProgress />
          <CircularProgress color="secondary" />
          <CircularProgress size={60} />
          <LinearProgress />
          <LinearProgress color="secondary" />
          <LinearProgress variant="determinate" value={60} />
        </Stack>
      </Box>

      {/* Pagination Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Pagination
        </Typography>
        <Stack spacing={2}>
          <Pagination count={10} />
          <Pagination count={10} color="primary" />
          <Pagination count={10} color="secondary" />
          <Pagination count={10} size="small" />
          <Pagination count={10} size="large" />
        </Stack>
      </Box>
    </Container>
  );
};

export default ThemeTestPage;

