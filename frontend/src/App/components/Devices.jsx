import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Chip,
  Grid,
  Stack
} from '@mui/material';
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeviceCard from './DeviceCard';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const { api } = useAppContext();
  const [selectedDevices, setSelectedDevices] = useState([]);

  useEffect(() => {
    let cancel = false;

    async function load() {
      const [ok, data] = await api.devicesList();
      if (!cancel && ok) setDevices(data);
    }

    load();
    return () => (cancel = true);
  }, [api]);

  const toggleDevice = (deviceId) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Devices
      </Typography>

      <Grid container spacing={2}>
        {devices.map(device => {
          const online = device.connected;
          const selected = selectedDevices.includes(device.device_id);

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={device.device_id}>
              <Card
                sx={{
                  borderRadius: 3,
                  maxWidth: 300,
                  mx: "auto",
                  boxShadow: selected ? 6 : 2,
                  transition: "all 0.2s",
                  bgcolor: selected ? "primary.dark" : "background.paper",
                  cursor: online ? "pointer" : "default",
                  "&:hover": online
                    ? { boxShadow: 8, transform: "scale(1.02)" }
                    : {}
                }}
                onClick={() => online && toggleDevice(device.device_id)}
              >
                <CardActionArea disabled={!online}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {device.name}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {online ? (
                        <>
                          <CheckCircleIcon fontSize="small" color="success" />
                          <Typography variant="body2" color="success.main">
                            Online
                          </Typography>
                        </>
                      ) : (
                        <>
                          <WarningAmberIcon fontSize="small" color="warning" />
                          <Typography variant="body2" color="warning.main">
                            Offline
                          </Typography>
                        </>
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Show selected device streams */}
      {selectedDevices.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Streams
          </Typography>

          <Stack spacing={3}>
            {selectedDevices.map(id => (
              <DeviceCard key={id} deviceId={id} />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}