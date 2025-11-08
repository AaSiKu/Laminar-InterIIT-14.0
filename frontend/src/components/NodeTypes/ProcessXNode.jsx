
import React from "react";
import { BaseNode } from "./BaseNode";
import { Edit, Settings } from "@mui/icons-material";

export const ProcessXNode = ({ id, data, selected }) => {
  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      styles={{
        bgColor: "#E8F5E9",
        hoverBgColor: "#C8E6C9",
        color: "#4CAF50",
      }}
      inputs={[
        { id: "x", color: "#81c784" },
        { id: "y", color: "#81c784" },
        { id: "z", color: "#81c784" },
      ]}
      outputs={[
        { id: "u", color: "#f44336" },
        { id: "v", color: "#f44336" },
      ]}
      properties={
        data.properties || [
          { label: "A", value: data.A || "default-A" },
          { label: "B", value: data.B || "default-B" },
          { label: "C", value: data.C || "default-C" },
        ]
      }
      contextMenu={[
        {
          label: "Edit",
          icon: <Edit fontSize="small" />,
          onClick: () => alert("Edit Process X"),
        },
        {
          label: "Settings",
          icon: <Settings fontSize="small" />,
          onClick: () => alert("Settings Process X"),
        },
        {
          label: "Debug",
          icon: null,
          onClick: () => console.log("Debug Process X", id),
        },
      ]}
    />
  );
};
