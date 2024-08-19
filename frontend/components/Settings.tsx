// mui
import { Stack, Slider, Typography, Switch } from "@mui/material";

// actions
import { useAppSelector, useAppDispatch } from "@/util/hooks";

// custom components
import { setSettings, setColor } from "@/actions/windows";
import ColorPicker from "@/components/ColorPicker";

export default function Settings(props) {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.windows.settings);

  const handleChange = (event, value, setting) => {
    const temp = { ...settings };
    temp[setting] = value;
    dispatch(setSettings(temp));
  };

  const handleColorChange = (color) => {
    dispatch(setColor({color: color}))
  };
  
          
        
          

  return (
    <Stack>
      <Typography>Dropped item width</Typography>
      <Slider
        aria-label="default_document_width"
        defaultValue={settings.default_document_width}
        valueLabelDisplay="auto"
        step={25}
        marks
        min={50}
        max={500}
        onChangeCommitted={(event, value) =>
          handleChange(event, { workspace: {settings: {document_width: value}}})
        }
        sx={{ color: settings.color }}

      />
      <Typography>Dropped item height</Typography>
      <Slider
        aria-label="default_document_height"
        defaultValue={settings.default_document_height}
        valueLabelDisplay="auto"
        step={25}
        marks
        min={30}
        max={500}
        onChangeCommitted={(event, value) =>
          handleChange(event, { workspace: {settings: {document_height: value}}})
        }
        sx={{ color: settings.color }}
      />
      <Typography>Automatically Expand Infopanel</Typography>
      <Switch
        checked={settings.defaultExpanded}
        onChange={(event, value) =>
          handleChange(event, { workspace: {settings: {expanded: value}}})
        }
        color="primary"
        sx={{
          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
            backgroundColor: settings.color,
          },
          ".MuiSwitch-colorPrimary": { color: settings.color },
        }}
      />
      <Typography>Workflow Color</Typography>
      <ColorPicker
        defaultColor={settings.color}
        onChange={handleColorChange}
      ></ColorPicker>
      <Typography>Title Length</Typography>
      <Slider
        aria-label="default_title_length"
        defaultValue={settings.default_title_length}
        valueLabelDisplay="auto"
        step={1}
        min={10}
        max={200}
        onChangeCommitted={(event, value) =>
          handleChange(event, { workflow: {settings: {title_length: value}}})
        }
        sx={{ color: settings.color }}
      />
    </Stack>
  );
}
