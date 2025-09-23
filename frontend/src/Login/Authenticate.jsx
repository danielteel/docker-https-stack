import { Router, Route, Switch } from "wouter";
import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import VerifyForgot from "./VerifyForgot";

import { Redirect } from 'wouter';
import Signup from "./Signup";
import VerifySignup from "./VerifySignup";

export default function Authenticate(){
    return (
        <Router>
            <Switch>
                <Route path='/signup/:email?'><Signup/></Route>
                <Route path='/verifysignup/:email?/:confirmCode?'><VerifySignup/></Route>
                <Route path='/forgotpassword/:email?'><ForgotPassword/></Route>
                <Route path='/verifyforgot/:email?/:confirmCode?'><VerifyForgot/></Route>
                <Route path='/login'><Login/></Route>
                <Route><Redirect to='/login'/></Route>
            </Switch>
        </Router>
    );
}