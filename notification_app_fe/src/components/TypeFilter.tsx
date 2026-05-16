import React from 'react';
import { ToggleButton, ToggleButtonGroup, Box } from '@mui/material';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Placement', value: 'Placement' },
  { label: 'Result', value: 'Result' },
  { label: 'Event', value: 'Event' },
];

export function TypeFilter({ value, onChange }: Props): React.ReactElement {
  return (
    <Box mb={2}>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_e, v) => { if (v !== null) onChange(v); }}
        size="small"
        color="primary"
      >
        {OPTIONS.map((opt) => (
          <ToggleButton key={opt.value} value={opt.value}>
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
