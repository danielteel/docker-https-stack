import { useState } from 'react';
import { MuiColorInput } from 'mui-color-input';


export default function DeviceActions({actions}){
    const [color, setColor] = useState('#ffffff');
    return <div>
        {actions.map(action => {
            switch (action?.type){
                case 'number':
                    return <div>{action.name} - number</div>;
                case 'time':
                    return <div>{action.name} - time</div>;
                case 'string':
                    return <div>{action.name} - string</div>;
                case 'bool':
                    return <div>{action.name} - bool</div>;
                case 'void':
                    return <div>{action.name} - void</div>;
                case 'color':
                    return <div>{action.name} <MuiColorInput format="hex" value={color} onChange={(v) => setColor(v)} /></div>;
            }
            return null;
        })}
    </div>
}