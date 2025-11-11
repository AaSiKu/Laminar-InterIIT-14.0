import React from "react";
import { TextField } from "@mui/material";

const JsonInput = ({ label, value, onChange }) => (
  <TextField
    label={label}
    value={value}
    onChange={onChange}
    fullWidth
    variant="outlined"
    size="small"
    multiline
    rows={10}
    fontFamily="monospace"
  />
);

const DefaultInput = ({ label, value, onChange, required = true}) => (
  <TextField
    label={label}
    value={value}
    onChange={onChange}
    fullWidth
    variant="outlined"
    size="small"
    required={required}
  />
);

export const PropertyInput = ({ property, onChange, required=true }) => {
  switch (property.type) {
    case "json":
      return (
        <JsonInput
          label={property.label}
          value={property.value}
          onChange={onChange}
          required={required}
        />
      );
    default:
      return (
        <DefaultInput
          label={property.label}
          value={property.value}
          onChange={onChange}
          required={required}
        />
      );
  }
};
