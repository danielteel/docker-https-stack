import {
    Typography,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Tooltip,
} from "@mui/material";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

function formatValue(logItems, name, value){
    if (!logItems || !Array.isArray(logItems)) return String(value);
    const item = logItems.find( item => item.name === name);
    if (!item) return String(value);

    switch(item.type){
        case 'degree':
            return `${value}°`;
        case 'percent':
            return `${value}%`;
        case 'time':{
            const [hours, minutes, seconds] = value.split(':').map(Number);
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        case 'number':
            return Number(value).toString();
        case 'bool':
            return value ? 'True' : 'False';
        case 'string':
            return String(value);
        default:
            return String(value);
    }
}

function ValueCell({ logItems, name, value }) {
    return <TableCell>{formatValue(logItems, name, value)}</TableCell>
}

function getDescription(logItems, name){
    if (!logItems || !Array.isArray(logItems)) return null;
    const item = logItems.find( item => item.name === name);
    if (!item) return null;
    return item.description || null;
    
}

function KeyCell({ logItems, name }) {
    const description = getDescription(logItems, name);

    return (
        <TableCell sx={{ fontWeight: 600 }}>
            {name}
            {description && (
                <Tooltip title={description} placement="right" enterTouchDelay={0} leaveTouchDelay={3000}>
                    <InfoOutlinedIcon
                        fontSize="small"
                        sx={{ ml: 0.5, opacity: 0.7, cursor: "pointer" }}
                    />
                </Tooltip>
            )}
        </TableCell>
    );
}

export default function DeviceValues({values, logItems}){
    if (Object.keys(values).length <=0 ){
        return <>
            <Typography variant="subtitle1" gutterBottom>
                Current Values
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Waiting for values...
            </Typography>
        </>
    }

    return <>
        <Typography variant="subtitle1" gutterBottom>
            Current Values
        </Typography>
        <Table size="small">
            <TableBody>
                {Object.entries(values).map(([key, val]) => (
                    <TableRow key={key}>
                        <KeyCell logItems={logItems} name={key} />
                        <ValueCell logItems={logItems} name={key} value={val} />
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </>
}