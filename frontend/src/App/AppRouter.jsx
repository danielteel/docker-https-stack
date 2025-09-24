import { Router, Route, Switch, useParams } from "wouter";

import Users from './components/Users';

import { Redirect } from 'wouter';
import Profile from "./components/Profile";

import Devices from './components/Devices';
import ManageDevices from './components/ManageDevices';


function RedirectWithParams({to, params}){
    const inParams = useParams();
    for (const p of params){
        to+='/'+inParams[p];
    }
    return <Redirect to={to}/>
}


export default function AppRouter(){
    return (
        <Router>
            <Switch>
                <Route path='/users'><Users/></Route>
                <Route path='/profile/:email?/:confirmCode?'><Profile/></Route>
                <Route path='/devices'><Devices/></Route>
                <Route path='/devicelog/:id'>{params => <DeviceLog deviceId={params.id}/>}</Route>
                <Route path='/managedevs'><ManageDevices/></Route>
                <Route path='/'>Home</Route>
                <Route><Redirect to={'/'}/></Route>
            </Switch>
        </Router>
    );
}