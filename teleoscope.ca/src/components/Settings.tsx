// mui
import { Stack, Slider, Typography, Switch } from "@mui/material";

// actions
import { useAppSelector, useAppDispatch } from "@/lib/hooks";

// custom components
import { setSettings, setColor } from "@/actions/appState";
import ColorPicker from "@/components/ColorPicker";

export default function Settings(props) {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.appState.workflow.settings);

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
          handleChange(event, value, "default_document_width")
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
          handleChange(event, value, "default_document_height")
        }
        sx={{ color: settings.color }}
      />
      <Typography>Automatically Expand Infopanel</Typography>
      <Switch
        checked={settings.defaultExpanded}
        onChange={(event) =>
          handleChange(event, event.target.checked, "defaultExpanded")
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
          handleChange(event, value, "default_title_length")
        }
        sx={{ color: settings.color }}
      />
    </Stack>
  );
}
