import React, { useRef } from 'react';
import '../styles/UploadForm.css';

function UploadForm({ onUpload, loading }) {
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const file = fileInputRef.current.files[0];
    
    if (!file) {
      alert('Please select a CSV file');
      return;
    }

    if (!file.name.endsWith('.csv')) {
      alert('Please select a valid CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('csv_file', file);

    onUpload(formData);
    
    // Clear the file input after a short delay to allow the upload to start
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 100);
  };

  return (
    <div className="upload-form">
      <h2>Upload Equipment Data</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="csv-file">Select CSV File:</label>
          <input
            ref={fileInputRef}
            type="file"
            id="csv-file"
            accept=".csv"
            disabled={loading}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
        <p className="help-text">
          Expected columns: Equipment Name, Type, Flowrate, Pressure, Temperature
        </p>
      </form>
    </div>
  );
}

export default UploadForm;
