export const fetchTemplates = async () => {
  // Real API call placeholder:
  // const response = await fetch('/api/templates');
  // const data = await response.json();
  // return data;

  return [
    { id: "custom", name: "Custom Workflow" },
    { id: "sales", name: "MDTR & Throughput" },
    { id: "proposal", name: "Latency Check" },
    { id: "invoice", name: "Crash Reports" },
  ];
};

// Fetches a list of existing workflow files.
export const fetchWorkflows = async (skip = 0, limit = 3) => {
  const response = await fetch(
    `${
      import.meta.env.VITE_API_SERVER
    }/overview/workflows/?skip=${skip}&limit=${limit}`,
    { credentials: "include" }
  );
  const data = await response.json();
  return data;
};

// Create web - socket to fetch notifications and actions
export const fetchNotifications = async () => {
  const ws = new WebSocket(`${import.meta.env.VITE_WS_SERVER}/ws/pipeline`);

  // To test:
  // ws.onopen = () => {
  // console.log("Notifications WS connected");
  // };
  ws.onerror = (err) => {
    console.error("WebSocket error:", err);
  };
  return ws;
};

// Fetches overview statistics data.
export const fetchOverviewData = async () => {
  const response = await fetch(
    `${import.meta.env.VITE_API_SERVER}/overview/kpi`,
    { credentials: "include" }
  );
  const data = await response.json();
  console.log(data)
  return data
};
