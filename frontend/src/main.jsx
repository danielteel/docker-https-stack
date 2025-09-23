import React from 'react'
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './main.css';
import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline';
import Index from './Index';


createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <CssBaseline />
      <Index/>
  </React.StrictMode>,
)
