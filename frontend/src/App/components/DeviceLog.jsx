import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { useAppContext } from "../../contexts/AppContext";
import { useEffect, useState } from "react";
import { LineChart } from "@mui/x-charts";
import {
  Box,
  Button,
  ButtonGroup,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function DeviceLog({ deviceId }) {
  const { api } = useAppContext();
  const [log, setLog] = useState(null);
  const [startDate, setStartDate] = useState(dayjs().subtract(24, "hour"));
  const [endDate, setEndDate] = useState(dayjs());

  useEffect(() => {
    let cancel = false;

    async function fetchLogs() {
      const [ok, data] = await api.devicesLog(
        deviceId,
        startDate.toDate().toISOString(),
        endDate.toDate().toISOString()
      );
      if (!cancel && ok && Array.isArray(data)) {
        setLog(
          data.map((log) => ({
            id: log.time,
            time: new Date(log.time),
            humidity: Number(log.data.humidity),
            temperature: Number(log.data.temperature),
          }))
        );
      }
    }

    fetchLogs();
    return () => (cancel = true);
  }, [deviceId, startDate, endDate, api]);

  const shiftRange = (days) => {
    setStartDate((prev) => prev.add(days, "day"));
    setEndDate((prev) => prev.add(days, "day"));
  };

  const setRange = (hours) => {
    setEndDate(dayjs());
    setStartDate(dayjs().subtract(hours, "hour"));
  };

  return (
    <Container maxWidth="xl">
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 3,
          bgcolor: "background.paper",
          mb: 3,
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Device Log Viewer
          </Typography>

          {/* Date Pickers */}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="Start"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: { fullWidth: true, size: "small" },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="End"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{
                    textField: { fullWidth: true, size: "small" },
                  }}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>

          {/* Shift Buttons */}
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={2}
          >
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => shiftRange(-1)}
            >
              Back a Day
            </Button>
            <Button
              variant="outlined"
              endIcon={<ArrowForwardIcon />}
              onClick={() => shiftRange(1)}
            >
              Forward a Day
            </Button>
          </Stack>

          {/* Quick Ranges */}
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
          >
            <ButtonGroup variant="contained">
              <Button onClick={() => setRange(7 * 24)}>Last 7 Days</Button>
              <Button onClick={() => setRange(24)}>Last 24 Hours</Button>
              <Button onClick={() => setRange(12)}>Last 12 Hours</Button>
              <Button onClick={() => setRange(6)}>Last 6 Hours</Button>
              <Button onClick={() => setRange(3)}>Last 3 Hours</Button>
            </ButtonGroup>
          </Stack>
        </Stack>
      </Paper>

      {/* Temperature Chart */}
      <Paper
        elevation={2}
        sx={{ p: 3, borderRadius: 3, bgcolor: "background.default", mb: 3 }}
      >
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          Temperature (°F)
        </Typography>
        <Box
          sx={{
            overflow: "hidden",
            touchAction: "manipulation", // ✅ allow vertical page scroll + zoom
            WebkitOverflowScrolling: "touch",
            "& canvas": {
              touchAction: "auto !important", // ← forces browser to handle pinch
            },
          }}
        >
          <LineChart
            xAxis={[{ dataKey: "time", scaleType: "time", label: "Time" }]}
            series={[
              {
                id: "temp",
                dataKey: "temperature",
                label: "Temperature (°F)",
                color: "#ff5252",
                showMark: false,
              },
            ]}
            dataset={log || []}
            height={300}
            grid={{ vertical: true, horizontal: true }}
          />
        </Box>
      </Paper>

      {/* Humidity Chart */}
      <Paper
        elevation={2}
        sx={{ p: 3, borderRadius: 3, bgcolor: "background.default" }}
      >
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          Humidity (%RH)
        </Typography>
        <Box
          sx={{
            overflow: "hidden",
            touchAction: "manipulation", // ✅ allow vertical page scroll + zoom
            WebkitOverflowScrolling: "touch",
            "& canvas": {
              touchAction: "auto !important", // ← forces browser to handle pinch
            },
          }}
        >
        <LineChart
          xAxis={[{ dataKey: "time", scaleType: "time", label: "Time" }]}
          series={[
            {
              id: "hum",
              dataKey: "humidity",
              label: "Humidity (%RH)",
              color: "#42a5f5",
              showMark: false,
            },
          ]}
          dataset={log || []}
          height={300}
          grid={{ vertical: true, horizontal: true }}
        />
        </Box>
      </Paper>
    </Container>
  );
}