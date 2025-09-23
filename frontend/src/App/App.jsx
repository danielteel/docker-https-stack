import * as React from 'react';
import { styled } from '@mui/material/styles';
import MuiDrawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import HomeIcon from '@mui/icons-material/Home';
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import SettingsCellIcon from '@mui/icons-material/SettingsCell';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PeopleIcon from '@mui/icons-material/People';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import Slide from '@mui/material/Slide';

import AppRouter from './AppRouter';
import { Link, useLocation } from 'wouter';
import LogoutButton from './components/LogoutButton';

import Copyright from '../common/Copyright';
import { meetsMinRole } from '../common/common';
import { useAppContext } from '../contexts/AppContext';

const drawerWidth = 240;

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        '& .MuiDrawer-paper': {
            position: 'relative',
            whiteSpace: 'nowrap',
            width: drawerWidth,
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
            boxSizing: 'border-box',
            ...(!open && {
                overflowX: 'hidden',
                transition: theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                }),
                width: theme.spacing(7),
                [theme.breakpoints.up('sm')]: {
                    width: theme.spacing(9),
                },
            }),
        },
    }),
);

function HideOnScroll({children, element}) {
    // Note that you normally won't need to set the window ref as useScrollTrigger
    // will default to window.
    // This is only being set here because the demo is in an iframe.
    const trigger = useScrollTrigger({target: element, disableHysteresis: true, threshold: 50});
  
    return (
      <Slide appear={false} direction="down" in={!trigger}>
        {children}
      </Slide>
    );
  }

const MenuItemLink = ({ selected, text, icon, href }) => {
    return (
        <Link href={href}>
            <ListItemButton selected={selected}>
                <ListItemIcon>{icon}</ListItemIcon>
                <ListItemText primary={text} />
            </ListItemButton>
        </Link>
    );
}


function hrefMatchesLocation(href, location){
    if (href==='/' && location.length>2) return false;
    if (location.substring(0, href.length)===href) return true;
    return false;
}

const navigationItems = [
    {text: 'home',          href: '/',         minRole:'unverified',    icon: <HomeIcon/>},
    {text: 'devices',       href: '/devices',  minRole:'member',        icon: <SettingsRemoteIcon/>},
    {text: 'managedevices', href: '/managedevs',minRole:'admin',        icon: <SettingsCellIcon/>},
    {text: 'users',         href: '/users',    minRole:'manager',       icon: <PeopleIcon/>},
    {text: 'profile',       href: '/profile',  minRole:'unverified',    icon: <AccountCircleIcon/>},
];

export default function App() {
    const contentRef = React.useRef();
    const [content, setContent] = React.useState(undefined);
    const [open, setOpen] = React.useState(false);
    const [location, setLocation] = useLocation();

    const {user} = useAppContext();

    React.useEffect(()=>{
        setContent(contentRef.current);
    }, []);

    const toggleDrawer = () => {
        setOpen(!open);
    };

    return (
        <Box sx={{ display: 'flex'}}>
            <HideOnScroll element={content}>
            <AppBar style={{display:'absolute'}}>
                <Toolbar sx={{ pr: '24px' }}>
                    <IconButton children={!open?<ChevronLeftIcon />:<MenuIcon />} edge="start" color="inherit" aria-label="open drawer" onClick={toggleDrawer} sx={{mr: '0px'}}/>
                    <Typography component="h1" variant="h6" color="inherit" noWrap sx={{flexGrow: 1}}>
                        DAN
                    </Typography>
                    <LogoutButton/>
                </Toolbar>
            </AppBar>
            </HideOnScroll>
            <Drawer variant="permanent" open={open} sx={open?{'& .MuiDrawer-paper': { boxSizing: 'border-box', width: 0 }}:null}>
                <Toolbar/>
                <Divider />
                <List component="nav">
                    {
                        navigationItems.map((item) => {
                            if (meetsMinRole(user.role, item.minRole)){
                                const selected=hrefMatchesLocation(item.href, location);
                                return <MenuItemLink selected={selected} key={item.href} href={item.href} icon={item.icon}/>;
                            }
                            return null;
                        })
                    }
                </List>
            </Drawer>
            <Box ref={contentRef} component="main" sx={{backgroundColor: (theme) => theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[900], flexGrow: 1, height:'100dvh', display: 'flex', flexDirection:'column', overflow: 'auto'}}>
                <Toolbar />{/*use this to align content correctly*/}
                <Container maxWidth='lg' sx={{my: 3, flexGrow: 1, display: 'flex', flexDirection:'column'}}>
                    <AppRouter/>
                </Container>
                <Copyright sx={{ py: 1 }} />
            </Box>
        </Box>
    );
}