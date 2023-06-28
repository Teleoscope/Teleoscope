// mui
import { Stack, Slider, Typography, Switch } from "@mui/material";

// actions
import { useAppSelector, useAppDispatch } from "@/util/hooks";

// custom components
import { setSettings, setColor } from "@/actions/windows";
import ColorPicker from "@/components/ColorPicker";
import { useStomp } from "@/components/Stomp";

export default function Settings(props) {
  const client = useStomp();
  const session_id = useAppSelector((state) => state.activeSessionID.value);
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.windows.settings);


  const handleChange = (event, value, setting) => {
    const temp = { ...settings };
    temp[setting] = value;
    dispatch(setSettings(temp));
  };

  const handleColorChange = (color) => {
    dispatch(setColor({client: client, color: color, session_id: session_id}))
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
    </Stack>
  );
}
