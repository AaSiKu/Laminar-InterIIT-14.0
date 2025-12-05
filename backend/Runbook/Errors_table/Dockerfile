# Use an official Python image as the base
FROM pathwaycom/pathway:latest

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file into the container
# COPY requirements.txt .

# Install the required Python packages
# RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code into the container
COPY . .

# Expose the port the application will run on
EXPOSE 8000

# Command to run the application
CMD ["python", "app.py"]