
import React from "react";
import { BaseNode } from "./BaseNode";

export const OutNode = ({ id, data, selected }) => {
  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      styles={{
        bgColor: "#F3E5F5",
        hoverBgColor: "#E1BEE7",
        color: "#9C27B0",
      }}
      // ✅ FIXED: Changed handle id from "input" to "end" to match edge definition
      inputs={[{ id: "end", color: "#00acc1" }]}
      outputs={[]} // no outputs
      properties={
        data.properties || [
          { label: "Destination", value: data.destination || "Database" },
          { label: "Status", value: data.status || "Pending" },
        ]
      }
      contextMenu={[
        {
          label: "Mark Complete",
          icon: null,
          onClick: () => console.log("Completed Output Node", id),
        },
        {
          label: "Log Output",
          icon: null,
          onClick: () => alert("Output logged!"),
        },
      ]}
    />
  );
};
