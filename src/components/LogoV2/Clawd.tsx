import * as React from 'react';
import { Box, Text } from '../../ink.js';

export type ClawdPose = 'default' | 'arms-up' | 'look-left' | 'look-right';

type Props = {
  pose?: ClawdPose;
  variant?: 'compact' | 'banner';
};

// Compact hawk face - fits in welcome screen box
const HAWK_FACE_COMPACT = [
  '   ╭▶ ◀╮   ',
  '   │HAWK│   ',
  '   ╰┴┴┴╯   ',
];

// Big banner hawk ASCII art
const HAWK_BANNER = `                                     .  .
                                  .  .  .  .
                                  .  |  |  .
                               .  |        |  .
                               .              .
 ___     ___    _________    . |  (\\.|\\/|./)  | .   ___   ____
|   |   |   |  /    _    \\   .   (\\ |||||| /)   .  |   | /   /
|   |___|   | |    /_\\    |  |  (\\  |/  \\|  /)  |  |   |/   /
|           | |           |    (\\            /)    |       /
|    ___    | |    ___    |   (\\              /)   |       \\
|   |   |   | |   |   |   |    \\      \\/      /    |   |\\   \\
|___|   |___| |___|   |___|     \\____/\\/\\____/     |___| \\___\\
                                    |0\\/0|
                                     \\/\\/
                                      \\/`;


export function Clawd({ pose = 'default', variant = 'compact' }: Props) {
  if (variant === 'banner') {
    return (
      <Box flexDirection="column" alignItems="flex-start">
        {HAWK_BANNER.split('\n').map((line, i) => (
          <Text key={i} color="hawk">{line}</Text>
        ))}
      </Box>
    );
  }

  // Compact version for inside welcome box
  return (
    <Box flexDirection="column" alignItems="center">
      {HAWK_FACE_COMPACT.map((line, i) => (
        <Text key={i} color="clawd_body">{line}</Text>
      ))}
    </Box>
  );
}

export default Clawd;
