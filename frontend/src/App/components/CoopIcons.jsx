import SvgIcon from "@mui/material/SvgIcon";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

export function OmletAutoFeederIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M4 11.5C4 8.46 7.58 6 12 6s8 2.46 8 5.5S16.42 17 12 17s-8-2.46-8-5.5Zm2 0C6 13.26 8.75 15 12 15s6-1.74 6-3.5S15.25 8 12 8s-6 1.74-6 3.5Z" />
      <path d="M7.2 11.4c.68-.9 2.45-1.9 4.8-1.9s4.12 1 4.8 1.9c-.68.9-2.45 1.9-4.8 1.9s-4.12-1-4.8-1.9ZM5 17.5h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2Z" />
    </SvgIcon>
  );
}

export function OmletFanIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z" />
      <path d="M12 10.25A1.75 1.75 0 1 0 12 13.75 1.75 1.75 0 0 0 12 10.25Z" />
      <path d="M13 5.2c2 .3 3.5 1.8 3.8 3.7.1.5-.3.9-.8.8l-2.4-.4a1.9 1.9 0 0 1-1.5-2.1l.4-1.7c.1-.2.3-.3.5-.3ZM5.4 15.2c-.8-1.9-.4-4 .9-5.4.4-.4 1-.2 1.2.3l.8 2.3c.3.9-.2 2-1.1 2.3l-1.5.6c-.1.1-.3 0-.3-.1ZM17.5 16.5c-1.2 1.6-3.3 2.3-5.1 1.8-.5-.1-.7-.8-.3-1.2l1.6-1.9c.7-.8 1.8-.9 2.6-.3l1.3 1c.1.1.1.4-.1.6Z" />
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
      return HelpOutlineIcon;
  }
}
