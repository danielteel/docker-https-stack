import IconButton from "@mui/material/IconButton";
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import { useAppContext } from "../../contexts/AppContext";

export default function LogoutButton(){
    const {api} = useAppContext();
    async function logout(){
        await api.userLogout();
    }

    return <IconButton color="inherit" children={<LogoutIcon />} onClick={logout}/>
}