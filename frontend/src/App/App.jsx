import * as React from 'react';
import { styled } from '@mui/material/styles';
import MuiAppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import SettingsCellIcon from '@mui/icons-material/SettingsCell';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PeopleIcon from '@mui/icons-material/People';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import Slide from '@mui/material/Slide';
import { Link, useLocation } from 'wouter';
import LogoutButton from './components/LogoutButton';
import AppRouter from './AppRouter';
import Copyright from '../common/Copyright';
import { meetsMinRole } from '../common/common';
import { useAppContext } from '../contexts/AppContext';

function HideOnScroll({ children, element }) {
  const trigger = useScrollTrigger({ target: element, disableHysteresis: true, threshold: 50 });
  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

const MenuItemLink = ({ selected, text, icon, href }) => {
  return (
    <Link href={href}>
      <ListItemButton selected={selected} sx={{ px: 2 }}>
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText primary={text} />
      </ListItemButton>
    </Link>
  );
};

function hrefMatchesLocation(href, location) {
  if (href === '/' && location.length > 2) return false;
  if (location.substring(0, href.length) === href) return true;
  return false;
}

const navigationItems = [
  { text: 'home', href: '/', minRole: 'unverified', icon: <HomeIcon /> },
  { text: 'devices', href: '/devices', minRole: 'member', icon: <SettingsRemoteIcon /> },
  { text: 'managedevices', href: '/managedevs', minRole: 'admin', icon: <SettingsCellIcon /> },
  { text: 'users', href: '/users', minRole: 'manager', icon: <PeopleIcon /> },
  { text: 'profile', href: '/profile', minRole: 'unverified', icon: <AccountCircleIcon /> }
];

export default function App() {
  const contentRef = React.useRef();
  const [content, setContent] = React.useState(undefined);
  const [navOpen, setNavOpen] = React.useState(false);
  const [location] = useLocation();
  const { user } = useAppContext();

  React.useEffect(() => {
    setContent(contentRef.current);
  }, []);

  const toggleNav = () => setNavOpen(!navOpen);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <HideOnScroll element={content}>
        <MuiAppBar>
          <Toolbar sx={{ pr: 2 }}>
            <IconButton color="inherit" onClick={toggleNav} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              DAN
            </Typography>
            <LogoutButton />
          </Toolbar>
        </MuiAppBar>
      </HideOnScroll>

      {/** Top navigation menu */}
      {navOpen && (
        <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <List sx={{ display: 'flex', flexDirection: 'row', px: 1 }}>
            {navigationItems.map((item) => {
              if (meetsMinRole(user.role, item.minRole)) {
                const selected = hrefMatchesLocation(item.href, location);
                return (
                  <MenuItemLink
                    key={item.href}
                    selected={selected}
                    href={item.href}
                    icon={item.icon}
                    text={item.text}
                  />
                );
              }
              return null;
            })}
          </List>
          <Divider />
        </Box>
      )}

      <Box
        ref={contentRef}
        component="main"
        sx={{ flexGrow: 1, overflow: 'auto', bgcolor: (theme) => theme.palette.grey[100], display: 'flex', flexDirection: 'column' }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ my: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <AppRouter />
        </Container>
        <Copyright sx={{ py: 1 }} />
      </Box>
    </Box>
  );
}
