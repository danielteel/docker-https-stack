import { useState, useEffect } from 'react';
import {
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  MenuItem,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import LoadingButton from '@mui/lab/LoadingButton';

function isHexadecimal(str) {
  return /^[a-fA-F0-9]+$/i.test(str);
}

function isValidEncroKey(key) {
  const trimmedKey = key.trim();
  return isHexadecimal(key) && trimmedKey.length === 64;
}

function generateRandomEncroKey() {
  const randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map((i) => i.toString(16).padStart(2, '0'))
    .join('');
}

export default function DeviceAddDialog({ api, devices, setDevices, open, setOpen }) {
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [encroKey, setEncroKey] = useState('');
  const [actions, setActions] = useState([]);
  const [logItems, setLogItems] = useState([]);
  const [inProgress, setInProgress] = useState(null);

  // For editing logItems and actions
  const [editDialog, setEditDialog] = useState({ open: false, type: '', index: null });
  const [editData, setEditData] = useState({ name: '', type: '', byte: '' });

  const logItemTypes = ['degree', 'percent', 'number', 'bool', 'string', 'time'];
  const actionTypes = ['number', 'time', 'string', 'bool', 'void', 'color'];

  useEffect(() => {
    if (open) {
      setName('');
      setEncroKey(generateRandomEncroKey());
      setError(null);
      setActions([]);
      setLogItems([]);
    }
  }, [open]);

  const handleClose = () => {
    if (!inProgress) setOpen(false);
  };

  const handleAdd = async () => {
    try {
      setInProgress('adding');

      const [passed, newDevices] = await api.devicesAdd(name, encroKey);
      if (passed) {
        setDevices(newDevices);
        setOpen(false);
      } else {
        const error = newDevices?.error;
        const existingName = devices?.find(
          (r) => name.trim().toLowerCase() === r.name.trim().toLowerCase()
        );
        const badKey = !isValidEncroKey(encroKey);
        if (error) {
          setError(error);
        } else if (badKey) {
          setError('Bad encro key, needs to be hexadecimal and 64 chars long');
        } else if (existingName) {
          setError('Device name already exists, try a different name');
        } else {
          setError('Failed to add for some reason.');
        }
      }
    } catch (e) {
      setError('Error occurred');
    }
    setInProgress(null);
  };

  const handleOpenEditDialog = (type, item = {}, index = null) => {
    setEditData({
      name: item.name || '',
      type: item.type || '',
      byte: item.byte || '',
    });
    setEditDialog({ open: true, type, index });
  };

  const handleSaveEdit = () => {
    const { type, index } = editDialog;
    const updated = type === 'log' ? [...logItems] : [...actions];

    if (index !== null) {
      updated[index] = editData;
    } else {
      updated.push(editData);
    }

    if (type === 'log') setLogItems(updated);
    else setActions(updated);

    setEditDialog({ open: false, type: '', index: null });
    setEditData({ name: '', type: '', byte: '' });
  };

  const handleDelete = (type, index) => {
    if (type === 'log') {
      setLogItems(logItems.filter((_, i) => i !== index));
    } else {
      setActions(actions.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ py: '12px' }}>Add Device</DialogTitle>
      <DialogContent>
        <TextField
          disabled={!!inProgress}
          fullWidth
          margin="dense"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          disabled={!!inProgress}
          fullWidth
          margin="dense"
          label="Encro Key"
          value={encroKey}
          onChange={(e) => setEncroKey(e.target.value)}
        />

        {/* Log Items Table */}
        <h3 style={{ marginTop: '20px' }}>Log Items</h3>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell width={100}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logItems.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenEditDialog('log', item, i)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete('log', i)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Button size="small" onClick={() => handleOpenEditDialog('log')}>
                    + Add Log Item
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Actions Table */}
        <h3 style={{ marginTop: '20px' }}>Actions</h3>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Byte</TableCell>
                <TableCell>Type</TableCell>
                <TableCell width={100}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {actions.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.byte}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenEditDialog('action', item, i)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete('action', i)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Button size="small" onClick={() => handleOpenEditDialog('action')}>
                    + Add Action
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      {/* Error Message */}
      <DialogActions disableSpacing>
        <Alert
          style={error ? { width: '100%' } : { display: 'none' }}
          variant="filled"
          severity={'error'}
        >
          {error}
        </Alert>
      </DialogActions>

      {/* Action Buttons */}
      <DialogActions>
        <Button disabled={!!inProgress} variant="contained" color="primary" onClick={handleClose}>
          Cancel
        </Button>
        <LoadingButton
          disabled={!!inProgress && inProgress !== 'adding'}
          loading={inProgress === 'adding'}
          variant="contained"
          color="success"
          onClick={handleAdd}
        >
          Add
        </LoadingButton>
      </DialogActions>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false })}>
        <DialogTitle>
          {editDialog.index !== null ? 'Edit ' : 'Add '}
          {editDialog.type === 'log' ? 'Log Item' : 'Action'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Name"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
          />
          {editDialog.type === 'action' && (
            <TextField
              fullWidth
              margin="dense"
              label="Byte"
              type="number"
              value={editData.byte}
              onChange={(e) => setEditData({ ...editData, byte: e.target.value })}
            />
          )}
          <TextField
            fullWidth
            margin="dense"
            select
            label="Type"
            value={editData.type}
            onChange={(e) => setEditData({ ...editData, type: e.target.value })}
          >
            {(editDialog.type === 'log' ? logItemTypes : actionTypes).map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}