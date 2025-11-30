export const fetchNodeTypes = async () => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_SERVER}/schema/all`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error fetching node types:", err);
    return null;
  }
};

export const fetchNodeSchema = async (nodeName) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_SERVER}/schema/${nodeName}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const schema = await res.json();
    return schema;
  } catch (err) {
    console.error(`Error fetching schema for ${nodeName}:`, err);
    return null;
  }
};
