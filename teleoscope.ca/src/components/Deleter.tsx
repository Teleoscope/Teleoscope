import LoadingButton from "@mui/lab/LoadingButton";
import { useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton } from "@mui/material";

export default function Deleter({ callback, color }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    setLoading(true);
    callback();
  };

  if (loading) {
    return <LoadingButton loading={true} size="small" />;
  }

  return (
    <IconButton onClick={handleDelete} size="small">
      <DeleteIcon
        sx={{
          fontSize: 18, // smaller icon size
          "&:hover": {
            color: color,
          },
        }}
      />
    </IconButton>
  );
}
