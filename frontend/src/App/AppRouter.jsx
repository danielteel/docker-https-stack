import { Router, Route, Switch, useParams } from "wouter";

import Users from './components/Users';

import { Redirect } from 'wouter';
import Profile from "./components/Profile";

import Devices from './components/Devices';
import ManageDevices from './components/ManageDevices';
import DeviceLog from "./components/DeviceLog";
import ApiKeys from "./components/ApiKeys";
import Home from "./components/Home";
import Coop from "./components/Coop";


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
                <Route path='/coop'><Coop/></Route>
                <Route path='/devicelog/:id'>{params => <DeviceLog deviceId={params.id}/>}</Route>
                <Route path='/managedevs'><ManageDevices/></Route>
                <Route path='/keys'><ApiKeys/></Route>
                <Route path='/'><Home/></Route>
                <Route><Redirect to={'/'}/></Route>
            </Switch>
        </Router>
    );
}
