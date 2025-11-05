
import React from "react";
import { BaseNode } from "./BaseNode";

export const DecisionNode = ({ id, data, selected }) => (
  <BaseNode
    id={id}
    data={data}
    selected={selected}
    styles={{
      bgColor: "#f3e5f5",
      hoverBgColor: "#e1bee7",
      color: "#4a148c",
      borderColor: "#7b1fa2",
      minWidth: 140,
      minHeight: 140,
      borderRadius: 1, // Less rounded for diamond look
      // Note: True diamond shape would require custom component
    }}
    inputs={[{ id: "input1", color: "#7b1fa2", top: "50%" }]}
    outputs={[
      { id: "yes", color: "#43a047", top: "30%" },
      { id: "no", color: "#ef5350", top: "70%" },
    ]}
    properties={
      data.properties || [
        { label: "Condition", value: data.condition || "x > 10" },
        { label: "Path", value: data.path || "Yes/No" },
      ]
    }
  />
);
