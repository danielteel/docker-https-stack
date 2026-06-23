import HomeIcon from '@mui/icons-material/Home';
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import SettingsCellIcon from '@mui/icons-material/SettingsCell';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PeopleIcon from '@mui/icons-material/People';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import EggIcon from '@mui/icons-material/Egg';
import OutletIcon from '@mui/icons-material/Outlet';

const navigationItems = [
    {text: 'Home',           href: '/',         minRole:'unverified',    icon: <HomeIcon/>},
    {text: 'Devices',        href: '/devices',  minRole:'member',        icon: <SettingsRemoteIcon/>},
    {text: 'Coop',           href: '/coop',     minRole:'member',        icon: <EggIcon/>},
    {text: 'Kasa Plugs',     href: '/kasa',     minRole:'member',        icon: <OutletIcon/>},
    {text: 'Manage Devices', href: '/managedevs',minRole:'admin',        icon: <SettingsCellIcon/>},
    {text: 'API Keys',       href: '/keys',     minRole:'admin',         icon: <VpnKeyIcon/>},
    {text: 'Users',          href: '/users',    minRole:'manager',       icon: <PeopleIcon/>},
    {text: 'Profile',        href: '/profile',  minRole:'unverified',    icon: <AccountCircleIcon/>},
];

export default navigationItems;
