import React from "react";
import { BaseNode } from "./BaseNode";

export const InputNode = ({ id, data, selected }) => {
  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      styles={{
        
        bgColor: "#E3F2FD",
        hoverBgColor: "#BBDEFB",
        color: "#2196F3",
      }}
      inputs={[]} // no inputs
      outputs={[{ id: "out", color: "#4caf50" }]}
      properties={
        data.properties || [
          { label: "Source Type", value: data.sourceType || "Manual" },
          { label: "Data Format", value: data.dataFormat || "JSON" },
        ]
      }
      contextMenu={[
        {
          label: "Duplicate",
          icon: null,
          onClick: () => console.log("Duplicate Input Node", id),
        },
        {
          label: "Inspect",
          icon: null,
          onClick: () => alert(`Inspecting ${data.label}`),
        },
      ]}
    />
  );
};
