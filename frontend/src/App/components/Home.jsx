import React from 'react';
import { Link } from 'wouter';
import { Box, Card, CardActionArea, CardContent, Container, Typography } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import Title from './Title';
import { useAppContext } from '../../contexts/AppContext';
import { meetsMinRole } from '../../common/common';
import navigationItems from '../navigationItems';

export default function Home() {
    const {user} = useAppContext();
    const visibleItems = navigationItems.filter(item => item.href !== '/' && meetsMinRole(user.role, item.minRole));

    return (
        <Container maxWidth='md'>
            <Title>Home</Title>
            <Grid container spacing={2}>
                {visibleItems.map(item => (
                    <Grid item xs={12} sm={6} md={4} key={item.href}>
                        <Link href={item.href}>
                            <Card sx={{height: '100%'}}>
                                <CardActionArea sx={{height: '100%'}}>
                                    <CardContent sx={{minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
                                        <Box color='primary.main'>
                                            {React.cloneElement(item.icon, {sx: {fontSize: 38}})}
                                        </Box>
                                        <Typography variant='subtitle1' sx={{mt: 1, overflowWrap: 'anywhere'}}>
                                            {item.text}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Link>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}
