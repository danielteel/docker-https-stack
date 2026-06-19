import SvgIcon from "@mui/material/SvgIcon";

export function OmletAutoFeederIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M8 3h8c.55 0 1 .45 1 1v8.2c0 .28-.12.55-.33.74L15 14.5V20c0 .55-.45 1-1 1h-4c-.55 0-1-.45-1-1v-5.5l-1.67-1.56A1 1 0 0 1 7 12.2V4c0-.55.45-1 1-1Zm1 2v6.76l1.67 1.56c.21.19.33.46.33.74V19h2v-4.94c0-.28.12-.55.33-.74L15 11.76V5H9Zm1.25 2.5h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5ZM5 19h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2Z" />
    </SvgIcon>
  );
}

export function OmletFanIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 10.25A1.75 1.75 0 1 0 12 13.75 1.75 1.75 0 0 0 12 10.25Zm0-7.25c1.36 0 2.53.92 2.86 2.24.34 1.34-.1 2.75-1.14 3.65l-.72.62c-.33.28-.22.82.2.96l.91.3c1.34.44 2.3 1.6 2.52 2.99.25 1.56-.57 3.1-2 3.78-1.22.58-2.68.32-3.63-.63l-.67-.67c-.3-.3-.82-.11-.86.31l-.09.95a3.55 3.55 0 0 1-2.05 2.95 3.45 3.45 0 0 1-4.2-1.02 3.4 3.4 0 0 1-.34-3.95 3.56 3.56 0 0 1 3.17-1.82h.94c.43 0 .68-.49.43-.84l-.55-.78a3.46 3.46 0 0 1-.33-3.55A3.55 3.55 0 0 1 9.63 7.5h.95c.43 0 .68-.5.42-.84l-.56-.75A2.95 2.95 0 0 1 12 3Zm0 2c-.37 0-.68.3-.68.68 0 .15.05.3.14.42l.56.75A2.52 2.52 0 0 1 10 9.5h-.37c-.62 0-1.18.36-1.44.92-.23.5-.18 1.08.14 1.53l.55.78a2.53 2.53 0 0 1-2.06 3.99h-.86c-.56 0-1.08.3-1.36.79-.27.47-.23 1.05.1 1.48.42.55 1.17.72 1.79.42.5-.24.84-.72.89-1.27l.09-.95a2.53 2.53 0 0 1 4.33-1.59l.67.67c.35.35.88.45 1.33.24.54-.26.86-.85.76-1.44a1.58 1.58 0 0 0-1.11-1.25l-.91-.3a2.53 2.53 0 0 1-.89-4.4l.72-.62c.38-.33.54-.84.41-1.33A.8.8 0 0 0 12 5Z" />
    </SvgIcon>
  );
}

export function OmletAutoDoorIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M6 3h12c.55 0 1 .45 1 1v17a1 1 0 1 1-2 0V5H7v16a1 1 0 1 1-2 0V4c0-.55.45-1 1-1Zm3 4h6c.55 0 1 .45 1 1v11c0 .55-.45 1-1 1H9c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1Zm1 2v9h4V9h-4Zm2.75 4.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM8 6h8v1.5H8V6Z" />
    </SvgIcon>
  );
}

export function getCoopDeviceIcon(deviceType) {
  switch (String(deviceType || "").trim().toLowerCase()) {
    case "autodoor":
    case "auto door":
      return OmletAutoDoorIcon;
    case "autofeeder":
    case "feeder":
      return OmletAutoFeederIcon;
    case "fan":
      return OmletFanIcon;
    default:
      return OmletAutoDoorIcon;
  }
}
