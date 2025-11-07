import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
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
    let timeoutId = null;

    async function pollDevices() {
      if (cancel) return;

      const [ok, data] = await api.devicesList();
      if (!cancel && ok) {
        setDevices(data);
      }

      // Schedule next check only after the request completes
      timeoutId = setTimeout(pollDevices, 5000);
    }

    pollDevices();

    return () => {
      cancel = true;
      clearTimeout(timeoutId);
    };
  }, [api]);

  const toggleDevice = (device) => {
    setSelectedDevices(prev => {
      const alreadySelected = prev.some(d => d.device_id === device.device_id);
      if (alreadySelected) {
        return prev.filter(d => d.device_id !== device.device_id);
      } else {
        return [...prev, device];
      }
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Devices
      </Typography>

      {/* DEVICES SELECTION GRID */}
      <Grid container spacing={2}>
        {devices.map(device => {
          const online = device.connected;
          const selected = selectedDevices.some(d => d.device_id === device.device_id);

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={device.device_id}>
              <Card
                sx={{
                  height: 120,
                  borderRadius: 3,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  boxShadow: selected ? 6 : 2,
                  transition: "all 0.2s",
                  bgcolor: selected ? "primary.dark" : "background.paper",
                  cursor: online ? "pointer" : "default",
                  "&:hover": online ? {
                    boxShadow: 8,
                    transform: "scale(1.03)"
                  } : {}
                }}
                onClick={() => online && toggleDevice(device)}
              >
                <CardActionArea disabled={!online} sx={{ height: "100%" }}>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {device.name}
                    </Typography>
                    <Stack direction="row" justifyContent="center" spacing={1}>
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

      {/* ACTIVE STREAM VIEW */}
      {selectedDevices.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Live Streams
          </Typography>

          <Grid container spacing={3}>
            {selectedDevices.map(device => (
              <Grid item xs={12} sm={12} md={6} lg={4} key={device.device_id}>
                <DeviceCard device={device} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}