import React from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline } from '@mui/material';
import Index from './Index';


createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <CssBaseline />
      <Index/>
  </React.StrictMode>,
)
