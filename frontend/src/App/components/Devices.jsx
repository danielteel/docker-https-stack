import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Card } from '@/components/ui/card';
import DeviceCard from './DeviceCard';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const { api } = useAppContext();
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);

  useEffect(() => {
    let timeoutId = null;
    let cancel = false;

    async function getDevices() {
      if (cancel) return;
      const [passed, fetchedDevices] = await api.devicesList();
      if (passed) {
        setDevices(fetchedDevices);
      } else {
        timeoutId = setTimeout(getDevices, 2000);
      }
    }

    getDevices();
    return () => {
      cancel = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [api]);

  const toggleDevice = (deviceId) => {
    setSelectedDeviceIds(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  return (
    <>
      {/* Device selection grid */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map(device => {
          const online = device.connected;
          const selected = selectedDeviceIds.includes(device.device_id);

          return (
            <Card
              key={device.device_id}
              onClick={() => online && toggleDevice(device.device_id)}
              className={`w-full h-40 flex flex-col justify-between p-4 cursor-pointer 
                rounded-xl shadow-md transition-all 
                ${selected ? "ring-2 ring-blue-500" : ""} 
                ${online ? "hover:shadow-xl" : "opacity-75"}`}
            >
              {/* Name */}
              <p className="font-semibold text-lg max-w-[90%] truncate text-center">
                {device.name}
              </p>

              {/* Type */}
              <p className="text-sm text-gray-600">{device.type}</p>

              {/* Status */}
              <div className="flex items-center justify-center gap-1">
                <span className={`text-sm font-medium ${online ? "text-green-600" : "text-red-600"}`}>
                  {online ? "Online" : "Offline"}
                </span>
                {!online && (
                  <span className="text-red-500 text-xl" title="Device offline">
                    ⚠️
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Selected DeviceCards */}
      <div className="flex flex-col gap-6 p-4">
        {selectedDeviceIds.map(id => (
          <DeviceCard key={id} deviceId={id} />
        ))}
      </div>
    </>
  );
}