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

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                <DateTimePicker
                  label="Start"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: { fullWidth: true, size: "small" },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <DateTimePicker
                  label="End"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{
                    textField: { fullWidth: true, size: "small" },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <ButtonGroup
                  variant="outlined"
                  fullWidth
                  sx={{ height: "40px" }}
                >
                  <Button onClick={() => shiftRange(-1)}>
                    <ArrowBackIcon fontSize="small" /> Back a Day
                  </Button>
                  <Button onClick={() => shiftRange(1)}>
                    Forward a Day <ArrowForwardIcon fontSize="small" />
                  </Button>
                </ButtonGroup>
              </Grid>
            </Grid>
          </LocalizationProvider>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Quick Ranges
            </Typography>
            <ButtonGroup variant="contained">
              <Button
                onClick={() => {
                  setEndDate(dayjs());
                  setStartDate(dayjs().subtract(7, "day"));
                }}
              >
                7 Days
              </Button>
              <Button
                onClick={() => {
                  setEndDate(dayjs());
                  setStartDate(dayjs().subtract(24, "hour"));
                }}
              >
                24 Hours
              </Button>
              <Button
                onClick={() => {
                  setEndDate(dayjs());
                  setStartDate(dayjs().subtract(12, "hour"));
                }}
              >
                12 Hours
              </Button>
              <Button
                onClick={() => {
                  setEndDate(dayjs());
                  setStartDate(dayjs().subtract(6, "hour"));
                }}
              >
                6 Hours
              </Button>
              <Button
                onClick={() => {
                  setEndDate(dayjs());
                  setStartDate(dayjs().subtract(3, "hour"));
                }}
              >
                3 Hours
              </Button>
            </ButtonGroup>
          </Box>
        </Stack>
      </Paper>

      <Paper
        elevation={2}
        sx={{ p: 3, borderRadius: 3, bgcolor: "background.default", mb: 3 }}
      >
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          Temperature (°F)
        </Typography>
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
      </Paper>

      <Paper
        elevation={2}
        sx={{ p: 3, borderRadius: 3, bgcolor: "background.default" }}
      >
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          Humidity (%RH)
        </Typography>
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
      </Paper>
    </Container>
  );
}