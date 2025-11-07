import { act, useEffect, useState } from 'react';
import { MuiColorInput } from 'mui-color-input';
import {
    Typography,
    TextField
} from "@mui/material";


function rgbToHex(r, g, b) {
  return "#"+[r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}

function ActionValue({action, values}){
    if (!action || !values) return null;

    switch (action.type){
        case 'number':
            return values[action.name];
        case 'time':
            return values[action.name];
        case 'string':
            return values[action.name];
        case 'bool':
            return values[action.name] ? 'True' : 'False';
        case 'color':{
            const [r, g, b] = values[action.name].split(',').map(Number);
            return <div style={{backgroundColor: `rgb(${r}, ${g}, ${b})`, width: '24px', height: '24px', borderRadius: '4px'}}>{rgbToHex(r, g, b)}</div>;
        }
    }
}

function NumberInput({label, value, onChange}){
    return <TextField
      label={label}
      type="number"
      value={value}
      onChange={(e)=> onChange(e.target.value)}
      variant="outlined"
      size="small"
      slotProps={{htmlInput: { min: -2147483648, max: 2147483647 }}}
    />
}

export default function DeviceActions({actions, values, webSocket}){
    const [userValues, setUserValues] = useState({});
    
    useEffect(() => {
        if (!actions || !Array.isArray(actions)) return;

        const vals={};

        for (const action of actions){
            switch(action.type){
                case 'number':
                    vals[action.name]=0;
                    break;
                case 'time':
                    vals[action.name]='00:00:00';
                    break;
                case 'string':
                    vals[action.name]='';
                    break;
                case 'bool':
                    vals[action.name]=false;
                    break;
                case 'color':
                    vals[action.name]='#ffffff';
                    break;
                default:
            }
        }

        setUserValues(vals);
    }, [actions]);


    const actionsElements = actions?.map(action => {
        switch (action?.type){
            case 'number':
                return <div>{action.name} - number - current <ActionValue action={action} values={values}/><NumberInput label={action.name} value={userValues[action.name]} onChange={(newVal)=>setUserValues({...userValues, [action.name]: newVal})}/></div>;
            case 'time':
                return <div>{action.name} - time - current <ActionValue action={action} values={values}/></div>;
            case 'string':
                return <div>{action.name} - string - current <ActionValue action={action} values={values}/></div>;
            case 'bool':
                return <div>{action.name} - bool - current <ActionValue action={action} values={values}/></div>;
            case 'void':
                return <div>{action.name} - void</div>;
            case 'color':
                return <div>{action.name} - color - current <ActionValue action={action} values={values}/><MuiColorInput format="hex" value={userValues[action.name]} onChange={(newVal)=>setUserValues({...userValues, [action.name]: newVal})}/></div>;
        }
        return null;
    })

    return <div>
        <Typography variant="subtitle1" gutterBottom>
            Actions
        </Typography>
        {actionsElements}
    </div>
}