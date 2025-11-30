import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  IconButton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import "../css/createworkflow.css";

// Stepper steps configuration
const steps = [
  { id: 1, label: "Basic Information", subLabel: "Board type" },
  { id: 2, label: "Columns / Stages", subLabel: null },
  { id: 3, label: "Background", subLabel: null },
  { id: 4, label: "Tags / Labels", subLabel: null },
  { id: 5, label: "Invite your team", subLabel: null },
];

export default function Create() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    members: "",
  });

  const handleClose = () => {
    navigate(-1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const getStepStatus = (stepId) => {
    if (stepId < currentStep) return "completed";
    if (stepId === currentStep) return "current";
    return "pending";
  };

  return (
    <div className="create-container">
      {/* Left Sidebar */}
      <div className="create-sidebar">
        <div className="create-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="create-logo-text">Laminar</span>
        </div>

        <div className="create-stepper">
          <Typography className="create-stepper-title">Details</Typography>
          
          <div className="create-steps">
            {steps.map((step, index) => (
              <div key={step.id} className="create-step-wrapper">
                <div className={`create-step ${getStepStatus(step.id)}`}>
                  <div className="create-step-indicator">
                    {getStepStatus(step.id) === "completed" ? (
                      <CheckCircleIcon className="create-step-check" />
                    ) : (
                      <div className={`create-step-number ${getStepStatus(step.id)}`}>
                        {step.id}
                      </div>
                    )}
                  </div>
                  <div className="create-step-content">
                    <span className={`create-step-label ${getStepStatus(step.id)}`}>
                      {step.label}
                    </span>
                    {step.subLabel && (
                      <span className="create-step-sublabel">{step.subLabel}</span>
                    )}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`create-step-line ${getStepStatus(step.id)}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="create-main">
        {/* Header */}
        <div className="create-header">
          <Typography className="create-header-title">Create Workflow</Typography>
          <IconButton className="create-close-btn" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </div>

        {/* Form Content */}
        <div className="create-content">
          <div className="create-form-section">
            <Typography className="create-form-title">Basic Information</Typography>

            <div className="create-form">
              {/* Name Field */}
              <div className="create-field">
                <label className="create-field-label">Name</label>
                <input
                  type="text"
                  className="create-input"
                  placeholder="Name of Board"
                  value={formData.name}
                  onChange={handleInputChange("name")}
                />
              </div>

              {/* Description Field */}
              <div className="create-field">
                <label className="create-field-label">Description</label>
                <textarea
                  className="create-textarea"
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={handleInputChange("description")}
                  rows={4}
                />
              </div>

              {/* Members Field */}
              <div className="create-field">
                <label className="create-field-label">Members</label>
                <div className="create-select-wrapper">
                  <select
                    className="create-select"
                    value={formData.members}
                    onChange={handleInputChange("members")}
                  >
                    <option value="">Select for Control</option>
                    <option value="admin">Admin</option>
                    <option value="developer">Developer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <KeyboardArrowDownIcon className="create-select-icon" />
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="create-buttons">
                <Button
                  variant="outlined"
                  className="create-back-btn"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  className="create-next-btn"
                  onClick={handleNext}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

