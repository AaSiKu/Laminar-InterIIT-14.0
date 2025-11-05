import React from "react";
import { BaseNode } from "../BaseNode";
import { Position } from "@xyflow/react";
import { Edit, Settings } from "@mui/icons-material";

export const ProcessXNode = (props) => {
  return (
    <BaseNode
      {...props}
      styles={{
        bgColor: "#e3f2fd",
        hoverBgColor: "#bbdefb",
        color: "#0d47a1",
      }}
      inputs={[
        { id: "x", color: "#4caf50" },
        { id: "y", color: "#4caf50" },
        { id: "z", color: "#4caf50" },
      ]}
      outputs={[
        { id: "u", color: "#f44336" },
        { id: "v", color: "#f44336" },
      ]}
      properties={[
        { label: "A", value: "10" },
        { label: "B", value: "20" },
        { label: "C", value: "30" },
      ]}
      contextMenu={[
        { label: "Edit", icon: <Edit fontSize="small" />, onClick: () => alert("Edit D") },
        { label: "Settings", icon: <Settings fontSize="small" />, onClick: () => alert("Settings E") },
      ]}
    />
  );
};
