import { useState } from "react";
import { Box } from "@mui/material";
import DetailsModal from "../components/DetailsModal";

const TestPage = () => {
  const [modalOpen, setModalOpen] = useState(true);

  const handleSave = (data) => {
    console.log("Saved data:", data);
    // You can add your save logic here
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <DetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        formData={{}}
        onSave={handleSave}
      />
    </Box>
  );
};

export default TestPage;

