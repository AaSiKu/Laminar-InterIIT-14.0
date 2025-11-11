// src/components/StructuredJsonEditor.jsx
import React, { useState, useEffect } from 'react';
import { TextField, Stack, Typography, Box } from '@mui/material';

export const StructuredJsonEditor = ({ label, value, sub_schema, onChange }) => {
  const [fields, setFields] = useState({});

  // When the 'value' (JSON string) from the parent changes,
  // parse it to fill our local text fields.
  useEffect(() => {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        setFields(parsed);
      } else {
        setFields({});
      }
    } catch (e) {
      // If value is empty or invalid, just use an empty object
      setFields({});
    }
  }, [value]);

  // When a local text field changes...
  const handleFieldChange = (key, fieldValue) => {
    // 1. Update our local state
    const newFields = {
      ...fields,
      [key]: fieldValue,
    };

    // 2. Filter out any keys that have empty values
    const finalFields = {};
    for (const k in newFields) {
      if (newFields[k] !== null && newFields[k] !== "") {
        finalFields[k] = newFields[k];
      }
    }
    setFields(finalFields);

    // 3. Pass the complete, new JSON *string* back to the PropertyBar
    onChange(JSON.stringify(finalFields, null, 2));
  };

  return (
    <Box sx={{ border: '1px solid #e0e0e0', p: 2, borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Stack spacing={2}>
        {/* Loop over the sub_schema (the blueprint) to build the UI */}
        {Object.entries(sub_schema).map(([key, prop]) => (
          <TextField
            key={key}
            // Use the Pydantic title (e.g., "Bootstrap Servers")
            label={prop.title || key} 
            // The value comes from our local 'fields' state
            value={fields[key] || ''} 
            onChange={(e) => handleFieldChange(key, e.target.value)}
            size="small"
            variant="outlined"
          />
        ))}
      </Stack>
    </Box>
  );
};