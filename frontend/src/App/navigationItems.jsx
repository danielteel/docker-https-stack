import HomeIcon from '@mui/icons-material/Home';
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import SettingsCellIcon from '@mui/icons-material/SettingsCell';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PeopleIcon from '@mui/icons-material/People';
import SensorsIcon from '@mui/icons-material/Sensors';

const navigationItems = [
    {text: 'Home',           href: '/',         minRole:'unverified',    icon: <HomeIcon/>},
    {text: 'Devices',        href: '/devices',  minRole:'member',        icon: <SettingsRemoteIcon/>},
    {text: 'WSS Devices',    href: '/wss-devices',minRole:'member',      icon: <SensorsIcon/>},
    {text: 'Manage Devices', href: '/managedevs',minRole:'admin',        icon: <SettingsCellIcon/>},
    {text: 'Users',          href: '/users',    minRole:'manager',       icon: <PeopleIcon/>},
    {text: 'Profile',        href: '/profile',  minRole:'unverified',    icon: <AccountCircleIcon/>},
];

export default navigationItems;
