import React from 'react'
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

import App from './App/App.jsx'
import { useAppContext, AppProvider } from "./contexts/AppContext.jsx"
import Authenticate from './Login/Authenticate.jsx';

function Render(){
  const {user, startingUp} = useAppContext();

  if (startingUp){
    return (
      <Box sx={{ display: 'flex', width:'100dvw', height:'100dvh', alignItems:'center', justifyContent:'center' }}>
        <CircularProgress size={80}/>
      </Box>
    );
  }

  if (user){
    return <App/>
  }

  return <Authenticate/>
}

export default function Index(){
  return <AppProvider><Render/></AppProvider>
}